import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY not configured in .env.local",
        },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test 1: List models (quick test)
    const models = await openai.models.list();
    const hasWhisper = models.data.some((m) => m.id.includes("whisper"));
    const hasGPT4 = models.data.some((m) => m.id.includes("gpt-4"));

    // Test 2: Quick completion test
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'OpenAI connection successful!' in one sentence.",
        },
      ],
      max_tokens: 50,
    });

    return NextResponse.json({
      success: true,
      message: "OpenAI API configured correctly! ✅",
      tests: {
        apiKeyConfigured: true,
        modelsAccessible: true,
        whisperAvailable: hasWhisper,
        gpt4Available: hasGPT4,
        completionTest: completion.choices[0].message.content,
      },
      estimatedCosts: {
        whisper: "$0.006 per minute of audio",
        gpt4Turbo: "$0.01 per 1K tokens",
        example: "1 hour session = $0.38 transcription + $0.02 summary",
      },
    });
  } catch (error: any) {
    console.error("OpenAI test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        hint:
          error.status === 401
            ? "Invalid API key. Check your OPENAI_API_KEY in .env.local"
            : error.status === 429
            ? "Rate limit exceeded or insufficient quota. Check billing at platform.openai.com"
            : "Unknown error. Check console logs.",
      },
      { status: 500 }
    );
  }
}
