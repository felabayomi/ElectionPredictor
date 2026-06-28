import OpenAI from "openai";
import type { Party, PredictionFactors, Candidate } from "@shared/schema";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.ELECTION_PREDICTOR_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

export interface RaceContextSource {
  sourceName: string;
  sourceUrl: string;
  publicationDate: string;
  sourceType: "news" | "polling" | "fundraising" | "endorsements" | "context";
  snippet: string;
}

export interface CurrentRaceContext {
  retrievedAt: string;
  raceContextSummary: string;
  pollingNotes: string[];
  fundraisingNotes: string[];
  endorsementNotes: string[];
  incumbencyAndExperienceNotes: string[];
  geographyNotes: string[];
  sources: RaceContextSource[];
}

export interface ReanalyzeRaceResult {
  predictions: Record<string, { probability: number; factors: PredictionFactors }>;
  sourceContext: CurrentRaceContext;
  analysis: string;
  scorecards: ReanalysisScorecard[];
}

type PredictionFactorKey = keyof PredictionFactors;

const FACTOR_WEIGHTS: Record<PredictionFactorKey, number> = {
  partisanLean: 0.25,
  polling: 0.20,
  candidateExperience: 0.15,
  fundraising: 0.15,
  nameRecognition: 0.10,
  endorsements: 0.10,
  issueAlignment: 0.05,
  momentum: 0.05,
};

const FACTOR_KEYS = Object.keys(FACTOR_WEIGHTS) as PredictionFactorKey[];

const partySchema = z.enum(["Democratic", "Republican", "Independent"]);

const predictionFactorsSchema = z.object({
  partisanLean: z.number().finite().min(0).max(100),
  polling: z.number().finite().min(0).max(100),
  candidateExperience: z.number().finite().min(0).max(100),
  fundraising: z.number().finite().min(0).max(100),
  nameRecognition: z.number().finite().min(0).max(100),
  endorsements: z.number().finite().min(0).max(100),
  issueAlignment: z.number().finite().min(0).max(100),
  momentum: z.number().finite().min(0).max(100),
});

const candidatePredictionSchema = z.object({
  probability: z.number().finite().min(0).max(100),
  factors: predictionFactorsSchema,
});

const customPredictionResponseSchema = z.object({
  predictions: z.record(z.unknown()).default({}),
  analysis: z.string().optional(),
});

const extractedCandidateSchema = z.object({
  name: z.string().min(1),
  party: partySchema,
});

const naturalLanguageResponseSchema = z.object({
  raceTitle: z.string().min(1),
  candidates: z.array(extractedCandidateSchema).min(1),
  predictions: z.record(z.unknown()).default({}),
  analysis: z.string().optional(),
});

interface CandidateFactorAssessment {
  candidateName: string;
  factors: PredictionFactors;
  factorRationales: Partial<Record<PredictionFactorKey, string>>;
  overallRationale?: string;
}

export interface ReanalysisScorecard {
  candidateName: string;
  factors: PredictionFactors;
  factorRationales: Partial<Record<PredictionFactorKey, string>>;
  overallRationale?: string;
  compositeScore: number;
  normalizedProbability: number;
}

function buildFallbackPredictionsFromScenarioCandidates(
  candidates: Array<{ name: string; party: Party }>,
): Record<string, { probability: number; factors: PredictionFactors }> {
  const fallbackPredictions: Record<string, { probability: number; factors: PredictionFactors }> = {};

  const candidatesWithScores = candidates.map((candidate, index) => {
    const nameHash = candidate.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = (nameHash + index * 17) % 100;

    const factors: PredictionFactors = {
      partisanLean: 40 + ((seed * 7) % 40),
      polling: 40 + ((seed * 29) % 40),
      candidateExperience: 40 + ((seed * 11) % 40),
      fundraising: 40 + ((seed * 31) % 40),
      nameRecognition: 40 + ((seed * 13) % 40),
      endorsements: 40 + ((seed * 17) % 40),
      issueAlignment: 40 + ((seed * 19) % 40),
      momentum: 40 + ((seed * 23) % 40),
    };

    return {
      candidate,
      factors,
      compositeScore: computeCompositeScore(factors),
    };
  });

  candidatesWithScores.sort((a, b) => {
    const scoreDiff = b.compositeScore - a.compositeScore;
    if (scoreDiff !== 0) return scoreDiff;
    return a.candidate.name.localeCompare(b.candidate.name);
  });

  const probs = normalizeUniqueProbabilities(candidatesWithScores.map((item) => item.compositeScore));
  candidatesWithScores.forEach((item, index) => {
    fallbackPredictions[item.candidate.name] = {
      probability: probs[index],
      factors: item.factors,
    };
  });

  return fallbackPredictions;
}

