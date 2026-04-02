const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube credentials not configured");
  }

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
    throw new Error("Failed to refresh token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "initUpload";

    const accessToken = await getAccessToken();

    switch (action) {
      case "initUpload": {
        const { title, description, tags, privacy } = body;
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
              Authorization: `Bearer ${accessToken}`,
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
        return new Response(JSON.stringify({ upload_uri: uploadUri, access_token: accessToken }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "listPlaylists": {
        let allPlaylists: any[] = [];
        let nextPageToken = "";

        do {
          const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();
          if (data.items) {
            allPlaylists = allPlaylists.concat(
              data.items.map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
              }))
            );
          }
          nextPageToken = data.nextPageToken || "";
        } while (nextPageToken);

        return new Response(JSON.stringify({ playlists: allPlaylists }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "createPlaylist": {
        const { playlistTitle } = body;
        const res = await fetch(
          "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: { title: playlistTitle || "Untitled Playlist" },
              status: { privacyStatus: "public" },
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Failed to create playlist", details: data }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ playlistId: data.id, title: data.snippet?.title }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "addToPlaylist": {
        const { playlistId, videoId } = body;
        const res = await fetch(
          "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                playlistId,
                resourceId: { kind: "youtube#video", videoId },
              },
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Failed to add to playlist", details: data }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "setThumbnail": {
        const { videoId, thumbnailBase64, mimeType } = body;
        const binaryStr = atob(thumbnailBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const res = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": mimeType || "image/jpeg",
            },
            body: bytes,
          }
        );
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Failed to set thumbnail", details: data }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, thumbnails: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getPlaylistVideos": {
        const { playlistId } = body;
        if (!playlistId) {
          return new Response(JSON.stringify({ error: "playlistId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        let allVideos: any[] = [];
        let nextPageToken = "";
        do {
          const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();
          if (data.items) {
            allVideos = allVideos.concat(
              data.items.map((item: any) => ({
                videoId: item.contentDetails?.videoId || "",
                title: item.snippet?.title || "",
                thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
                position: item.snippet?.position ?? 0,
              }))
            );
          }
          nextPageToken = data.nextPageToken || "";
        } while (nextPageToken);

        return new Response(JSON.stringify({ videos: allVideos }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
