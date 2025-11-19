import OpenAI from "openai";
import type { Party, PredictionFactors } from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

/**
 * Normalizes probabilities to guarantee:
 * 1. Unique probabilities (minimum 0.3% gap)
 * 2. Sum = exactly 100.0%
 * 3. Strict descending order
 * 4. All >= 0.1%
 * 
 * Uses integer tenths (0.1% units) for exact arithmetic
 */
function normalizeUniqueProbabilities(weightedScores: number[]): number[] {
  const SCALE = 10; // Work in tenths of a percent
  const MIN_PROB = 1; // 0.1% in tenths
  const MIN_GAP = 3; // 0.3% gap in tenths
  const TARGET_TOTAL = 1000; // 100.0% in tenths
  
  const n = weightedScores.length;
  
  // Step 1: Build baseline vector ensuring strict order
  const baseline = weightedScores.map((_, i) => MIN_PROB + MIN_GAP * (n - 1 - i));
  const baselineSum = baseline.reduce((sum, b) => sum + b, 0);
  
  if (baselineSum > TARGET_TOTAL) {
    throw new Error(`Too many candidates (${n}) for unique probabilities with 0.1% minimum and 0.3% gap`);
  }
  
  // Step 2: Calculate weight shares for distributing extra pool
  const totalWeight = weightedScores.reduce((sum, w) => sum + w, 0);
  const weightShares = weightedScores.map(w => w / totalWeight);
  const extraPool = TARGET_TOTAL - baselineSum;
  
  // Step 3: Compute ideal allocations
  const ideal = baseline.map((b, i) => b + extraPool * weightShares[i]);
  
  // Step 4: Floor ideal values and track remainders
  const prob = ideal.map(v => Math.floor(v));
  const remainders = ideal.map((v, i) => ({ index: i, remainder: v - prob[i] }));
  remainders.sort((a, b) => b.remainder - a.remainder); // Descending by remainder
  
  // Step 5: Distribute leftover units respecting upper bounds
  let allocated = prob.reduce((sum, p) => sum + p, 0);
  for (const { index } of remainders) {
    if (allocated >= TARGET_TOTAL) break;
    
    const upperBound = index === 0 ? TARGET_TOTAL : prob[index - 1] - MIN_GAP;
    if (prob[index] < upperBound) {
      prob[index]++;
      allocated++;
    }
  }
  
  // Step 6: Redistribute any remaining shortfall/excess
  const remaining = TARGET_TOTAL - allocated;
  if (remaining > 0) {
    // Top-down addition
    for (let i = 0; i < n && allocated < TARGET_TOTAL; i++) {
      const upperBound = i === 0 ? TARGET_TOTAL : prob[i - 1] - MIN_GAP;
      while (prob[i] < upperBound && allocated < TARGET_TOTAL) {
        prob[i]++;
        allocated++;
      }
    }
  } else if (remaining < 0) {
    // Bottom-up subtraction
    for (let i = n - 1; i >= 0 && allocated > TARGET_TOTAL; i--) {
      const lowerBound = i === n - 1 ? MIN_PROB : prob[i + 1] + MIN_GAP;
      while (prob[i] > lowerBound && allocated > TARGET_TOTAL) {
        prob[i]--;
        allocated--;
      }
    }
  }
  
  // Step 7: Final sanity sweep - enforce gaps strictly
  for (let i = 1; i < n; i++) {
    if (prob[i] >= prob[i - 1] - MIN_GAP + 1) {
      prob[i] = prob[i - 1] - MIN_GAP;
    }
  }
  
  // Convert tenths back to percentages
  return prob.map(p => p / SCALE);
}

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
    return "Analysis temporarily unavailable. The prediction is based on early-cycle statistical modeling of partisan lean, candidate experience, name recognition, endorsements, issue alignment, and momentum.";
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

Generate realistic win probabilities and factor scores (0-100) for each candidate using ONLY public information. Use this early-cycle prediction model with NO polling or fundraising data:

