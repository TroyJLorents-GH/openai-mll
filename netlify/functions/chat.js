import OpenAI from "openai";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

async function handleFoundryChat(message) {
  const { ClientSecretCredential } = await import("@azure/identity");

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const token = await credential.getToken("https://ai.azure.com/.default");

  const resp = await fetch(process.env.FOUNDRY_AGENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.token}`,
      "aml-user-token": token.token,
    },
    body: JSON.stringify({ input: [{ role: "user", content: message }] }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Foundry agent returned ${resp.status}: ${errText}`);
  }

  const data = await resp.json();

  if (data.output_text) return data.output_text;
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && item.role === "assistant") {
        const content = item.content || [];
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c.type === "output_text" && c.text) return c.text;
          }
        } else {
          return String(content);
        }
      }
    }
  }
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;

  return "I apologize, but I couldn't generate a response. Please try again.";
}

async function handleOpenAIChat(message, model, mode) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Moderation check
  const moderation = await client.moderations.create({ input: message });
  if (moderation.results[0].flagged) {
    return "I apologize, but I cannot respond to that type of content!";
  }

  const isDocQuery = message.includes("Context from uploaded documents:");

  let systemMessage, maxTokens, temperature;

  if (isDocQuery) {
    systemMessage = mode === "code"
      ? "You are a concise, friendly coding assistant with access to uploaded documents. Extract only the information needed. Provide correct, runnable code when relevant."
      : "You are a helpful AI assistant with access to uploaded documents. Answer questions based on the document content. Use markdown formatting.";
    maxTokens = 2000;
    temperature = mode === "code" ? 0.35 : 0.5;
  } else {
    systemMessage = mode === "code"
      ? "You are a concise, friendly coding assistant. Prioritize correct, runnable code. Use fenced blocks with language tags."
      : "You are a helpful, concise, and friendly general assistant. Be direct and actionable. Use markdown formatting.";
    maxTokens = 700;
    temperature = 0.3;
  }

  // Normalize model
  const supported = ["gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-4.1-mini", "gpt-3.5-turbo", "gpt-4.1"];
  const normalizedModel = supported.includes(model) ? model : "gpt-5";

  const usesMaxCompletionTokens = normalizedModel.startsWith("gpt-4o") || normalizedModel.startsWith("gpt-4.1");

  const createArgs = {
    model: normalizedModel,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: message },
    ],
    temperature,
  };

  if (usesMaxCompletionTokens) {
    createArgs.max_completion_tokens = maxTokens;
  } else {
    createArgs.max_tokens = maxTokens;
  }

  const response = await client.chat.completions.create(createArgs);
  return response.choices[0].message.content.trim();
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { message, model = "gpt-4o", mode = "general" } = JSON.parse(event.body || "{}");

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No message provided." }) };
    }

    let response;
    if (model === "PersonalAssistant") {
      response = await handleFoundryChat(message);
    } else {
      response = await handleOpenAIChat(message, model, mode);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ response }) };
  } catch (err) {
    console.error("Chat error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Chat failed", detail: err.message }),
    };
  }
};
