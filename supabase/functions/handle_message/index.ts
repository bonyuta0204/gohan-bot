// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleMessage } from "../_shared/handle_message.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("Hello from Functions!");

Deno.serve(async (req) => {
  const { userMessage, images } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    },
  );
  const { reply, error } = await handleMessage({
    userMessage,
    conversationId: "test_0001",
    images, // Pass images (base64 URLs) to handleMessage
  }, supabase);
  const data = error ? { error } : { reply };

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  );
});