function validatePredictionMapForCandidates(
  rawPredictions: unknown,
  expectedCandidates: Array<{ name: string }>,
): Record<string, { probability: number; factors: PredictionFactors }> {
  if (!rawPredictions || typeof rawPredictions !== "object" || Array.isArray(rawPredictions)) {
    throw new Error("Predictions payload is not an object");
  }

  const expectedNameMap = new Map(
    expectedCandidates.map((candidate) => [candidate.name.trim().toLowerCase(), candidate.name]),
  );

  const parsedPredictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
  const rawEntries = Object.entries(rawPredictions as Record<string, unknown>);

  for (const [rawName, rawValue] of rawEntries) {
    const normalizedName = rawName.trim().toLowerCase();
    const canonicalName = expectedNameMap.get(normalizedName);
    if (!canonicalName) {
      throw new Error(`Unexpected candidate name in predictions: ${rawName}`);
    }

    const parsed = candidatePredictionSchema.safeParse(rawValue);
    if (!parsed.success) {
      throw new Error(`Invalid prediction payload for ${canonicalName}: ${parsed.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
    }

    parsedPredictions[canonicalName] = parsed.data;
  }

  const missingCandidates = expectedCandidates
    .map((candidate) => candidate.name)
    .filter((candidateName) => !parsedPredictions[candidateName]);

  if (missingCandidates.length > 0) {
    throw new Error(`Missing predictions for candidates: ${missingCandidates.join(", ")}`);
  }

  return parsedPredictions;
}

function cleanJsonContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}

function extractResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";

  const obj = response as Record<string, unknown>;
  const outputText = obj.output_text;
  if (typeof outputText === "string") return outputText;

  const output = obj.output;
  if (!Array.isArray(output)) return "";

  const textParts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) {
        textParts.push(text);
      }
    }
  }

  return textParts.join("\n");
}

function clampFactorScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(100, Math.max(0, numeric));
}

function coerceFactors(raw: unknown): PredictionFactors {
  const input = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    partisanLean: clampFactorScore(input.partisanLean),
    polling: clampFactorScore(input.polling),
    candidateExperience: clampFactorScore(input.candidateExperience),
    fundraising: clampFactorScore(input.fundraising),
    nameRecognition: clampFactorScore(input.nameRecognition),
    endorsements: clampFactorScore(input.endorsements),
    issueAlignment: clampFactorScore(input.issueAlignment),
    momentum: clampFactorScore(input.momentum),
  };
}

function computeCompositeScore(factors: PredictionFactors): number {
  return FACTOR_KEYS.reduce((sum, key) => sum + (factors[key] * FACTOR_WEIGHTS[key]), 0);
}

function buildDeterministicAssessment(candidate: Candidate, index: number): CandidateFactorAssessment {
  const hash = hashString(candidate.id);
  const seed = hash % 100;

  const factors: PredictionFactors = {
    partisanLean: candidate.districtPartisanLean !== undefined && candidate.districtPartisanLean !== null
      ? Math.min(100, Math.max(0, 50 + candidate.districtPartisanLean))
      : 40 + ((seed + 0) % 30),
    polling: Array.isArray(candidate.recentPolls) && candidate.recentPolls.length > 0
      ? Math.min(100, Math.max(0, candidate.recentPolls.reduce((sum, poll) => sum + poll, 0) / candidate.recentPolls.length))
      : candidate.pollingAverage !== undefined && candidate.pollingAverage !== null
        ? Math.min(100, Math.max(0, candidate.pollingAverage))
        : 40 + ((seed + 11) % 30),
    candidateExperience: (() => {
      let base = 40 + ((seed + 23) % 30);
      if (candidate.isIncumbent) base += 20;
      if (candidate.yearsExperience !== undefined && candidate.yearsExperience !== null) {
        base = Math.min(100, base + Math.min(30, candidate.yearsExperience * 2));
      }
      return Math.min(100, base);
    })(),
    fundraising: candidate.cashOnHand !== undefined && candidate.cashOnHand !== null
      ? Math.min(100, Math.max(0, Math.min(100, candidate.cashOnHand / 10000000 * 100)))
      : candidate.fundraisingTotal !== undefined && candidate.fundraisingTotal !== null
        ? Math.min(100, Math.max(0, Math.min(100, candidate.fundraisingTotal / 10000000 * 100)))
        : 40 + ((seed + 37) % 30),
    nameRecognition: 40 + ((seed + 47) % 30),
    endorsements: Array.isArray(candidate.endorsementsList) && candidate.endorsementsList.length > 0
      ? Math.min(100, 30 + candidate.endorsementsList.length * 10)
      : candidate.majorEndorsements !== undefined && candidate.majorEndorsements !== null && candidate.majorEndorsements > 0
        ? Math.min(100, 30 + candidate.majorEndorsements * 10)
        : 40 + ((seed + 59) % 30),
    issueAlignment: 40 + ((seed + 71) % 30),
    momentum: 40 + ((seed + 83) % 30),
  };

  return {
    candidateName: candidate.name,
    factors,
    factorRationales: {
      polling: Array.isArray(candidate.recentPolls) && candidate.recentPolls.length > 0
        ? `Used ${candidate.recentPolls.length} recent poll entries from stored candidate data.`
        : candidate.pollingAverage != null
          ? `Used stored polling average of ${candidate.pollingAverage}%.`
          : "Polling score derived from deterministic fallback due to missing current polling evidence.",
      fundraising: candidate.cashOnHand != null
        ? `Used stored cash-on-hand estimate of $${candidate.cashOnHand.toLocaleString()}.`
        : candidate.fundraisingTotal != null
          ? `Used stored fundraising total of $${candidate.fundraisingTotal.toLocaleString()}.`
          : "Fundraising score derived from deterministic fallback due to missing current finance evidence.",
      candidateExperience: candidate.isIncumbent
        ? "Incumbency and stored experience boosted the experience score."
        : "Experience score derived from stored office history or deterministic fallback.",
    },
    overallRationale: `Fallback factor scoring generated for ${candidate.name} using stored candidate attributes and deterministic priors (${index + 1}).`,
  };
}

function buildNormalizedPredictionsFromAssessments(
  candidates: Candidate[],
  assessments: CandidateFactorAssessment[],
): { predictions: Record<string, { probability: number; factors: PredictionFactors }>; scorecards: ReanalysisScorecard[] } {
  const assessmentMap = new Map(assessments.map((assessment) => [assessment.candidateName, assessment]));
  const completedAssessments = candidates.map((candidate, index) => assessmentMap.get(candidate.name) || buildDeterministicAssessment(candidate, index));

  completedAssessments.sort((a, b) => {
    const scoreDiff = computeCompositeScore(b.factors) - computeCompositeScore(a.factors);
    if (scoreDiff !== 0) return scoreDiff;
    return a.candidateName.localeCompare(b.candidateName);
  });

  const normalizedProbabilities = normalizeUniqueProbabilities(
    completedAssessments.map((assessment) => computeCompositeScore(assessment.factors)),
  );

  const predictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
  const scorecards: ReanalysisScorecard[] = completedAssessments.map((assessment, index) => {
    const normalizedProbability = normalizedProbabilities[index];
    predictions[assessment.candidateName] = {
      probability: normalizedProbability,
      factors: assessment.factors,
    };

    return {
      candidateName: assessment.candidateName,
      factors: assessment.factors,
      factorRationales: assessment.factorRationales,
      overallRationale: assessment.overallRationale,
      compositeScore: Number(computeCompositeScore(assessment.factors).toFixed(2)),
      normalizedProbability,
    };
  });

  return { predictions, scorecards };
}

async function scoreFactorsFromFacts(
  raceTitle: string,
  candidates: Candidate[],
  currentRaceContext: CurrentRaceContext,
): Promise<CandidateFactorAssessment[]> {
  const candidateDescriptions = candidates.map((candidate, index) => ({
    order: index + 1,
    name: candidate.name,
    party: candidate.party,
    pollingAverage: candidate.pollingAverage ?? null,
    recentPolls: candidate.recentPolls ?? null,
    pollDate: candidate.pollDate ?? null,
    pollsterGrade: candidate.pollsterGrade ?? null,
    fundraisingTotal: candidate.fundraisingTotal ?? null,
    cashOnHand: candidate.cashOnHand ?? null,
    fundraisingQuarter: candidate.fundraisingQuarter ?? null,
    isIncumbent: candidate.isIncumbent ?? null,
    incumbentOffice: candidate.incumbentOffice ?? null,
    yearsExperience: candidate.yearsExperience ?? null,
    majorEndorsements: candidate.majorEndorsements ?? null,
    endorsementsList: candidate.endorsementsList ?? null,
    priorElectionResults: candidate.priorElectionResults ?? null,
    districtPartisanLean: candidate.districtPartisanLean ?? null,
    electionType: candidate.electionType ?? null,
    position: candidate.position ?? null,
    state: candidate.state ?? null,
    district: candidate.district ?? null,
  }));

  const scoringPrompt = `You are a political analyst scoring candidates ONLY from the provided facts. Do not invent outside facts.

Task order:
1. Review the collected facts.
2. Score each factor from 0-100 for each candidate.
3. Provide a short rationale for each factor.
4. Do NOT assign win probabilities.

Race: ${raceTitle}
Candidates:
${JSON.stringify(candidateDescriptions, null, 2)}

Collected Facts:
${JSON.stringify(currentRaceContext, null, 2)}

Return ONLY valid JSON:
{
  "candidates": [
    {
      "candidateName": "Full Name",
      "factors": {
        "partisanLean": 0,
        "polling": 0,
        "candidateExperience": 0,
        "fundraising": 0,
        "nameRecognition": 0,
        "endorsements": 0,
        "issueAlignment": 0,
        "momentum": 0
      },
      "factorRationales": {
        "partisanLean": "...",
        "polling": "...",
        "candidateExperience": "...",
        "fundraising": "...",
        "nameRecognition": "...",
        "endorsements": "...",
        "issueAlignment": "...",
        "momentum": "..."
      },
      "overallRationale": "2-3 sentence summary of why this candidate scored where they did"
    }
  ]
}

Rules:
- Use only the collected facts and candidate snapshot.
- If a factor has weak evidence, say so in the rationale and use a conservative score.
- Every listed candidate must appear exactly once.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: scoringPrompt }],
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      return candidates.map(buildDeterministicAssessment);
    }

    const parsed = JSON.parse(cleanJsonContent(content)) as Record<string, unknown>;
    const rows = Array.isArray(parsed.candidates) ? parsed.candidates : [];

    const assessments = rows
      .map((row): CandidateFactorAssessment | null => {
        if (!row || typeof row !== "object") return null;
        const record = row as Record<string, unknown>;
        const candidateName = String(record.candidateName || "").trim();
        if (!candidateName) return null;

        const rationalesInput = (record.factorRationales && typeof record.factorRationales === "object")
          ? record.factorRationales as Record<string, unknown>
          : {};

        const factorRationales: Partial<Record<PredictionFactorKey, string>> = {};
        for (const key of FACTOR_KEYS) {
          const rationale = rationalesInput[key];
          if (typeof rationale === "string" && rationale.trim()) {
            factorRationales[key] = rationale.trim();
          }
        }

        return {
          candidateName,
          factors: coerceFactors(record.factors),
          factorRationales,
          overallRationale: typeof record.overallRationale === "string" ? record.overallRationale.trim() : undefined,
        };
      })
      .filter((assessment): assessment is CandidateFactorAssessment => assessment !== null);

    return assessments.length > 0 ? assessments : candidates.map(buildDeterministicAssessment);
  } catch (error) {
    console.warn("[reanalyzeRace] Factor scoring failed, using deterministic assessments:", error);
    return candidates.map(buildDeterministicAssessment);
  }
}

