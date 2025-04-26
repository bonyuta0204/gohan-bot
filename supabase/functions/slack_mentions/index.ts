// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { WebClient } from "https://deno.land/x/slack_web_api@6.7.2/mod.js";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const slack_bot_token = Deno.env.get("SLACK_TOKEN") ?? "";
const bot_client = new WebClient(slack_bot_token);
const supabase_url = Deno.env.get("SUPABASE_URL") ?? "";
const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = new SupabaseClient(supabase_url, service_role);

Deno.serve(async (req) => {
  console.log("Received request");
  try {
    const req_body = await req.json();
    if (Deno.env.get("LOG_LEVEL") === "debug") {
      console.debug("Request body:", req_body);
    }
    const { token, challenge, type, event } = req_body;

    console.log(`Request type: ${type}`);

    if (type == "url_verification") {
      console.log("Handling Slack URL verification");
      return new Response(JSON.stringify({ challenge }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else if (event && event.type == "app_mention") {
      const { user, text, channel, ts } = event;
      console.log(
        `App mention event from user: ${user}, channel: ${channel}, ts: ${ts}`,
      );
      const url_path = text.toLowerCase().includes("code")
        ? "/code"
        : "/general";
      if (Deno.env.get("LOG_LEVEL") === "debug") {
        console.debug(`Determined url_path: ${url_path}`);
      }
      const { error: dbError } = await supabase.from("job_queue").insert({
        http_verb: "POST",
        payload: { user, text, channel, ts },
        url_path: url_path,
      });

      if (dbError) {
        console.error("Failed to insert job into job_queue", dbError);
        return new Response(JSON.stringify({ error: dbError }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      console.log("Job inserted into job_queue successfully");
      await post(
        channel,
        ts,
        `Taking a look and will get back to you shortly!`,
      );
      console.log("Posted reply to Slack thread");
      return new Response("", { status: 200 });
    } else {
      console.log("Unhandled event type or missing event");
      return new Response("", { status: 200 });
    }
  } catch (err) {
    let errMsg = "";
    let errStack = "";
    if (err instanceof Error) {
      errMsg = err.message;
      errStack = err.stack || "";
    } else if (typeof err === "object" && err !== null && "message" in err) {
      // @ts-ignore
      errMsg = err.message;
    } else {
      errMsg = String(err);
    }
    console.error("Error handling request", errMsg, errStack);
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function post(
  channel: string,
  thread_ts: string,
  message: string,
): Promise<void> {
  console.log(
    `Posting message to Slack: channel=${channel}, thread_ts=${thread_ts}`,
  );
  try {
    const result = await bot_client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts,
      text: message,
    });
    console.log("Slack postMessage result", result);
  } catch (e) {
    let errMsg = "";
    let errStack = "";
    if (e instanceof Error) {
      errMsg = e.message;
      errStack = e.stack || "";
    } else if (typeof e === "object" && e !== null && "message" in e) {
      // @ts-ignore
      errMsg = e.message;
    } else {
      errMsg = String(e);
    }
    console.error(`Error posting message to Slack: ${errMsg}, ${errStack}`);
  }
}
