// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { chatCompletion } from "./ai.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getToolSchema, toolHandlers } from "./tools/index.ts";

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
export async function handleMessage(
  req: HandleMessageRequest,
  supabase: SupabaseClient,
): Promise<HandleMessageResponse> {
  try {
    const { userMessage } = req;
    const systemMsg = {
      role: "system",
      content:
        "You are a helpful cooking assistant. Use available functions to manage fridge items and log meals.",
    } as const;
    const userMsg = {
      role: "user",
      content: userMessage,
    } as const;
    const tools = getToolSchema();

    // First LLM call with function schema
    const firstResp = await chatCompletion({
      model: "gpt-4o-mini",
      messages: [systemMsg, userMsg],
      tools,
      tool_choice: "auto",
    });
    const choice = firstResp.choices[0];
    let finalText: string;
    if (choice.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const name = toolCall.function.name;
      const argsJson = toolCall.function.arguments;

      console.log("Tool call:", name, argsJson);
      const args = JSON.parse(argsJson || "{}");
      let functionResult: unknown;
      if (name in toolHandlers) {
        try {
          functionResult = await toolHandlers[name as keyof typeof toolHandlers](
            supabase,
            args,
          );
        } catch (toolError) {
          console.error("Tool handler error:", toolError);
          functionResult = {
            status: "error",
            detail: `Tool '${name}' failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
          };
        }
      } else {
        functionResult = { status: "error", detail: `Unknown tool: ${name}` };
      }
      // Second LLM call with function result
      const toolMsg = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      } as const;
      const secondResp = await chatCompletion({
        model: "gpt-4o-mini",
        messages: [systemMsg, userMsg, firstResp.choices[0].message, toolMsg],
      });
      finalText = secondResp.choices[0]?.message?.content || "(No response)";
    } else {
      finalText = choice.message?.content || "(No response)";
    }
    return { reply: finalText };
  } catch (err) {
    return {
      reply: "",
      error: (err instanceof Error ? err.message : String(err)),
    };
  }
}