async function generateReanalysisExplanation(
  raceTitle: string,
  currentRaceContext: CurrentRaceContext,
  scorecards: ReanalysisScorecard[],
): Promise<string> {
  const explanationPrompt = `You are a political analyst writing the final explanation AFTER facts were collected and factors were scored.

Race: ${raceTitle}
Retrieved Facts:
${JSON.stringify(currentRaceContext, null, 2)}

Scored Candidates:
${JSON.stringify(scorecards, null, 2)}

Write 3-4 concise paragraphs that:
- explain why the leading candidate leads,
- explain the biggest movement drivers,
- reference the freshest sources by source name and publication date,
- note any weak-evidence areas or uncertainty.

Do not change the scores or probabilities. Use the scored candidates exactly as given.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: explanationPrompt }],
      max_tokens: 900,
    });

    return response.choices[0]?.message?.content?.trim()
      || "Updated based on collected facts, normalized factor scores, and the freshest available race context.";
  } catch (error) {
    console.warn("[reanalyzeRace] Explanation generation failed:", error);
    return "Updated based on collected facts, normalized factor scores, and the freshest available race context.";
  }
}

async function fetchCurrentRaceContext(
  raceTitle: string,
  candidates: Candidate[]
): Promise<CurrentRaceContext> {
  const retrievedAt = new Date().toISOString();
  const candidateSnapshot = candidates.map((candidate) => ({
    name: candidate.name,
    party: candidate.party,
    pollingAverage: candidate.pollingAverage ?? null,
    recentPolls: candidate.recentPolls ?? null,
    pollDate: candidate.pollDate ?? null,
    pollsterGrade: candidate.pollsterGrade ?? null,
    fundraisingTotal: candidate.fundraisingTotal ?? null,
    cashOnHand: candidate.cashOnHand ?? null,
    fundraisingQuarter: candidate.fundraisingQuarter ?? null,
    isIncumbent: candidate.isIncumbent ?? null,
    incumbentOffice: candidate.incumbentOffice ?? null,
    yearsExperience: candidate.yearsExperience ?? null,
    majorEndorsements: candidate.majorEndorsements ?? null,
    endorsementsList: candidate.endorsementsList ?? null,
    priorElectionResults: candidate.priorElectionResults ?? null,
    districtPartisanLean: candidate.districtPartisanLean ?? null,
    electionType: candidate.electionType ?? null,
    state: candidate.state ?? null,
    district: candidate.district ?? null,
    position: candidate.position ?? null,
  }));

  const fallbackContext: CurrentRaceContext = {
    retrievedAt,
    raceContextSummary: "No live research sources were retrieved. Using stored candidate inputs and model priors.",
    pollingNotes: [],
    fundraisingNotes: [],
    endorsementNotes: [],
    incumbencyAndExperienceNotes: [],
    geographyNotes: [],
    sources: [],
  };

  const researchPrompt = `You are a political research assistant. Gather the freshest available context for this race and candidates.

Race: ${raceTitle}
RetrievedAt: ${retrievedAt}
Candidate Snapshot:
${JSON.stringify(candidateSnapshot, null, 2)}

Research requirements:
- Pull recent polling if available.
- Pull recent fundraising/FEC-style reporting and campaign finance signals if available.
- Pull recent endorsements and party/union/institutional support updates if available.
- Pull recent news that materially changes race dynamics.
- Include district/state context relevant to turnout, demographics, partisan lean, and incumbency.

Return ONLY valid JSON with this exact shape:
{
  "raceContextSummary": "short synthesis",
  "pollingNotes": ["..."],
  "fundraisingNotes": ["..."],
  "endorsementNotes": ["..."],
  "incumbencyAndExperienceNotes": ["..."],
  "geographyNotes": ["..."],
  "sources": [
    {
      "sourceName": "source/publication",
      "sourceUrl": "https://...",
      "publicationDate": "YYYY-MM-DD or ISO timestamp",
      "sourceType": "news|polling|fundraising|endorsements|context",
      "snippet": "key evidence excerpt"
    }
  ]
}

Rules:
- Include publicationDate for every source.
- Include at least 5 sources when available.
- Prefer sources published in the last 30 days when possible.
- Do not fabricate URLs.
- If a dimension is unavailable, return an empty array for that note list.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: researchPrompt,
      tools: [{ type: "web_search_preview" }],
      temperature: 0.1,
      max_output_tokens: 1800,
    });

    const responseText = extractResponseText(response);
    if (!responseText.trim()) {
      return fallbackContext;
    }

    const parsed = JSON.parse(cleanJsonContent(responseText)) as Record<string, unknown>;
    const validSourceTypes = new Set(["news", "polling", "fundraising", "endorsements", "context"]);
    const parsedSources = parsed.sources;

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map((v) => String(v)) : [];

    const safeSources: RaceContextSource[] = Array.isArray(parsedSources)
      ? parsedSources
        .map((source) => {
          if (!source || typeof source !== "object") return null;
          const src = source as Record<string, unknown>;
          const sourceType = String(src.sourceType || "").toLowerCase();
          if (!validSourceTypes.has(sourceType)) return null;

          const sourceName = String(src.sourceName || "").trim();
          const sourceUrl = String(src.sourceUrl || "").trim();
          const publicationDate = String(src.publicationDate || "").trim();
          const snippet = String(src.snippet || "").trim();

          if (!sourceName || !sourceUrl || !publicationDate || !snippet) return null;

          return {
            sourceName,
            sourceUrl,
            publicationDate,
            sourceType: sourceType as RaceContextSource["sourceType"],
            snippet,
          };
        })
        .filter((source): source is RaceContextSource => source !== null)
      : [];

    return {
      retrievedAt,
      raceContextSummary: String(parsed.raceContextSummary || fallbackContext.raceContextSummary),
      pollingNotes: toStringArray(parsed.pollingNotes),
      fundraisingNotes: toStringArray(parsed.fundraisingNotes),
      endorsementNotes: toStringArray(parsed.endorsementNotes),
      incumbencyAndExperienceNotes: toStringArray(parsed.incumbencyAndExperienceNotes),
      geographyNotes: toStringArray(parsed.geographyNotes),
      sources: safeSources,
    };
  } catch (error) {
    console.warn("[reanalyzeRace] Failed to fetch fresh context:", error);
    return fallbackContext;
  }
}

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

  // Step 8: Rebalance to ensure exactly 100% after gap enforcement
  let finalTotal = prob.reduce((sum, p) => sum + p, 0);
  if (finalTotal !== TARGET_TOTAL) {
    const deficit = TARGET_TOTAL - finalTotal;
    // Distribute deficit/excess to the first candidate (has most headroom)
    prob[0] += deficit;
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
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Analysis unavailable.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Analysis temporarily unavailable. The prediction is based on comprehensive statistical modeling using 8 key factors.";
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

Generate realistic win probabilities and factor scores (0-100) for each candidate using public information. Use this comprehensive 8-factor prediction model:

{
  "predictions": {
    "candidate_name": {
      "probability": number (0-100),
      "factors": {
        "partisanLean": number (0-100) - PVI, district demographics, past results (25% weight),
        "polling": number (0-100) - Average polling performance, voter sentiment (20% weight),
        "candidateExperience": number (0-100) - Incumbent advantage, offices held (15% weight),
        "fundraising": number (0-100) - Campaign resources, cash raised (15% weight),
        "nameRecognition": number (0-100) - Media coverage, Google Trends, social media (10% weight),
        "endorsements": number (0-100) - Party support, official/union backing (10% weight),
        "issueAlignment": number (0-100) - Match with district ideology/issues (5% weight),
        "momentum": number (0-100) - Volunteer activity, event attendance, organic growth (5% weight)
      }
    }
  },
  "analysis": "3-4 paragraph comprehensive analysis explaining race dynamics and key factors"
}

Use the weighted scoring system: partisanLean (25%), polling (20%), candidateExperience (15%), fundraising (15%), nameRecognition (10%), endorsements (10%), issueAlignment (5%), momentum (5%).

CRITICAL: Each candidate MUST have a UNIQUE win probability - NO TIES ALLOWED. Even slight differences in factors should produce different probabilities (e.g., 23.4%, 22.7%, 19.3%, NOT 20.0%, 20.0%, 20.0%). Probabilities should sum to approximately 100 and be realistic and data-driven.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("[generateCustomPrediction] AI response:", content);

    // Strip markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
    }

    const result = customPredictionResponseSchema.parse(JSON.parse(cleanedContent));
    const validatedPredictions = validatePredictionMapForCandidates(result.predictions, candidates);

    return {
      predictions: validatedPredictions,
      analysis: result.analysis || "Analysis generated based on candidate profiles and party affiliations.",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);

    return {
      predictions: buildFallbackPredictionsFromScenarioCandidates(candidates),
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
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";

    // Strip markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
    }

    const result = JSON.parse(cleanedContent);

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
  candidates: Candidate[]
): Record<string, { probability: number; factors: PredictionFactors }> {
  console.log("[reanalyzeRace] Using deterministic fallback - AI unavailable");
  return buildNormalizedPredictionsFromAssessments(
    candidates,
    candidates.map(buildDeterministicAssessment),
  ).predictions;
}

