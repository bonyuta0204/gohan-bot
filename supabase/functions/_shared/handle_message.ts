// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { chatCompletion } from "./ai.ts";
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

// Helper: Execute tool calls and collect results/messages
async function executeToolCalls(
  toolCalls: any[],
  supabase: SupabaseClient,
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const toolResults: Record<string, unknown> = {};
  const toolMsgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const toolCall of toolCalls) {
    const name = toolCall.function.name;
    let args: any = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      args = {};
    }
    let result: unknown;
    if (name in toolHandlers) {
      try {
        result = await toolHandlers[name as keyof typeof toolHandlers](
          supabase,
          args,
        );
        console.log(`Function result for ${name}:`, result);
      } catch (toolError) {
        console.error(`Tool handler error for ${name}:`, toolError);
        result = {
          status: "error",
          detail: `Tool '${name}' failed: ` +
            (toolError instanceof Error
              ? toolError.message
              : String(toolError)),
        };
      }
    } else {
      result = { status: "error", detail: `Unknown tool: ${name}` };
    }
    toolResults[name] = result;
    toolMsgs.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }
  return toolMsgs;
}

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
    const firstResp = await chatCompletion({
      model: "gpt-4.1-nano",
      messages,
      tools,
      tool_choice: "auto",
    });
    console.log("First LLM response:", firstResp);
    const choice = firstResp.choices[0];
    let finalText: string;

    // --- Tool call execution ---
    if (choice.message?.tool_calls?.length) {
      const toolMsgs = await executeToolCalls(
        choice.message.tool_calls,
        supabase,
      );
      // Second LLM call with all tool results (if any)
      const secondResp = await chatCompletion({
        model: "gpt-4.1-nano",
        messages: [systemMsg, userMsg, choice.message, ...toolMsgs],
      });
      finalText = secondResp.choices[0]?.message?.content || "(No response)";
    } else {
      finalText = choice.message?.content || "(No response)";
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
