// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { buildOpenAIClient, chatCompletion } from "./client.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getToolSchema, toolHandlers } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import OpenAI from "npm:openai";

export type HandleMessageRequest = {
  userMessage: string;
};

export type HandleMessageResponse = {
  reply: string;
  error?: string;
};

const client = buildOpenAIClient();

/**
 * Generates a reply to a user message using the LLM (OpenAI).
 * Pure function, no side effects.
 * @param req {HandleMessageRequest}
 * @param supabase {ReturnType<typeof import("jsr:@supabase/supabase-js@2").createClient>}
 * @returns {Promise<HandleMessageResponse>}
 */
// Helper: Fetch and format fridge context message
async function getFridgeContextMessage(
  supabase: SupabaseClient,
): Promise<{ role: "assistant"; content: string }> {
  const { fetch_recent_items } = toolHandlers;
  const fridgeResult = await fetch_recent_items(supabase, { limit: 100 });
  if (fridgeResult && Array.isArray(fridgeResult.items)) {
    const items = fridgeResult.items;
    if (items.length > 0) {
      // Structure the response as JSON for clarity and downstream parsing
      const json = {
        fridge_items: items.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          expire_at: item.expire_at,
          note: item.note,
          added_at: item.added_at,
          meta: item.meta,
        })),
      };

      const message = `Here are the current fridge items (latest first):\n${
        JSON.stringify(json, null, 2)
      }\n`;
      return { role: "assistant", content: message };
    } else {
      const message = "Your fridge is currently empty.";
      return { role: "assistant", content: message };
    }
  }
  return { role: "assistant", content: "" };
}

async function executeToolCall(
  toolCall: OpenAI.Responses.ResponseFunctionToolCall,
  supabase: SupabaseClient,
): Promise<OpenAI.Responses.ResponseInputItem.FunctionCallOutput> {
  const name = toolCall.name;
  const parsedArgs = JSON.parse(toolCall.arguments || "{}");

  if (!(name in toolHandlers)) {
    return {
      call_id: toolCall.call_id,
      output: `Unknown tool: ${name}`,
      type: "function_call_output",
    };
  }
  const handler = toolHandlers[name as keyof typeof toolHandlers];
  const result = await handler(supabase, parsedArgs);
  return {
    call_id: toolCall.call_id,
    output: JSON.stringify(result),
    type: "function_call_output",
  };
}

/**
 * Main function to handle a user message.
 * @param req Message request
 * @param supabase Supabase client
 * @returns HandleMessageResponse
 */
export async function handleMessage(
  req: HandleMessageRequest,
  supabase: SupabaseClient,
): Promise<HandleMessageResponse> {
  try {
    const { userMessage } = req;
    const systemMsg = {
      role: "system",
      content: SYSTEM_PROMPT,
    } as const;
    const userMsg = {
      role: "user",
      content: userMessage,
    } as const;
    const tools = getToolSchema();

    // --- Inject fridge items context before first LLM call ---
    const fridgeMsg = await getFridgeContextMessage(supabase);
    const messages = fridgeMsg.content
      ? [systemMsg, fridgeMsg, userMsg]
      : [systemMsg, userMsg];

    console.log("Messages before LLM:", messages);
    // First LLM call with function schema
    const firstResp = await client.responses.create({
      model: "gpt-4.1-nano",
      input: messages,
      tools,
      tool_choice: "auto",
    });
    console.log("First LLM response:", firstResp);
    const output = firstResp.output[0];
    let finalText: string;

    // --- Tool call execution ---
    if (output.type === "function_call") {
      const toolMsgs = await executeToolCall(
        output,
        supabase,
      );
      // Second LLM call with all tool results (if any)
      const secondResp = await client.responses.create({
        model: "gpt-4.1-nano",
        input: [systemMsg, userMsg, output, toolMsgs],
      });
      finalText = secondResp.output_text || "(No response)";
    } else {
      finalText = firstResp.output_text || "(No response)";
    }
    return { reply: finalText };
  } catch (err) {
    console.error("Error in handleMessage:", err);
    return {
      reply: "",
      error: (err instanceof Error ? err.message : String(err)),
    };
  }
}
