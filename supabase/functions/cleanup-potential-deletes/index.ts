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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: records, error } = await supabase
      .from("potential_deletes")
      .select("id, image_url, permanently_deleted_at")
      .not("permanently_deleted_at", "is", null)
      .lt("permanently_deleted_at", sevenDaysAgo)
      .neq("image_url", "");

    if (error) throw error;

    let cleaned = 0;
    for (const record of records || []) {
      try {
        const path = record.image_url.split("/potential-deletes/")[1];
        if (path) {
          await supabase.storage.from("potential-deletes").remove([path]);
        }
        await supabase
          .from("potential_deletes")
          .update({ image_url: "" })
          .eq("id", record.id);
        cleaned++;
      } catch (e) {
        console.error(`Failed to clean ${record.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ cleaned, total: (records || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
