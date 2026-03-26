import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------- AWS Sig V4 helpers ----------

const encoder = new TextEncoder();

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return hexEncode(new Uint8Array(hash));
}

function hexEncode(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  let key = await hmacSha256(encoder.encode("AWS4" + secretKey), dateStamp);
  key = await hmacSha256(key, region);
  key = await hmacSha256(key, service);
  key = await hmacSha256(key, "aws4_request");
  return key;
}

interface SignedRequestOpts {
  method: string;
  endpoint: string;
  bucket: string;
  objectKey: string;
  region: string;
  accessKey: string;
  secretKey: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Uint8Array | string;
  payloadHash?: string;
}

async function signS3Request(opts: SignedRequestOpts): Promise<{ url: string; headers: Record<string, string> }> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const scope = `${dateStamp}/${opts.region}/${service}/aws4_request`;

  const host = opts.endpoint.replace(/^https?:\/\//, "");
  const path = `/${opts.bucket}/${opts.objectKey}`.replace(/\/+/g, "/");

  // Build query string
  const qp = opts.queryParams || {};
  const sortedQP = Object.keys(qp).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join("&");

  const payloadHash = opts.payloadHash || (opts.body
    ? await sha256Hex(typeof opts.body === "string" ? opts.body : opts.body)
    : await sha256Hex(""));

  const allHeaders: Record<string, string> = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...(opts.headers || {}),
  };

  const signedHeaderKeys = Object.keys(allHeaders).sort();
  const signedHeadersStr = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${allHeaders[k]}\n`).join("");

  const canonicalRequest = [
    opts.method,
    path,
    sortedQP,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = hexEncode(new Uint8Array(await hmacSha256(signingKey, stringToSign)));

  const authorization = `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  const url = `https://${host}${path}${sortedQP ? "?" + sortedQP : ""}`;
  return {
    url,
    headers: {
      ...allHeaders,
      Authorization: authorization,
    },
  };
}

async function generatePresignedUrl(opts: {
  endpoint: string; bucket: string; objectKey: string;
  region: string; accessKey: string; secretKey: string;
  expiresIn?: number;
}): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const scope = `${dateStamp}/${opts.region}/${service}/aws4_request`;
  const host = opts.endpoint.replace(/^https?:\/\//, "");
  const path = `/${opts.bucket}/${opts.objectKey}`.replace(/\/+/g, "/");
  const expires = opts.expiresIn || 3600;

  const qp: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${opts.accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };

  const sortedQP = Object.keys(qp).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = ["GET", path, sortedQP, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await getSignatureKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = hexEncode(new Uint8Array(await hmacSha256(signingKey, stringToSign)));

  return `https://${host}${path}?${sortedQP}&X-Amz-Signature=${signature}`;
}

// ---------- Handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const endpoint = Deno.env.get("IDRIVE_E2_ENDPOINT")!;
    const accessKey = Deno.env.get("IDRIVE_E2_ACCESS_KEY")!;
    const secretKey = Deno.env.get("IDRIVE_E2_SECRET_KEY")!;
    const bucket = Deno.env.get("IDRIVE_E2_BUCKET")!;
    const region = Deno.env.get("IDRIVE_E2_REGION")!;

    if (!endpoint || !accessKey || !secretKey || !bucket || !region) {
      return new Response(JSON.stringify({ error: "iDrive E2 credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ACTION: list
    if (action === "list") {
      const prefix = url.searchParams.get("prefix") || "";
      const signed = await signS3Request({
        method: "GET", endpoint, bucket, objectKey: "",
        region, accessKey, secretKey,
        queryParams: { "list-type": "2", prefix, delimiter: "/" },
      });

      const s3Resp = await fetch(signed.url, { headers: signed.headers });
      const xml = await s3Resp.text();

      // Parse XML simply
      const folders: string[] = [];
      const files: { key: string; size: number; lastModified: string }[] = [];

      // CommonPrefixes -> folders
      const prefixMatches = xml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g);
      for (const m of prefixMatches) {
        const p = m[1];
        if (p && p !== prefix) folders.push(p);
      }

      // Contents -> files
      const contentBlocks = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
      for (const block of contentBlocks) {
        const keyMatch = block[1].match(/<Key>([^<]+)<\/Key>/);
        const sizeMatch = block[1].match(/<Size>([^<]+)<\/Size>/);
        const modMatch = block[1].match(/<LastModified>([^<]+)<\/LastModified>/);
        if (keyMatch) {
          const key = keyMatch[1];
          // Skip folder markers
          if (key.endsWith("/")) continue;
          files.push({
            key,
            size: parseInt(sizeMatch?.[1] || "0"),
            lastModified: modMatch?.[1] || "",
          });
        }
      }

      return new Response(JSON.stringify({ folders, files }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: createFolder
    if (action === "createFolder") {
      const body = await req.json();
      const path = body.path as string;
      if (!path) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const folderKey = path.endsWith("/") ? path : path + "/";
      const signed = await signS3Request({
        method: "PUT", endpoint, bucket, objectKey: folderKey,
        region, accessKey, secretKey,
        body: "",
        headers: { "content-length": "0", "content-type": "application/x-directory" },
      });
      const s3Resp = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body: "",
      });
      const respText = await s3Resp.text();
      if (!s3Resp.ok) {
        return new Response(JSON.stringify({ error: "Failed to create folder", details: respText }), {
          status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, key: folderKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: upload (receives base64-encoded file)
    if (action === "upload") {
      const body = await req.json();
      const { path, fileName, contentType, fileBase64 } = body;
      if (!path || !fileName || !fileBase64) {
        return new Response(JSON.stringify({ error: "path, fileName, fileBase64 required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const objectKey = `${path}${path.endsWith("/") ? "" : "/"}${fileName}`;
      const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

      const signed = await signS3Request({
        method: "PUT", endpoint, bucket, objectKey,
        region, accessKey, secretKey,
        body: fileBytes,
        headers: {
          "content-length": String(fileBytes.length),
          "content-type": contentType || "application/octet-stream",
        },
      });
      const s3Resp = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body: fileBytes,
      });
      const respText = await s3Resp.text();
      if (!s3Resp.ok) {
        return new Response(JSON.stringify({ error: "Upload failed", details: respText }), {
          status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, key: objectKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: delete
    if (action === "delete") {
      const body = await req.json();
      const key = body.key as string;
      if (!key) {
        return new Response(JSON.stringify({ error: "key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const signed = await signS3Request({
        method: "DELETE", endpoint, bucket, objectKey: key,
        region, accessKey, secretKey,
      });
      const s3Resp = await fetch(signed.url, { method: "DELETE", headers: signed.headers });
      await s3Resp.text();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: getSignedUrl
    if (action === "getSignedUrl") {
      const body = await req.json();
      const key = body.key as string;
      if (!key) {
        return new Response(JSON.stringify({ error: "key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const presignedUrl = await generatePresignedUrl({
        endpoint, bucket, objectKey: key, region, accessKey, secretKey, expiresIn: 3600,
      });
      return new Response(JSON.stringify({ url: presignedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: list, createFolder, upload, delete, getSignedUrl" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("idrive-e2-api error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
