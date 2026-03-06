"use server";

import { openai } from "@/lib/openai";

interface GeneratedFAQ {
  q: string;
  a: string;
}

export async function generateCommunityFAQs(
  communityName: string,
  communityDescription: string | null
): Promise<GeneratedFAQ[]> {
  try {
    const prompt = `You are a community manager creating an FAQ section for a community called "${communityName}".
    
${communityDescription ? `Community description: ${communityDescription}` : ""}

Generate 5 frequently asked questions and answers that potential members might have about joining this community.

Make the questions specific to what this community offers. Focus on:
- What the community is about
- How to join or participate
- Benefits of joining
- Any requirements or costs
- How to get started

Return ONLY a JSON array in this exact format:
[
  { "q": "Question 1?", "a": "Answer 1." },
  { "q": "Question 2?", "a": "Answer 2." },
  { "q": "Question 3?", "a": "Answer 3." },
  { "q": "Question 4?", "a": "Answer 4." },
  { "q": "Question 5?", "a": "Answer 5." }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful community manager. Generate natural, helpful FAQ content. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse FAQ JSON from response");
    }

    const faqs: GeneratedFAQ[] = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!Array.isArray(faqs) || faqs.length !== 5) {
      throw new Error("Invalid FAQ format received");
    }

    return faqs;
  } catch (error) {
    console.error("Error generating FAQs:", error);
    // Return default FAQs as fallback
    return [
      { q: "What is this community about?", a: "This is a space for members to connect, learn, and grow together." },
      { q: "How can I join?", a: "Click the 'Join' button and follow the simple registration process." },
      { q: "What are the benefits?", a: "Access to exclusive content, community discussions, and networking opportunities." },
      { q: "Is there a cost?", a: "Please check our pricing page for current membership options." },
      { q: "How do I get started?", a: "After joining, introduce yourself in the welcome channel and explore the community!" },
    ];
  }
}
