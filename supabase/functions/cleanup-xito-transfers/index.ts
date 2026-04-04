import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: expired, error } = await supabase
      .from("xito_transfers")
      .select("id, file_url, transfer_type")
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;

    let cleaned = 0;
    for (const record of expired || []) {
      try {
        if (record.transfer_type === "file" && record.file_url) {
          const path = record.file_url.split("/xito-transfers/")[1];
          if (path) {
            await supabase.storage.from("xito-transfers").remove([path]);
          }
        }
        await supabase.from("xito_transfers").delete().eq("id", record.id);
        cleaned++;
      } catch (e) {
        console.error(`Failed to clean ${record.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ cleaned, total: (expired || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
