const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, refresh_token, title, description, tags, privacy, video_tracker_id } = await req.json();

    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "YouTube credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get_auth_url — returns the OAuth consent URL
    if (action === "get_auth_url") {
      const redirectUri = req.headers.get("origin") || "https://wtnclienttracker.lovable.app";
      const scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
      ].join(" ");

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: exchange_code — exchange authorization code for tokens
    if (action === "exchange_code") {
      const { code, redirect_uri } = await req.json().catch(() => ({ code: undefined, redirect_uri: undefined }));
      const body = await req.json().catch(() => ({}));
      const authCode = code || body.code;
      const rUri = redirect_uri || body.redirect_uri;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: authCode,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: rUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      return new Response(JSON.stringify(tokenData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: init_upload — refresh token and get resumable upload URI
    if (action === "init_upload") {
      if (!refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh the access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error: "Failed to refresh token", details: tokenData }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Initiate resumable upload
      const metadata = {
        snippet: {
          title: title || "Untitled Video",
          description: description || "",
          tags: tags || [],
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: privacy || "private",
          selfDeclaredMadeForKids: false,
        },
      };

      const initRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/*",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initRes.ok) {
        const errText = await initRes.text();
        return new Response(JSON.stringify({ error: "YouTube API error", details: errText }), {
          status: initRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const uploadUri = initRes.headers.get("location");

      return new Response(JSON.stringify({ upload_uri: uploadUri, access_token: tokenData.access_token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
