// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { chatCompletion } from "./ai.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Inline types for OpenAI Chat Completion messages (based on OpenAI SDK and docs)
type ChatCompletionMessageParam =
  | { role: "system" | "user" | "assistant"; content: string; name?: string }
  | { role: "function"; name: string; content: string };
type ChatCompletionFunctionMessageParam = {
  role: "function";
  name: string;
  content: string;
};
type ChatCompletionMessageToolCall = { name: string; arguments: string };

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
    const systemMsg: ChatCompletionMessageParam = {
      role: "system",
      content:
        "You are a helpful cooking assistant. Use available functions to manage fridge items and log meals.",
    };
    const userMsg: ChatCompletionMessageParam = {
      role: "user",
      content: userMessage,
    };
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
      const name = (toolCall as ChatCompletionMessageToolCall).name;
      const argsJson = (toolCall as ChatCompletionMessageToolCall).arguments;
      const args = JSON.parse(argsJson || "{}");
      let functionResult: unknown;
      if (name === "add_fridge_item") {
        await supabase
          .from("fridge_items")
          .insert({ item_name: args.item_name });
        functionResult = {
          status: "success",
          detail: `Added ${args.item_name}`,
        };
      } else if (name === "record_meal") {
        await supabase
          .from("meal_logs")
          .insert({ meal_name: args.meal_name });
        functionResult = {
          status: "success",
          detail: `Recorded meal ${args.meal_name}`,
        };
      } else if (name === "fetch_recent_items") {
        const { data } = await supabase
          .from("fridge_items")
          .select("item_name,added_at")
          .order("added_at", { ascending: false })
          .limit(args.limit || 5);
        functionResult = { items: data };
      }
      // Second LLM call with function result
      const functionMsg: ChatCompletionFunctionMessageParam = {
        role: "function",
        name,
        content: JSON.stringify(functionResult),
      };
      const secondResp = await chatCompletion({
        model: "gpt-4o-mini",
        messages: [systemMsg, userMsg, functionMsg],
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

// Tool schemas for function calling
function getToolSchema() {
  return [
    {
      name: "add_fridge_item",
      description: "Add an item to the user's fridge",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of the item to add" },
        },
        required: ["item_name"],
      },
    },
    {
      name: "record_meal",
      description: "Record a meal eaten by the user",
      parameters: {
        type: "object",
        properties: {
          meal_name: { type: "string", description: "Name of the meal" },
        },
        required: ["meal_name"],
      },
    },
    {
      name: "fetch_recent_items",
      description: "Fetch recently added fridge items for the user",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Max number of items to fetch",
          },
        },
        required: [],
      },
    },
  ];
}
