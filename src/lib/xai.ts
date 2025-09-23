// xAI integration for domain brandability scoring
// Based on javascript_xai blueprint

import OpenAI from "openai";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface BrandabilityResult {
  score: number;
  commentary: string;
}

export async function analyzeBrandability(domain: string): Promise<BrandabilityResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are a domain branding expert. Analyze the brandability of domain names based on:
          - Pronounceability (how easy it is to say)
          - Memorability (how easy it is to remember)
          - Uniqueness (how distinctive it is)
          - Commercial appeal (how suitable for business use)
          
          Provide a score from 0-100 and a brief 2-3 sentence explanation.
          Respond with JSON in this format: { "score": number, "commentary": "explanation" }`
        },
        {
          role: "user",
          content: `Analyze the brandability of this domain: ${domain}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      score: Math.max(0, Math.min(100, Math.round(result.score || 0))),
      commentary: result.commentary || "Unable to analyze brandability at this time."
    };
  } catch (error) {
    console.error('Brandability analysis failed:', error);
    // Return a neutral score if AI analysis fails
    return {
      score: 50,
      commentary: "AI analysis temporarily unavailable. Manual review recommended."
    };
  }
}