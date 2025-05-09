// client.ts
// Shared logic for OpenAI chat-completion integration
// Usage: import { chatCompletion } from './_shared/client.ts';
// Uses official OpenAI npm library, reads API key from env

import OpenAI from "npm:openai";

import type { ChatCompletion } from "npm:openai/resources/chat/completions";

export function buildOpenAIClient() {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

/**
 * Calls OpenAI's chat-completion endpoint using the official OpenAI library for Deno.
 * Reads API key from OPENAI_API_KEY environment variable.
 * @param {string} [model='gpt-3.5-turbo'] - OpenAI model name
 * @param {object} [options] - Additional OpenAI API parameters
 * @returns {Promise<ChatCompletion>} - The OpenAI API response
 */
export async function chatCompletion({
  messages,
  ...options
}: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<
  ChatCompletion
> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    messages,
    ...options,
  });
  return response;
}
