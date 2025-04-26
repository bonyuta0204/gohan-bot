// handle_message.ts
// Pure function to generate a reply using LLM, matching logic in slack_mentions/postReply

import { chatCompletion } from "./ai.ts";

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
 * @returns {Promise<HandleMessageResponse>}
 */
export async function handleMessage(req: HandleMessageRequest): Promise<HandleMessageResponse> {
  try {
    const response = await chatCompletion({
      messages: [
        { role: "user", content: req.userMessage },
      ],
    });
    const message = response.choices[0]?.message?.content;
    if (!message) {
      return { reply: "", error: "Failed to get response from LLM" };
    }
    return { reply: message };
  } catch (err) {
    return { reply: "", error: (err instanceof Error ? err.message : String(err)) };
  }
}