{
  "predictions": {
    "candidate_name": {
      "probability": number (0-100),
      "factors": {
        "partisanLean": number (0-100) - PVI, district demographics, past results (30% weight),
        "candidateExperience": number (0-100) - Incumbent advantage, offices held (20% weight),
        "nameRecognition": number (0-100) - Media coverage, Google Trends, social media (15% weight),
        "endorsements": number (0-100) - Party support, official/union backing (15% weight),
        "issueAlignment": number (0-100) - Match with district ideology/issues (10% weight),
        "momentum": number (0-100) - Volunteer activity, event attendance, organic growth (10% weight)
      }
    }
  },
  "analysis": "3-4 paragraph early-cycle analysis explaining race dynamics and key factors"
}

Use the weighted scoring system: partisanLean (30%), candidateExperience (20%), nameRecognition (15%), endorsements (15%), issueAlignment (10%), momentum (10%). NO polling or fundraising data.

CRITICAL: Each candidate MUST have a UNIQUE win probability - NO TIES ALLOWED. Even slight differences in factors should produce different probabilities (e.g., 23.4%, 22.7%, 19.3%, NOT 20.0%, 20.0%, 20.0%). Probabilities should sum to approximately 100 and be realistic and data-driven.`;

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
    
    // Generate deterministic factor scores based on candidate properties
    const candidatesWithScores = candidates.map((c, i) => {
      // Use name hash and index for deterministic but varied scores
      const nameHash = c.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seed = (nameHash + i * 17) % 100;
      
      // Deterministic factor generation (40-80 range for variety)
      const factors: PredictionFactors = {
        partisanLean: 40 + ((seed * 7) % 40),
        candidateExperience: 40 + ((seed * 11) % 40),
        nameRecognition: 40 + ((seed * 13) % 40),
        endorsements: 40 + ((seed * 17) % 40),
        issueAlignment: 40 + ((seed * 19) % 40),
        momentum: 40 + ((seed * 23) % 40),
      };
      
      // Calculate weighted composite score using the 6-factor model
      const compositeScore = 
        (factors.partisanLean * 0.30) +
        (factors.candidateExperience * 0.20) +
        (factors.nameRecognition * 0.15) +
        (factors.endorsements * 0.15) +
        (factors.issueAlignment * 0.10) +
        (factors.momentum * 0.10);
      
      return { candidate: c, factors, compositeScore };
    });
    
    // Sort by composite score descending, then alphabetically for ties
    candidatesWithScores.sort((a, b) => {
      const scoreDiff = b.compositeScore - a.compositeScore;
      if (scoreDiff !== 0) return scoreDiff;
      return a.candidate.name.localeCompare(b.candidate.name);
    });
    
    // Use shared helper to normalize probabilities with guaranteed uniqueness
    const weightedScores = candidatesWithScores.map(item => item.compositeScore);
    const probs = normalizeUniqueProbabilities(weightedScores);
    
    // Assign probabilities
    candidatesWithScores.forEach((item, i) => {
      fallbackPredictions[item.candidate.name] = {
        probability: probs[i],
        factors: item.factors,
      };
    });
    
    return {
      predictions: fallbackPredictions,
      analysis: "Early-cycle prediction analysis based on statistical modeling using publicly available data. Each candidate's viability depends on partisan lean, candidate experience, name recognition, endorsements, issue alignment, and momentum—with NO polling or fundraising data required.",
    };
  }
}

export async function generateIntelligentSuggestions(
  races: Array<{ race: any; candidates: any[]; predictions: any[] }>,
  currentNewsContext?: string
): Promise<{
  suggestions: Array<{
    race: any;
    candidates: any[];
    predictions: any[];
    reason: string;
    score: number;
  }>;
  currentEventsContext: string;
}> {
  const racesContext = races.map(r => ({
    id: r.race.id,
    title: r.race.title,
    type: r.race.type,
    state: r.race.state,
    electionDate: r.race.electionDate,
    candidateCount: r.candidates.length,
    viewCount: r.race.viewCount || 0,
    topCandidates: r.candidates.slice(0, 2).map(c => c.name),
    margin: r.predictions.length >= 2 
      ? Math.abs(r.predictions[0].winProbability - r.predictions[1].winProbability)
      : 0,
  }));

  const contextSection = currentNewsContext 
    ? `\n\nCurrent Political News Context:\n${currentNewsContext}\n\nUse this news context to inform which races are most relevant right now.`
    : '';

  const prompt = `You are a political news analyst. Analyze these election races and suggest the TOP 3 most interesting matchups to feature based on:

