import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------- AWS Sig V4 helpers ----------

const encoder = new TextEncoder();

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof Uint8Array ? key.slice().buffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? encoder.encode(data) : data;
  const digestInput = buf instanceof Uint8Array ? buf.slice().buffer : buf;
  const hash = await crypto.subtle.digest("SHA-256", digestInput);
  return hexEncode(new Uint8Array(hash));
}

function hexEncode(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

// S3-compatible URI encoding: encode everything except unreserved chars (A-Z a-z 0-9 - . _ ~)
function s3UriEncode(str: string, encodeSlash = true): string {
  let result = "";
  for (const ch of str) {
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "-" || ch === "~" || ch === ".") {
      result += ch;
    } else if (ch === "/" && !encodeSlash) {
      result += ch;
    } else {
      const encoded = encodeURIComponent(ch);
      // encodeURIComponent may not encode some chars like ' ! ( ) *
      if (encoded === ch) {
        result += "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
      } else {
        result += encoded.toUpperCase().replace(/%([0-9A-F]{2})/g, (_, hex) => "%" + hex);
      }
    }
  }
  return result;
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
  const rawPath = `/${opts.bucket}/${opts.objectKey}`.replace(/\/+/g, "/");
  const path = s3UriEncode(rawPath, false);

  // Build query string — must use S3-compatible encoding (encodeURIComponent misses ' ! ( ) *)
  const qp = opts.queryParams || {};
  const sortedQP = Object.keys(qp).sort().map(k => `${s3UriEncode(k)}=${s3UriEncode(qp[k])}`).join("&");

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
  method?: string;
  contentType?: string;
}): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const scope = `${dateStamp}/${opts.region}/${service}/aws4_request`;
  const host = opts.endpoint.replace(/^https?:\/\//, "");
  const rawPath = `/${opts.bucket}/${opts.objectKey}`.replace(/\/+/g, "/");
  const path = s3UriEncode(rawPath, false);
  const expires = opts.expiresIn || 3600;
  const httpMethod = opts.method || "GET";

  const qp: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${opts.accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };

  const sortedQP = Object.keys(qp).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [httpMethod, path, sortedQP, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join("\n");
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
    const endpoint = Deno.env.get("CF_R2_ENDPOINT")!;
    const accessKey = Deno.env.get("CF_R2_ACCESS_KEY")!;
    const secretKey = Deno.env.get("CF_R2_SECRET_KEY")!;
    const bucket = Deno.env.get("CF_R2_BUCKET")!;
    const region = Deno.env.get("CF_R2_REGION") || "auto";

    if (!endpoint || !accessKey || !secretKey || !bucket) {
      return new Response(JSON.stringify({ error: "Cloudflare R2 credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ACTION: list (with pagination to support >1000 files)
    if (action === "list") {
      const prefix = url.searchParams.get("prefix") || "";
      
      // Decode XML entities helper
      const decodeXmlEntities = (s: string) =>
        s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
         .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
         .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

      const folders: string[] = [];
      const files: { key: string; size: number; lastModified: string }[] = [];
      let continuationToken: string | null = null;

      // Loop through all pages
      do {
        const qp: Record<string, string> = { "list-type": "2", prefix, delimiter: "/", "max-keys": "1000" };
        if (continuationToken) {
          qp["continuation-token"] = continuationToken;
        }

        const signed = await signS3Request({
          method: "GET", endpoint, bucket, objectKey: "",
          region, accessKey, secretKey,
          queryParams: qp,
        });

        const s3Resp = await fetch(signed.url, { headers: signed.headers });
        const xml = await s3Resp.text();

        if (!s3Resp.ok) {
          console.error("S3 list error:", xml);
          return new Response(JSON.stringify({ error: "S3 list failed", details: xml }), {
            status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // CommonPrefixes -> folders
        const prefixMatches = xml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g);
        for (const m of prefixMatches) {
          const p = decodeXmlEntities(m[1]);
          if (p && p !== prefix && !folders.includes(p)) folders.push(p);
        }

        // Contents -> files
        const contentBlocks = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
        for (const block of contentBlocks) {
          const keyMatch = block[1].match(/<Key>([^<]+)<\/Key>/);
          const sizeMatch = block[1].match(/<Size>([^<]+)<\/Size>/);
          const modMatch = block[1].match(/<LastModified>([^<]+)<\/LastModified>/);
          if (keyMatch) {
            const key = decodeXmlEntities(keyMatch[1]);
            if (key.endsWith("/")) continue;
            files.push({
              key,
              size: parseInt(sizeMatch?.[1] || "0"),
              lastModified: modMatch?.[1] || "",
            });
          }
        }

        // Check for next page
        const isTruncated = /<IsTruncated>true<\/IsTruncated>/i.test(xml);
        const nextTokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
        continuationToken = isTruncated && nextTokenMatch ? decodeXmlEntities(nextTokenMatch[1]) : null;
      } while (continuationToken);

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

    // ACTION: getSignedUrl (single key)
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

    // ACTION: getUploadUrl - returns a presigned PUT URL so client uploads directly to S3
    if (action === "getUploadUrl") {
      const body = await req.json();
      const { path: filePath, fileName, contentType } = body;
      if (!filePath || !fileName) {
        return new Response(JSON.stringify({ error: "path and fileName required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const objectKey = `${filePath}${filePath.endsWith("/") ? "" : "/"}${fileName}`;
      const presignedUrl = await generatePresignedUrl({
        endpoint, bucket, objectKey, region, accessKey, secretKey,
        expiresIn: 3600, method: "PUT", contentType: contentType || "application/octet-stream",
      });
      return new Response(JSON.stringify({ url: presignedUrl, key: objectKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: getSignedUrls (batch - multiple keys at once)
    if (action === "getSignedUrls") {
      const body = await req.json();
      const keys = body.keys as string[];
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return new Response(JSON.stringify({ error: "keys array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const urls: Record<string, string> = {};
      await Promise.all(keys.map(async (key) => {
        urls[key] = await generatePresignedUrl({
          endpoint, bucket, objectKey: key, region, accessKey, secretKey, expiresIn: 3600,
        });
      }));
      return new Response(JSON.stringify({ urls }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: listRecursive — list ALL keys under a prefix (no delimiter) for sync checks
    if (action === "listRecursive") {
      const prefix = url.searchParams.get("prefix") || "";
      const allFolders = new Set<string>();
      let continuationToken: string | undefined;

      // Paginate through all results
      for (let page = 0; page < 50; page++) {
        const qp: Record<string, string> = { "list-type": "2", prefix };
        if (continuationToken) qp["continuation-token"] = continuationToken;

        const signed = await signS3Request({
          method: "GET", endpoint, bucket, objectKey: "",
          region, accessKey, secretKey,
          queryParams: qp,
        });

        const s3Resp = await fetch(signed.url, { headers: signed.headers });
        const xml = await s3Resp.text();
        if (!s3Resp.ok) {
          return new Response(JSON.stringify({ error: "S3 listRecursive failed", details: xml }), {
            status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Extract all keys and derive folder prefixes
        const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
        const decodeXmlEntities = (s: string) =>
          s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
           .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
           .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
           .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

        for (const m of keyMatches) {
          const key = decodeXmlEntities(m[1]);
          // Derive all parent folder prefixes from this key
          const parts = key.split("/");
          for (let i = 1; i < parts.length; i++) {
            allFolders.add(parts.slice(0, i).join("/"));
          }
        }

        // Check for truncation
        const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
        if (!isTruncated) break;
        const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
        if (!tokenMatch) break;
        continuationToken = decodeXmlEntities(tokenMatch[1]);
      }

      return new Response(JSON.stringify({ folders: Array.from(allFolders) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: copyObject — server-side S3 copy (no data transfer)
    if (action === "copyObject") {
      const body = await req.json();
      const { sourceKey, destinationKey } = body;
      if (!sourceKey || !destinationKey) {
        return new Response(JSON.stringify({ error: "sourceKey and destinationKey required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure destination folder exists
      const destFolder = destinationKey.substring(0, destinationKey.lastIndexOf("/") + 1);
      if (destFolder) {
        const folderSigned = await signS3Request({
          method: "PUT", endpoint, bucket, objectKey: destFolder,
          region, accessKey, secretKey,
          body: "",
          headers: { "content-length": "0", "content-type": "application/x-directory" },
        });
        await fetch(folderSigned.url, { method: "PUT", headers: folderSigned.headers, body: "" });
      }

      // S3 CopyObject: PUT with x-amz-copy-source header
      const copySource = `/${bucket}/${sourceKey}`;
      const signed = await signS3Request({
        method: "PUT", endpoint, bucket, objectKey: destinationKey,
        region, accessKey, secretKey,
        body: "",
        headers: {
          "content-length": "0",
          "x-amz-copy-source": s3UriEncode(copySource, false),
        },
      });
      const s3Resp = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body: "",
      });
      const respText = await s3Resp.text();
      if (!s3Resp.ok) {
        console.error("S3 copyObject error:", respText);
        return new Response(JSON.stringify({ error: "Copy failed", details: respText }), {
          status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, key: destinationKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: getBucketUsage — get total size of all objects in bucket
    if (action === "getBucketUsage") {
      let totalSize = 0;
      let totalFiles = 0;
      let continuationToken: string | undefined;
      const folderSizes = new Map<string, { size: number; count: number }>();

      for (let page = 0; page < 200; page++) {
        const qp: Record<string, string> = { "list-type": "2", "max-keys": "1000" };
        if (continuationToken) qp["continuation-token"] = continuationToken;

        const signed = await signS3Request({
          method: "GET", endpoint, bucket, objectKey: "",
          region, accessKey, secretKey,
          queryParams: qp,
        });

        const s3Resp = await fetch(signed.url, { headers: signed.headers });
        const xml = await s3Resp.text();
        if (!s3Resp.ok) {
          return new Response(JSON.stringify({ error: "Failed to get bucket usage" }), {
            status: s3Resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const decodeXmlEntities = (s: string) =>
          s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
           .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
           .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
           .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

        const contentBlocks = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
        for (const block of contentBlocks) {
          const keyMatch = block[1].match(/<Key>([^<]+)<\/Key>/);
          const sizeMatch = block[1].match(/<Size>([^<]+)<\/Size>/);
          if (keyMatch && sizeMatch) {
            const key = decodeXmlEntities(keyMatch[1]);
            const size = parseInt(sizeMatch[1] || "0");
            totalSize += size;
            totalFiles++;

            // Accumulate sizes for each parent folder
            const parts = key.split("/");
            for (let i = 1; i < parts.length; i++) {
              const folderPath = parts.slice(0, i).join("/");
              const existing = folderSizes.get(folderPath) || { size: 0, count: 0 };
              existing.size += size;
              existing.count++;
              folderSizes.set(folderPath, existing);
            }
          }
        }

        const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
        if (!isTruncated) break;
        const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
        if (!tokenMatch) break;
        continuationToken = decodeXmlEntities(tokenMatch[1]);
      }

      // Convert folder sizes map to array
      const folders = Array.from(folderSizes.entries()).map(([path, data]) => ({
        path,
        name: path.split("/").pop() || path,
        totalBytes: data.size,
        fileCount: data.count,
      }));

      return new Response(JSON.stringify({ totalSize, totalFiles, folders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("cloudflare-r2-api error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
