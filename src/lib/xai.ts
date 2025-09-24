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

export interface TrafficEstimate {
  monthlyTraffic: number;
  explanation: string;
}

export async function estimateTraffic(domain: string): Promise<TrafficEstimate> {
  try {
    const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz|me|tv|cc|ly|gl|tech|online|store|blog|site|news|pro|club|agency|studio|digital|dev|design|marketing|services|solutions|group|ventures|holdings|capital|fund|invest|crypto|blockchain|finance|bank|pay|wallet|trade|exchange|market|shop|buy|sell|deal|sale|cart|travel|hotel|flight|trip|vacation|booking|resort|learn|education|course|study|school|training|food|restaurant|delivery|recipe|kitchen|real|estate|property|home|house|rent|game|gaming|play|entertainment|fun|business|work|career|job|hire|health|medical|care|wellness|fitness|doctor|therapy|clinic|tech|software|cloud|data|digital|smart|auto|bot|ai)$/, '')
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are a web traffic analysis expert. Estimate monthly traffic for domain names based on:
          - Domain length and memorability
          - Industry keywords and commercial appeal
          - TLD authority (.com gets more traffic than newer TLDs)
          - Brand recognition potential
          - Typical traffic patterns for similar domains
          
          Consider that:
          - Most domains get 0-1000 visits/month
          - Established brandable domains: 1000-10000 visits/month
          - Strong keyword domains: 5000-50000 visits/month
          - Premium domains with existing traffic: 50000+ visits/month
          
          Provide a realistic monthly traffic estimate and brief explanation.
          Respond with JSON in this format: { "monthlyTraffic": number, "explanation": "reasoning" }`
        },
        {
          role: "user",
          content: `Estimate monthly traffic potential for this domain: ${domain}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      monthlyTraffic: Math.max(0, Math.round(result.monthlyTraffic || 100)),
      explanation: result.explanation || "AI-based traffic estimate using domain characteristics."
    };
  } catch (error) {
    console.error('Traffic estimation failed:', error);
    // Return a low estimate if AI analysis fails
    return {
      monthlyTraffic: 100,
      explanation: "AI analysis temporarily unavailable. Conservative traffic estimate applied."
    };
  }
}

export interface TrademarkRisk {
  hasConflict: boolean;
  severity: 'clear' | 'warning' | 'severe';
  explanation: string;
}

export async function analyzeTrademarkRisk(domain: string): Promise<TrademarkRisk> {
  try {
    const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz|me|tv|cc|ly|gl|tech|online|store|blog|site|news|pro|club|agency|studio|digital|dev|design|marketing|services|solutions|group|ventures|holdings|capital|fund|invest|crypto|blockchain|finance|bank|pay|wallet|trade|exchange|market|shop|buy|sell|deal|sale|cart|travel|hotel|flight|trip|vacation|booking|resort|learn|education|course|study|school|training|food|restaurant|delivery|recipe|kitchen|real|estate|property|home|house|rent|game|gaming|play|entertainment|fun|business|work|career|job|hire|health|medical|care|wellness|fitness|doctor|therapy|clinic|tech|software|cloud|data|digital|smart|auto|bot|ai)$/, '')
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are a trademark analysis expert. Assess trademark risk for domain names based on:
          - Known major brand names (Google, Apple, Microsoft, Amazon, Facebook, etc.)
          - Common trademark patterns and variations
          - Industry-specific brand names
          - Generic vs brandable terms
          
          Risk levels:
          - "severe": Direct match with known major brands or clear trademark infringement
          - "warning": Similar to known brands or could cause confusion
          - "clear": No obvious trademark conflicts
          
          Consider major brands across all industries: tech, finance, retail, entertainment, automotive, etc.
          Respond with JSON in this format: { "hasConflict": boolean, "severity": "clear|warning|severe", "explanation": "reasoning" }`
        },
        {
          role: "user",
          content: `Analyze trademark risk for this domain name: ${domainName}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      hasConflict: Boolean(result.hasConflict),
      severity: result.severity || 'clear',
      explanation: result.explanation || "AI-based trademark risk assessment."
    };
  } catch (error) {
    console.error('Trademark analysis failed:', error);
    // Return a safe assessment if AI analysis fails
    return {
      hasConflict: false,
      severity: 'clear',
      explanation: "AI analysis temporarily unavailable. Manual trademark review recommended."
    };
  }
}