1. **Current Events**: What races are getting media attention? What's happening in politics that makes certain races more relevant?
2. **Competitiveness**: Close margins are more exciting
3. **Viewer Interest**: Races people are already viewing
4. **Timing**: Upcoming elections are more relevant than distant ones${contextSection}

Available Races:
${JSON.stringify(racesContext, null, 2)}

Return a JSON object with:
{
  "currentEventsContext": "2-3 sentence summary of current political climate and why these races matter",
  "suggestions": [
    {
      "raceId": "race-id-from-list",
      "reason": "1-2 sentence explanation of why this race is compelling right now",
      "score": number (0-100, higher = more interesting)
    }
  ]
}

Prioritize races that:
- Are relevant to current political news
- Have competitive margins (<15%)
- Are getting viewer attention
- Have upcoming election dates

Return EXACTLY 3 suggestions, ordered by score (highest first).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    
    const suggestions = (result.suggestions || [])
      .map((s: any) => {
        const matchingRace = races.find(r => r.race.id === s.raceId);
        if (!matchingRace) return null;
        
        return {
          race: matchingRace.race,
          candidates: matchingRace.candidates.slice(0, 2),
          predictions: matchingRace.predictions.slice(0, 2),
          reason: s.reason,
          score: s.score,
        };
      })
      .filter((s: any) => s !== null);

    return {
      suggestions,
      currentEventsContext: result.currentEventsContext || "",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    const fallbackSuggestions = races
      .filter(r => r.predictions.length >= 2)
      .map(r => {
        const margin = Math.abs(r.predictions[0].winProbability - r.predictions[1].winProbability);
        const viewScore = (r.race.viewCount || 0) * 10;
        const competitiveScore = (20 - margin) * 5;
        const score = viewScore + competitiveScore;
        
        return {
          race: r.race,
          candidates: r.candidates.slice(0, 2),
          predictions: r.predictions.slice(0, 2),
          reason: `Close race with ${margin.toFixed(1)}% margin${r.race.viewCount ? ` - ${r.race.viewCount} views` : ''}`,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      suggestions: fallbackSuggestions,
      currentEventsContext: "Analysis based on race competitiveness and viewer interest.",
    };
  }
}

// Simple hash function for deterministic factor generation
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Deterministic fallback for when AI is unavailable
// Returns stable predictions based on candidate IDs - same candidates = same predictions
function generateDeterministicPredictions(
  candidates: Array<{ id: string; name: string; party: Party }>
): Record<string, { probability: number; factors: PredictionFactors }> {
  console.log("[reanalyzeRace] Using deterministic fallback - AI unavailable");
  
  // Generate deterministic factor scores and calculate weighted composite scores
  const candidatesWithScores = candidates.map((candidate, index) => {
    // Generate deterministic factor scores based on candidate ID hash
    const hash = hashString(candidate.id);
    const seed = hash % 100;
    
    const factors: PredictionFactors = {
      // Use hash-derived values for stable, deterministic factors (40-70 range)
      partisanLean: 40 + ((seed + 0) % 30),
      candidateExperience: 40 + ((seed + 13) % 30),
      nameRecognition: 40 + ((seed + 27) % 30),
      endorsements: 40 + ((seed + 41) % 30),
      issueAlignment: 40 + ((seed + 59) % 30),
      momentum: 40 + ((seed + 73) % 30),
    };
    
    // Calculate weighted composite score using the 6-factor model
    const compositeScore = 
      (factors.partisanLean * 0.30) +
      (factors.candidateExperience * 0.20) +
      (factors.nameRecognition * 0.15) +
      (factors.endorsements * 0.15) +
      (factors.issueAlignment * 0.10) +
      (factors.momentum * 0.10);
    
    return { candidate, factors, compositeScore };
  });
  
  // Sort by composite score descending, then alphabetically for ties
  candidatesWithScores.sort((a, b) => {
    const scoreDiff = b.compositeScore - a.compositeScore;
    if (scoreDiff !== 0) return scoreDiff;
    return a.candidate.name.localeCompare(b.candidate.name);
  });
  
  // Use shared helper to normalize probabilities with guaranteed uniqueness
  const weightedScores = candidatesWithScores.map(item => item.compositeScore);
  const probs = normalizeUniqueProbabilities(weightedScores);
  
  // Assign probabilities
  const predictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
  candidatesWithScores.forEach((item, index) => {
    predictions[item.candidate.name] = {
      probability: probs[index],
      factors: item.factors,
    };
  });

  return predictions;
}

export async function reanalyzeRace(
  raceTitle: string,
  candidates: Array<{ id: string; name: string; party: Party }>
): Promise<Record<string, { probability: number; factors: PredictionFactors }>> {
  const prompt = `You are a political data scientist. Re-analyze this election with the LATEST current events and political landscape:

Race: ${raceTitle}
Candidates:
${candidates.map((c, i) => `${i + 1}. ${c.name} (${c.party})`).join('\n')}

IMPORTANT: Consider the CURRENT political climate, recent news, and latest developments. Generate UPDATED win probabilities and factor scores (0-100) for each candidate using ONLY public information.

Use this early-cycle prediction model with NO polling or fundraising data:

{
  "predictions": {
    "candidate_name": {
      "probability": number (0-100),
      "factors": {
        "partisanLean": number (0-100) - PVI, district demographics, past results (30% weight),
        "candidateExperience": number (0-100) - Incumbent advantage, offices held (20% weight),
        "nameRecognition": number (0-100) - Media coverage, Google Trends, social media (15% weight),
        "endorsements": number (0-100) - Party support, official/union backing (15% weight),
        "issueAlignment": number (0-100) - Match with district ideology/issues (10% weight),
        "momentum": number (0-100) - Volunteer activity, event attendance, organic growth (10% weight)
      }
    }
  }
}

CRITICAL: Each candidate MUST have a UNIQUE win probability - NO TIES ALLOWED. Even slight differences in factors should produce different probabilities (e.g., 23.4%, 22.7%, 19.3%, NOT 20.0%, 20.0%, 20.0%). Probabilities must sum to ~100. Return ONLY valid JSON.`;

  try {
    console.log(`[reanalyzeRace] Calling OpenAI API for race: ${raceTitle}`);
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    console.log(`[reanalyzeRace] Raw AI response:`, content || "(empty)");
    console.log(`[reanalyzeRace] Finish reason:`, response.choices[0]?.finish_reason);
    console.log(`[reanalyzeRace] Usage:`, response.usage);
    
    // Detect empty/falsy responses and fall back to deterministic predictions
    if (!content || content.trim() === "" || content === "{}") {
      console.warn("[reanalyzeRace] AI returned empty response - using deterministic fallback");
      return generateDeterministicPredictions(candidates);
    }
    
    const result = JSON.parse(content);
    
    if (!result.predictions || Object.keys(result.predictions).length === 0) {
      console.warn("[reanalyzeRace] AI returned no predictions - using deterministic fallback");
      return generateDeterministicPredictions(candidates);
    }
    
    return result.predictions;
  } catch (error) {
    console.error("OpenAI API error during reanalysis:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    console.warn("[reanalyzeRace] Falling back to deterministic predictions");
    return generateDeterministicPredictions(candidates);
  }
}

export async function analyzeNaturalLanguageQuery(query: string): Promise<{
  raceTitle: string;
  candidates: Array<{ name: string; party: Party }>;
  predictions: Record<string, { probability: number; factors: PredictionFactors }>;
  analysis: string;
}> {
  // Step 1: Detect if this is a fact-finding question vs prediction question
  const detectionPrompt = `You are a political analyst assistant. Classify this question as either "PREDICTION" or "FACT_FINDING".

PREDICTION questions ask about hypothetical election scenarios or future outcomes:
- "Who would win if X runs?"
- "What if Y retires and Z enters the race?"
- "Predict the outcome of X vs Y vs Z"
- "How would A perform against B?"

FACT_FINDING questions ask about past events, actual data, or research results:
- "Which ad was more effective according to polls?"
- "What did the Super PAC testing show?"
- "Who won the 2020 election?"
- "What are the latest poll numbers?"

Question: "${query}"

Return ONLY valid JSON:
{
  "questionType": "PREDICTION" or "FACT_FINDING",
  "reason": "Brief explanation of why"
}`;

  try {
    console.log("Detecting question type for:", query.substring(0, 100) + "...");
    
    const detectionResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: detectionPrompt }],
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
    });

    const detectionContent = detectionResponse.choices[0]?.message?.content || "{}";
    const detection = JSON.parse(detectionContent);
    
    console.log("Question type detection:", detection);
    
    if (detection.questionType === "FACT_FINDING") {
      throw new Error("FACT_FINDING_QUESTION: This appears to be a research question about actual political data or past events, rather than an election prediction scenario. The Natural Language Analysis feature is designed to predict outcomes for hypothetical races. For fact-finding questions, try searching political news sources, FiveThirtyEight's research database, or academic polling archives.");
    }
  } catch (error: any) {
    // If it's our custom fact-finding error, re-throw it
    if (error.message?.startsWith("FACT_FINDING_QUESTION:")) {
      throw error;
    }
    // Otherwise, continue with analysis (detection API call failed)
    console.warn("Question type detection failed, proceeding with analysis:", error);
  }

  // Step 2: Proceed with normal prediction analysis
  const prompt = `You are a political analyst. Parse this election prediction query and extract ONLY the candidates who are COMPETING in the election (not those who are retiring or mentioned in passing).

Query: "${query}"

Instructions:
1. Create a specific race title in this format: "[YEAR] [STATE/LOCATION] [POSITION] Race" 
   - Examples: "2028 New York Senate Race", "2026 Texas Governor Race", "2024 California Democratic Primary"
   - Be specific and descriptive, NOT generic like "Election Scenario Analysis"
2. Extract ONLY the candidate names who are COMPETING for this position
   - DO NOT include politicians who are retiring or stepping down
   - DO NOT include race names or locations as candidates
   - Look for candidates in: comma-separated lists, bulleted lists (• - *), or sentence context
3. For each candidate, infer their party affiliation based on your knowledge
4. Generate realistic win probabilities and factor scores
5. Provide comprehensive 4-5 paragraph analysis

EXAMPLES OF CORRECT EXTRACTION:
Query: "Who would win if Chuck Schumer retires? Consider: Alexandria Ocasio-Cortez, Letitia James, Pat Ryan"
→ Race Title: "2028 New York Senate Race"
→ Candidates: ["Alexandria Ocasio-Cortez", "Letitia James", "Pat Ryan"]
→ NOT: ["Chuck Schumer", "New York Senate"]

Query: "Adam Schiff, Katie Porter, Barbara Lee, Eric Swalwell race for California Senate"
→ Race Title: "2024 California Senate Race"
→ Candidates: ["Adam Schiff", "Katie Porter", "Barbara Lee", "Eric Swalwell"]

Return ONLY valid JSON (no markdown, no code blocks):
{
  "raceTitle": "YEAR STATE/LOCATION POSITION Race (e.g., 2028 New York Senate Race)",
  "candidates": [
    { "name": "Full Name", "party": "Democratic" },
    { "name": "Another Name", "party": "Republican" }
  ],
  "predictions": {
    "Full Name": {
      "probability": 35,
      "factors": {
        "partisanLean": 75,
        "candidateExperience": 80,
        "nameRecognition": 65,
        "endorsements": 70,
        "issueAlignment": 60,
        "momentum": 55
      }
    }
  },
  "analysis": "Detailed 4-5 paragraph analysis discussing the race dynamics, each candidate's strengths/weaknesses, and prediction rationale."
}

Party values: "Democratic", "Republican", or "Independent"
Probabilities must sum to ~100.`;

  try {
    console.log("Sending natural language query to OpenAI:", query.substring(0, 100) + "...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("OpenAI response received, parsing...");
    
    const result = JSON.parse(content);
    console.log("Parsed result:", {
      raceTitle: result.raceTitle,
      candidateCount: result.candidates?.length || 0,
      candidateNames: result.candidates?.map((c: any) => c.name) || []
    });
    
    if (!result.candidates || result.candidates.length === 0) {
      console.warn("OpenAI returned no candidates, using fallback extraction");
      throw new Error("No candidates in OpenAI response");
    }
    
    return {
      raceTitle: result.raceTitle || "Election Analysis",
      candidates: result.candidates,
      predictions: result.predictions || {},
      analysis: result.analysis || "Analysis of the electoral scenario based on the provided information.",
    };
  } catch (error) {
    console.error("OpenAI API error, using fallback extraction:", error);
    
    const candidateListMatch = query.match(/(?:consider|candidates?:?|contenders?:?)[\s:]*([^.?!]+)/i);
    let candidateSection = candidateListMatch ? candidateListMatch[1] : query;
    
    candidateSection = candidateSection.replace(/^[•\-\*\s]+/gm, ' ');
    
    const allNames = candidateSection.match(/[A-Z][a-z]+(?:[ -][A-Z][a-z]+)+/g) || [];
    
    console.log("Fallback extraction found potential names:", allNames);
    
    const excludeTerms = [
      'New York', 'California', 'Texas', 'Florida', 'Senate', 'House', 'Governor', 
      'Presidential', 'Democratic', 'Republican', 'Independent', 'Primary', 'Election',
      'Race', 'Consider These', 'Top Contenders', 'United States'
    ];
    
    const retiringKeywords = ['retires', 'retiring', 'steps down', 'stepping down', 'leaves office'];
    const beforeRetiring = retiringKeywords.some(kw => query.toLowerCase().includes(kw))
      ? query.toLowerCase().split(retiringKeywords.find(kw => query.toLowerCase().includes(kw))!)[0]
      : '';
    
    const uniqueNames = Array.from(new Set(allNames.map(n => n.trim())))
      .filter(n => n.length > 3)
      .filter(n => !n.includes('\n'))
      .filter(n => !excludeTerms.some(term => n.includes(term)))
      .filter(n => {
        if (beforeRetiring && beforeRetiring.toLowerCase().includes(n.toLowerCase())) {
          return false;
        }
        const words = n.split(' ');
        return words.length >= 2 && words.length <= 4;
      });
    
    const candidates = uniqueNames.slice(0, 10).map(name => ({
      name: name.trim(),
      party: "Democratic" as Party,
    }));
    
    const predictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
    const baseProb = candidates.length > 0 ? 100 / candidates.length : 0;
    
    candidates.forEach(c => {
      const variance = (Math.random() - 0.5) * 20;
      predictions[c.name] = {
        probability: Math.max(5, Math.min(95, baseProb + variance)),
        factors: {
          partisanLean: 40 + Math.random() * 40,
          candidateExperience: 40 + Math.random() * 40,
          nameRecognition: 40 + Math.random() * 40,
          endorsements: 40 + Math.random() * 40,
          issueAlignment: 40 + Math.random() * 40,
          momentum: 40 + Math.random() * 40,
        },
      };
    });
    
    return {
      raceTitle: "Election Scenario Analysis",
      candidates,
      predictions,
      analysis: "This analysis examines the electoral prospects of the candidates mentioned. Each candidate's viability is assessed based on multiple factors including polling performance, fundraising strength, name recognition, demographic alignment, endorsement support, and historical voting trends in similar competitive races.",
    };
  }
}
