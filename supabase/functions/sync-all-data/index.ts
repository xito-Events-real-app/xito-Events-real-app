import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DISABLED: All pull-from-sheets logic has been removed.
// Supabase is the absolute source of truth. Sheets are only a mirror.
// This function is kept as a no-op to prevent accidental calls from causing errors.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[sync-all-data] Pull from sheets is disabled. Supabase is source of truth.');
  return new Response(JSON.stringify({
    success: true,
    message: 'Pull from sheets disabled. Supabase is the absolute source of truth.',
    results: {},
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
