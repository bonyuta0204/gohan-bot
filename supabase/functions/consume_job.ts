import { WebClient } from "https://deno.land/x/slack_web_api@6.7.2/mod.js";

const slack_bot_token = Deno.env.get("SLACK_TOKEN") ?? "";
const bot_client = new WebClient(slack_bot_token);
const hf_token = Deno.env.get("HUGGINGFACE_TOKEN") ?? "";
const openai_api_key = Deno.env.get("OPEN_AI") ?? "";

console.log("Function that will handle the tasks!");

Deno.serve(async (req) => {
    const payload = await req.json();
    const url = new URL(req.url);
    const method = req.method;

    // Extract the last part of the path as the command
    const command = url.pathname.split("/").pop();
    try {
        let generated_text = "";
        if (command == "general") {
            generated_text = await getGeneratedTextFromHuggingFace(payload);
        } else {
            generated_text = await getGeneratedTextFromChatGPT(payload);
        }
        await post(
            payload.channel,
            payload.ts,
            `Thanks for asking: ${generated_text}`,
        );
        return new Response("ok", {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
});

async function post(
    channel: string,
    thread_ts: string,
    message: string,
): Promise<void> {
    try {
        const result = await bot_client.chat.postMessage({
            channel: channel,
            thread_ts: thread_ts,
            text: message,
        });
        console.info(result);
    } catch (e) {
        console.error(`Error posting message: ${e}`);
    }
}

async function getGeneratedTextFromHuggingFace(payload) {
    let huggingface_url = "";
    let body_content = "";
    huggingface_url =
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
    body_content = `[INST] ${payload.text} [/INST]`;
    body_content = JSON.stringify({ "inputs": body_content }, null, 2);

    const huggingface_response = await fetch(huggingface_url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${hf_token}`,
        },
        body: body_content,
    });
    const huggingface_data = await huggingface_response.json();
    if (huggingface_data.error) {
        console.error(huggingface_data.error);
        throw new Error(huggingface_data.error.message);
    }
    const generated_text = huggingface_data[0]
        .generated_text.split("[/INST]");
    return generated_text.length > 1 ? generated_text[1] : generated_text[0];
}

async function getGeneratedTextFromChatGPT(payload) {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openai_api_key}`,
    };

    const openai_url = "https://api.openai.com/v1/chat/completions";

    let body_content = {
        "model": "gpt-3.5-turbo", // Replace with the name of the chat model you want to use
        "messages": [
            {
                "role": "system",
                "content": `You are a detail-oriented, helpful, 
                    and eager to please assistant.`,
            },
            {
                "role": "user",
                "content": payload.text,
            },
        ],
    };
    const body_content_text = JSON.stringify(body_content, null, 2);
    const openai_response = await fetch(openai_url, {
        method: "POST",
        headers: headers,
        body: body_content_text,
    });
    const openai_data = await openai_response.json();
    if (openai_data.error) {
        console.error(openai_data.error);
        throw new Error(openai_data.error.message);
    }
    return openai_data.choices[0].message.content.trim();
}
