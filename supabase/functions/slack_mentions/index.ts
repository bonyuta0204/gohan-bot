// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { WebClient } from "https://deno.land/x/slack_web_api@6.7.2/mod.js";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const slack_bot_token = Deno.env.get("SLACK_TOKEN") ?? "";
const bot_client = new WebClient(slack_bot_token);

Deno.serve(async (req) => {
  try {
    const _supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );
    const req_body = await req.json();

    const { challenge, type, event } = req_body;

    console.log(`Request type: ${type}`);

    if (type == "url_verification") {
      console.log("Handling Slack URL verification");
      return new Response(JSON.stringify({ challenge }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else if (event && event.type == "app_mention") {
      onAppMention(event);

      return new Response("", { status: 200 });
    } else {
      console.log("Unhandled event type or missing event");
      return new Response("", { status: 200 });
    }
  } catch (err) {
    console.error("Error handling request", err);
    return new Response(JSON.stringify({ error: err }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function onAppMention(
  event: { channel: string; ts: string; text: string },
) {
  console.log(
    `App mention event: channel=${event.channel}, thread_ts=${event.ts}`,
  );
  // We post to Slack in a background task since LLM calls are slow
  EdgeRuntime.waitUntil(postReply(event.text, event.channel, event.ts));
}

/**
 * Use LLM and reply the result to Slack
 */
async function postReply(
  userMessage: string,
  channel: string,
  ts: string,
): Promise<void> {
  console.log(`Generating response to user message: ${userMessage}`);
  try {
    const response = await chatCompletion({
      messages: [
        { role: "user", content: userMessage },
      ],
    });
    const message = response.choices[0].message.content;
    if (!message) {
      throw new Error("Failed to get response from LLM");
    }
    await postSlack(channel, ts, message);
  } catch (err) {
    console.error("Error generating response", err);
  }
}

async function postSlack(
  channel: string,
  ts: string,
  message: string,
): Promise<void> {
  console.log(
    `Posting message to Slack: channel=${channel}, thread_ts=${ts}`,
  );
  try {
    const result = await bot_client.chat.postMessage({
      channel: channel,
      thread_ts: ts,
      text: message,
    });
    console.log("Slack postMessage result", result);
  } catch (e) {
    console.error("Error posting message to Slack", e);
  }
}
