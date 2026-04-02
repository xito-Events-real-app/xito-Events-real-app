const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, description, tags, privacy } = await req.json();

    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "YouTube credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!refreshToken) {
      return new Response(JSON.stringify({ error: "YouTube refresh token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh the access token using the stored refresh token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
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
        categoryId: "22",
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
