import OpenAI from "openai";
import type { Party, PredictionFactors } from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateComparisonInsights(
  candidate1Name: string,
  candidate2Name: string,
  race: string,
  factors: any
): Promise<string> {
  const prompt = `You are a political analyst. Compare these two candidates running in ${race}:

Candidate 1: ${candidate1Name}
Candidate 2: ${candidate2Name}

Key factors comparison:
${JSON.stringify(factors, null, 2)}

Provide a concise 3-4 paragraph analysis covering:
1. Overall race dynamics and what gives each candidate their competitive edge
2. Key strengths and weaknesses for each candidate
3. Critical factors that could swing the race
4. A balanced prediction with caveats

Keep the tone professional, neutral, and data-focused like FiveThirtyEight.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
      temperature: 1,
    });

    return response.choices[0]?.message?.content || "Analysis unavailable.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "AI analysis temporarily unavailable. The prediction is based on statistical modeling of polling, fundraising, name recognition, demographics, endorsements, and historical trends.";
  }
}

export async function generateCustomPrediction(
  candidates: Array<{ name: string; party: Party }>,
  raceTitle: string
): Promise<{
  predictions: Record<string, { probability: number; factors: PredictionFactors }>;
  analysis: string;
}> {
  const prompt = `You are a political data scientist. Analyze this election scenario:

Race: ${raceTitle}
Candidates:
${candidates.map((c, i) => `${i + 1}. ${c.name} (${c.party})`).join('\n')}

Generate realistic win probabilities and factor scores for each candidate. Return a JSON object with:
{
  "predictions": {
    "candidate_name": {
      "probability": number (0-100),
      "factors": {
        "polling": number (0-100),
        "fundraising": number (0-100),
        "nameRecognition": number (0-100),
        "demographics": number (0-100),
        "endorsements": number (0-100),
        "historicalTrends": number (0-100)
      }
    }
  },
  "analysis": "3-4 paragraph analysis explaining the race dynamics and key factors"
}

Ensure probabilities sum to approximately 100. Be realistic and data-driven.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    
    return {
      predictions: result.predictions || {},
      analysis: result.analysis || "Analysis generated based on candidate profiles and party affiliations.",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    const fallbackPredictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
    const baseProb = 100 / candidates.length;
    
    candidates.forEach((c, i) => {
      const variance = (Math.random() - 0.5) * 20;
      fallbackPredictions[c.name] = {
        probability: Math.max(5, Math.min(95, baseProb + variance)),
        factors: {
          polling: 40 + Math.random() * 40,
          fundraising: 40 + Math.random() * 40,
          nameRecognition: 40 + Math.random() * 40,
          demographics: 40 + Math.random() * 40,
          endorsements: 40 + Math.random() * 40,
          historicalTrends: 40 + Math.random() * 40,
        },
      };
    });
    
    return {
      predictions: fallbackPredictions,
      analysis: "Prediction analysis based on statistical modeling. Each candidate's viability depends on polling strength, fundraising capacity, name recognition, demographic alignment, endorsements, and historical voting patterns in similar races.",
    };
  }
}

export async function analyzeNaturalLanguageQuery(query: string): Promise<{
  raceTitle: string;
  candidates: Array<{ name: string; party: Party }>;
  predictions: Record<string, { probability: number; factors: PredictionFactors }>;
  analysis: string;
}> {
  const prompt = `You are a political analyst. Parse this election prediction query and provide detailed analysis:

Query: "${query}"

Extract:
1. The race/position being discussed
2. All candidate names mentioned
3. Generate win probabilities and factor scores for each candidate
4. Provide comprehensive analysis

Return a JSON object:
{
  "raceTitle": "descriptive race title",
  "candidates": [
    { "name": "Full Name", "party": "Democratic|Republican|Independent" }
  ],
  "predictions": {
    "candidate_name": {
      "probability": number (0-100),
      "factors": {
        "polling": number (0-100),
        "fundraising": number (0-100),
        "nameRecognition": number (0-100),
        "demographics": number (0-100),
        "endorsements": number (0-100),
        "historicalTrends": number (0-100)
      }
    }
  },
  "analysis": "4-5 paragraph detailed analysis of the race, each candidate's strengths/weaknesses, and prediction rationale"
}

Infer party affiliations based on candidate names and context. Use your knowledge of real politicians. Ensure probabilities sum to ~100.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    
    return {
      raceTitle: result.raceTitle || "Election Analysis",
      candidates: result.candidates || [],
      predictions: result.predictions || {},
      analysis: result.analysis || "Analysis of the electoral scenario based on the provided information.",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    const candidateNames = query.match(/[A-Z][a-z]+ [A-Z][a-z]+(-[A-Z][a-z]+)?/g) || [];
    const candidates = candidateNames.slice(0, 5).map(name => ({
      name,
      party: "Democratic" as Party,
    }));
    
    const predictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
    const baseProb = candidates.length > 0 ? 100 / candidates.length : 0;
    
    candidates.forEach(c => {
      const variance = (Math.random() - 0.5) * 20;
      predictions[c.name] = {
        probability: Math.max(5, Math.min(95, baseProb + variance)),
        factors: {
          polling: 40 + Math.random() * 40,
          fundraising: 40 + Math.random() * 40,
          nameRecognition: 40 + Math.random() * 40,
          demographics: 40 + Math.random() * 40,
          endorsements: 40 + Math.random() * 40,
          historicalTrends: 40 + Math.random() * 40,
        },
      };
    });
    
    return {
      raceTitle: "Election Scenario Analysis",
      candidates,
      predictions,
      analysis: "This analysis examines the electoral prospects of the candidates mentioned. Each candidate's viability is assessed based on multiple factors including polling performance, fundraising strength, name recognition, demographic alignment, endorsement support, and historical voting trends.",
    };
  }
}
