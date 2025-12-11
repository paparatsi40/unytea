import OpenAI from "openai";

console.log("🔧 Checking OPENAI_API_KEY...");
console.log("API Key exists:", !!process.env.OPENAI_API_KEY);
console.log("API Key length:", process.env.OPENAI_API_KEY?.length || 0);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("✅ OpenAI client initialized");

// Default configuration
export const AI_CONFIG = {
  model: "gpt-3.5-turbo", // Changed from gpt-4-turbo-preview - works for all accounts
  temperature: 0.7, // 0 = deterministic, 1 = creative
  maxTokens: 1000, // Max response length
  systemPrompt: `You are Unytea AI, a helpful assistant for the Unytea community platform.
You help community members with:
- Answering questions about the community
- Finding relevant content and discussions
- Providing guidance on platform features
- Offering support and assistance

You are friendly, concise, and helpful. You understand context from the community
and provide relevant, accurate information.`,
};

// Types
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Generate a chat completion using OpenAI
 */
export async function generateChatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  try {
    console.log("🤖 Generating chat completion...");
    console.log("Model:", options.model || AI_CONFIG.model);
    console.log("Messages count:", options.messages.length);
    
    const response = await openai.chat.completions.create({
      model: options.model || AI_CONFIG.model,
      messages: options.messages,
      temperature: options.temperature || AI_CONFIG.temperature,
      max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
    });

    console.log("✅ OpenAI response received");
    return response.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("❌ OpenAI API error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Error code:", error.code);
    
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}

/**
 * Moderate content using OpenAI moderation API
 */
export async function moderateContent(content: string): Promise<{
  flagged: boolean;
  categories: string[];
}> {
  try {
    const response = await openai.moderations.create({
      input: content,
    });

    const result = response.results[0];
    
    const flaggedCategories = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    return {
      flagged: result.flagged,
      categories: flaggedCategories,
    };
  } catch (error) {
    console.error("OpenAI moderation error:", error);
    return { flagged: false, categories: [] };
  }
}

/**
 * Generate embeddings for text (for vector search/RAG)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // or "text-embedding-3-large" for better quality
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw new Error("Failed to generate embedding");
  }
}