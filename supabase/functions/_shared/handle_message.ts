// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { buildOpenAIClient } from "./client.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getToolSchema, toolHandlers } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { OPENAI_MODEL } from "./model.ts";
import OpenAI from "npm:openai";

export type HandleMessageRequest = {
  userMessage: string;
  conversationId?: string;
  images?: string[];
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

type AiConversationHistory = {
  id?: number;
  message_text: string;
  ai_response: string;
  response_id: string;
  conversation_id: string | null;
  created_at: string;
};

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
    const userMsg: OpenAI.Responses.ResponseInputItem = {
      role: "user",
      content: [{ type: "input_text", text: userMessage }],
    };

    // Add image inputs if present
    if (req.images && req.images.length > 0) {
      for (const imageUrl of req.images) {
        (userMsg.content as OpenAI.Responses.ResponseInputContent[]).push({
          type: "input_image",
          image_url: imageUrl,
          detail: "auto",
        });
      }
    }
    const tools = getToolSchema();

    let lastConversation: AiConversationHistory | null = null;
    if (req.conversationId) {
      lastConversation = await getAiConversationHistory(
        supabase,
        req.conversationId,
      );
      console.log("Last conversation:", lastConversation);
    }

    const messages: OpenAI.Responses.ResponseInputItem[] = [];

    if (!lastConversation) {
      // We don't need system message when there are existing conversations
      messages.push(systemMsg);

      // We inject fridge items context before first LLM call in new conversation
      const fridgeMsg = await getFridgeContextMessage(supabase);

      if (fridgeMsg.content) {
        messages.push(fridgeMsg);
      }
    }

    messages.push(userMsg);

    console.log("Messages before LLM:", messages);
    // First LLM call with function schema
    const firstResp = await client.responses.create({
      model: OPENAI_MODEL,
      input: messages,
      tools,
      tool_choice: "auto",
      store: true,
      previous_response_id: lastConversation?.response_id ?? null,
    });
    console.log("First LLM response:", firstResp);
    let finalText: string;
    let finalRespId: string;

    // --- Tool call execution ---
    const toolCallOutputs = [];
    let hasFunctionCall = false;
    for (const toolCall of firstResp.output) {
      if (toolCall.type === "function_call") {
        hasFunctionCall = true;
        const toolMsg = await executeToolCall(toolCall, supabase);
        toolCallOutputs.push(toolMsg);
      }
    }
    if (hasFunctionCall) {
      // Second LLM call with all tool results (if any)
      const secondResp = await client.responses.create({
        model: OPENAI_MODEL,
        store: true,
        previous_response_id: firstResp.id,
        input: [...toolCallOutputs],
      });
      finalRespId = secondResp.id;
      finalText = secondResp.output_text || "(No response)";
    } else {
      finalRespId = firstResp.id;
      finalText = firstResp.output_text || "(No response)";
    }

    const aiConversationHistory: AiConversationHistory = {
      message_text: userMessage,
      ai_response: finalText,
      response_id: finalRespId,
      conversation_id: req.conversationId ?? null,
      created_at: new Date().toISOString(),
    };
    await createAiConversationHistory(supabase, aiConversationHistory);
    return { reply: finalText };
  } catch (err) {
    console.error("Error in handleMessage:", err);
    return {
      reply: "",
      error: (err instanceof Error ? err.message : String(err)),
    };
  }
}

async function createAiConversationHistory(
  supabase: SupabaseClient,
  aiConversationHistory: AiConversationHistory,
) {
  const { error } = await supabase.from("ai_conversation_history").insert(
    [aiConversationHistory],
  );
  if (error) {
    throw new Error(
      `Failed to create AI conversation history: ${error.message}`,
    );
  }
}

/**
 * Get last conversation history given conversation id
 */
async function getAiConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<AiConversationHistory | null> {
  const { data, error } = await supabase
    .from("ai_conversation_history")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("id", { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`Failed to get AI conversation history: ${error.message}`);
  }
  if (data.length === 0) {
    return null;
  }
  return data[0];
}