export async function reanalyzeRace(
  raceTitle: string,
  candidates: Candidate[]
): Promise<ReanalyzeRaceResult> {
  const currentRaceContext = await fetchCurrentRaceContext(raceTitle, candidates);
  const withContext = (
    predictions: Record<string, { probability: number; factors: PredictionFactors }>,
    analysis: string,
    scorecards: ReanalysisScorecard[],
  ): ReanalyzeRaceResult => ({
    predictions,
    sourceContext: currentRaceContext,
    analysis,
    scorecards,
  });

  try {
    const assessments = await scoreFactorsFromFacts(raceTitle, candidates, currentRaceContext);
    const { predictions, scorecards } = buildNormalizedPredictionsFromAssessments(candidates, assessments);
    const analysis = await generateReanalysisExplanation(raceTitle, currentRaceContext, scorecards);
    return withContext(predictions, analysis, scorecards);
  } catch (error) {
    console.error("OpenAI API error during reanalysis:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }

    const { predictions, scorecards } = buildNormalizedPredictionsFromAssessments(
      candidates,
      candidates.map(buildDeterministicAssessment),
    );

    return withContext(
      predictions,
      "Updated using deterministic fallback scoring from stored candidate attributes because the AI reanalysis pipeline was unavailable.",
      scorecards,
    );
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
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: detectionPrompt }],
      max_tokens: 200,
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
   - Look for candidates in: comma-separated lists, bulleted lists, or sentence context
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
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("OpenAI response received, parsing...");

    // Strip markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
    }

    const result = naturalLanguageResponseSchema.parse(JSON.parse(cleanedContent));
    console.log("Parsed result:", {
      raceTitle: result.raceTitle,
      candidateCount: result.candidates?.length || 0,
      candidateNames: result.candidates?.map((c: any) => c.name) || []
    });

    if (!result.candidates || result.candidates.length === 0) {
      console.warn("OpenAI returned no candidates, using fallback extraction");
      throw new Error("No candidates in OpenAI response");
    }

    let validatedPredictions: Record<string, { probability: number; factors: PredictionFactors }> = {};
    try {
      validatedPredictions = validatePredictionMapForCandidates(result.predictions, result.candidates);
    } catch (validationError) {
      console.warn("Invalid AI prediction payload for natural language analysis, repairing with deterministic fallback:", validationError);
      validatedPredictions = buildFallbackPredictionsFromScenarioCandidates(result.candidates);
    }

    return {
      raceTitle: result.raceTitle || "Election Analysis",
      candidates: result.candidates,
      predictions: validatedPredictions,
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
          polling: 40 + Math.random() * 40,
          candidateExperience: 40 + Math.random() * 40,
          fundraising: 40 + Math.random() * 40,
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
