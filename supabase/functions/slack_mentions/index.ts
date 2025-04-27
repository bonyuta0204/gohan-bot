// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { WebClient } from "https://deno.land/x/slack_web_api@6.7.2/mod.js";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleMessage } from "../_shared/handle_message.ts";

const slack_bot_token = Deno.env.get("SLACK_TOKEN") ?? "";
const bot_client = new WebClient(slack_bot_token);

// Type for incoming Slack file objects
interface SlackFile {
  url_private: string;
  mimetype: string;
  name: string;
}

Deno.serve(async (req) => {
  try {
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
  event: {
    channel: string;
    ts: string;
    text: string;
    thread_ts?: string;
    files?: SlackFile[];
  },
) {
  console.log(`App mention event received: event=${JSON.stringify(event)}`);
  const threadTs = event.thread_ts ?? event.ts;

  EdgeRuntime.waitUntil(
    (async () => {
      const images: string[] = [];
      if (event.files && Array.isArray(event.files)) {
        for (const file of event.files) {
          if (file.mimetype && file.mimetype.startsWith("image/")) {
            const resp = await fetch(file.url_private, {
              headers: { Authorization: `Bearer ${slack_bot_token}` },
            });
            const arrayBuffer = await resp.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            const binary = Array.from(uint8).map(b => String.fromCharCode(b)).join('');
            const base64 = btoa(binary);
            const dataUrl = `data:${file.mimetype};base64,${base64}`;
            images.push(dataUrl);
          }
        }
        await postReply(event.text, event.channel, threadTs, images);
      }
    })(),
  );
}

/**
 * Use LLM and reply the result to Slack
 */
async function postReply(
  userMessage: string,
  channel: string,
  ts: string,
  images?: string[],
): Promise<void> {
  console.log(`Generating response to user message: ${userMessage}`);
  try {
    // Create supabase client for each background task
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: "Bearer " +
              (Deno.env.get("SUPABASE_ANON_KEY") ?? ""),
          },
        },
      },
    );
    const { reply, error } = await handleMessage({
      userMessage,
      conversationId: ts,
      images, // Pass image URLs to downstream function
    }, supabase);
    if (error || !reply) {
      throw new Error(error || "Failed to get response from LLM");
    }
    await postSlack(channel, ts, reply);
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
      markdown_text: message,
    });
    console.log("Slack postMessage result", result);
  } catch (e) {
    console.error("Error posting message to Slack", e);
  }
}
