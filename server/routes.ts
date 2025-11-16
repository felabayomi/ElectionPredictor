import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateComparisonInsights, generateCustomPrediction, analyzeNaturalLanguageQuery } from "./openai";
import type { ComparisonResult, PredictionFactors, Candidate, Prediction, Race, Party } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/races", async (_req, res) => {
    try {
      const races = await storage.getAllRaces();
      const racesWithPredictions = await Promise.all(
        races.map(async (race) => {
          const candidates = await storage.getCandidatesByRace(race.id);
          const predictions = await storage.getPredictionsByRace(race.id);
          return { race, candidates, predictions };
        })
      );
      res.json(racesWithPredictions);
    } catch (error) {
      console.error("Error fetching races:", error);
      res.status(500).json({ error: "Failed to fetch races" });
    }
  });

  app.get("/api/races/:id", async (req, res) => {
    try {
      const race = await storage.getRace(req.params.id);
      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }

      const candidates = await storage.getCandidatesByRace(race.id);
      const predictions = await storage.getPredictionsByRace(race.id);

      res.json({ race, candidates, predictions });
    } catch (error) {
      console.error("Error fetching race:", error);
      res.status(500).json({ error: "Failed to fetch race" });
    }
  });

  app.get("/api/candidates", async (_req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/ny-senate", async (_req, res) => {
    try {
      const candidates = await storage.getNYSenateCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching NY Senate candidates:", error);
      res.status(500).json({ error: "Failed to fetch NY Senate candidates" });
    }
  });

  app.post("/api/compare", async (req, res) => {
    try {
      const { candidate1Id, candidate2Id } = req.body;

      if (!candidate1Id || !candidate2Id) {
        return res.status(400).json({ error: "Both candidate IDs are required" });
      }

      const candidate1 = await storage.getCandidate(candidate1Id);
      const candidate2 = await storage.getCandidate(candidate2Id);

      if (!candidate1 || !candidate2) {
        return res.status(404).json({ error: "One or both candidates not found" });
      }

      const allRaces = await storage.getAllRaces();
      let raceId = "";
      for (const race of allRaces) {
        const candidates = await storage.getCandidatesByRace(race.id);
        if (candidates.find((c) => c.id === candidate1Id) && candidates.find((c) => c.id === candidate2Id)) {
          raceId = race.id;
          break;
        }
      }

      if (!raceId) {
        return res.status(400).json({ error: "Candidates are not in the same race" });
      }

      const race = await storage.getRace(raceId);
      const prediction1 = await storage.getPrediction(raceId, candidate1Id);
      const prediction2 = await storage.getPrediction(raceId, candidate2Id);

      if (!race || !prediction1 || !prediction2) {
        return res.status(404).json({ error: "Prediction data not found" });
      }

      const factorKeys: (keyof PredictionFactors)[] = [
        "polling",
        "fundraising",
        "nameRecognition",
        "demographics",
        "endorsements",
        "historicalTrends",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        fundraising: "Fundraising",
        nameRecognition: "Name Recognition",
        demographics: "Demographics",
        endorsements: "Endorsements",
        historicalTrends: "Historical Trends",
      };

      const factorComparison = factorKeys.map((factor) => {
        const c1Score = prediction1.factors[factor];
        const c2Score = prediction2.factors[factor];
        const advantage = c1Score > c2Score ? candidate1.name : candidate2.name;

        return {
          factor,
          label: factorLabels[factor],
          candidate1Score: c1Score,
          candidate2Score: c2Score,
          advantage,
        };
      });

      const aiInsights = await generateComparisonInsights(
        candidate1.name,
        candidate2.name,
        race.title,
        factorComparison
      );

      const comparison: ComparisonResult = {
        candidate1,
        candidate2,
        race,
        prediction1,
        prediction2,
        factorComparison,
        aiInsights,
      };

      res.json(comparison);
    } catch (error) {
      console.error("Error generating comparison:", error);
      res.status(500).json({ error: "Failed to generate comparison" });
    }
  });

  app.get("/api/compare/presidential-primary", async (_req, res) => {
    try {
      const kamalaId = "kamala-harris";
      const michelleId = "michelle-obama";
      const raceId = "presidential-primary-2028";

      const candidate1 = await storage.getCandidate(kamalaId);
      const candidate2 = await storage.getCandidate(michelleId);
      const race = await storage.getRace(raceId);
      const prediction1 = await storage.getPrediction(raceId, kamalaId);
      const prediction2 = await storage.getPrediction(raceId, michelleId);

      if (!candidate1 || !candidate2 || !race || !prediction1 || !prediction2) {
        return res.status(404).json({ error: "Data not found" });
      }

      const factorKeys: (keyof PredictionFactors)[] = [
        "polling",
        "fundraising",
        "nameRecognition",
        "demographics",
        "endorsements",
        "historicalTrends",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        fundraising: "Fundraising",
        nameRecognition: "Name Recognition",
        demographics: "Demographics",
        endorsements: "Endorsements",
        historicalTrends: "Historical Trends",
      };

      const factorComparison = factorKeys.map((factor) => {
        const c1Score = prediction1.factors[factor];
        const c2Score = prediction2.factors[factor];
        const advantage = c1Score > c2Score ? candidate1.name : candidate2.name;

        return {
          factor,
          label: factorLabels[factor],
          candidate1Score: c1Score,
          candidate2Score: c2Score,
          advantage,
        };
      });

      const aiInsights = await generateComparisonInsights(
        candidate1.name,
        candidate2.name,
        race.title,
        factorComparison
      );

      const comparison: ComparisonResult = {
        candidate1,
        candidate2,
        race,
        prediction1,
        prediction2,
        factorComparison,
        aiInsights,
      };

      res.json(comparison);
    } catch (error) {
      console.error("Error fetching presidential primary comparison:", error);
      res.status(500).json({ error: "Failed to fetch comparison" });
    }
  });

  app.post("/api/custom-prediction", async (req, res) => {
    try {
      const { candidates, raceTitle } = req.body;

      if (!candidates || !Array.isArray(candidates)) {
        return res.status(400).json({ error: "Candidates array is required" });
      }

      const normalizedCandidates = candidates
        .map((c: any) => ({
          name: c.name?.trim(),
          party: c.party
        }))
        .filter((c: any) => c.name && c.party);

      if (normalizedCandidates.length !== 2) {
        return res.status(400).json({ error: "Exactly 2 candidates are required for head-to-head comparison" });
      }

      const candidateNames = normalizedCandidates.map((c: any) => c.name);
      if (candidateNames[0].toLowerCase() === candidateNames[1].toLowerCase()) {
        return res.status(400).json({ error: "Candidates must be different" });
      }

      const result = await generateCustomPrediction(normalizedCandidates, raceTitle?.trim() || "Custom Race");

      const raceId = randomUUID();
      const race: Race = {
        id: raceId,
        type: "Senate",
        title: (raceTitle?.trim() || "Custom Race Analysis"),
        electionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const customCandidates: Candidate[] = normalizedCandidates.map((c: any) => ({
        id: randomUUID(),
        name: c.name,
        party: c.party as Party,
      }));

      const predictions: Prediction[] = customCandidates.map((candidate) => {
        const predData = result.predictions[candidate.name];
        
        if (!predData) {
          console.warn(`No prediction data found for candidate: ${candidate.name}, using defaults`);
          return {
            raceId: race.id,
            candidateId: candidate.id,
            winProbability: 50,
            confidenceInterval: { low: 40, high: 60 },
            factors: {
              polling: 50,
              fundraising: 50,
              nameRecognition: 50,
              demographics: 50,
              endorsements: 50,
              historicalTrends: 50,
            },
            lastUpdated: new Date().toISOString(),
            methodology: "AI-powered custom prediction analysis (default values)",
          };
        }

        return {
          raceId: race.id,
          candidateId: candidate.id,
          winProbability: predData.probability,
          confidenceInterval: {
            low: Math.max(0, predData.probability - 10),
            high: Math.min(100, predData.probability + 10),
          },
          factors: predData.factors,
          lastUpdated: new Date().toISOString(),
          methodology: "AI-powered custom prediction analysis",
        };
      });

      const [candidate1, candidate2] = customCandidates;
      const [prediction1, prediction2] = predictions;

      const factorKeys: (keyof PredictionFactors)[] = [
        "polling",
        "fundraising",
        "nameRecognition",
        "demographics",
        "endorsements",
        "historicalTrends",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        fundraising: "Fundraising",
        nameRecognition: "Name Recognition",
        demographics: "Demographics",
        endorsements: "Endorsements",
        historicalTrends: "Historical Trends",
      };

      const factorComparison = factorKeys.map((factor) => {
        const c1Score = prediction1.factors[factor];
        const c2Score = prediction2.factors[factor];
        const advantage = c1Score > c2Score ? candidate1.name : candidate2.name;

        return {
          factor,
          label: factorLabels[factor],
          candidate1Score: c1Score,
          candidate2Score: c2Score,
          advantage,
        };
      });

      const comparison: ComparisonResult = {
        candidate1,
        candidate2,
        race,
        prediction1,
        prediction2,
        factorComparison,
        aiInsights: result.analysis,
      };

      res.json(comparison);
    } catch (error) {
      console.error("Error generating custom prediction:", error);
      res.status(500).json({ error: "Failed to generate prediction" });
    }
  });

  app.post("/api/natural-language-analysis", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "Query is required" });
      }

      const result = await analyzeNaturalLanguageQuery(query.trim());

      if (!result.candidates || result.candidates.length === 0) {
        return res.status(400).json({ error: "Could not extract candidates from query. Please include candidate names in your question." });
      }

      const normalizedCandidates = result.candidates.map(c => ({
        ...c,
        name: c.name.trim()
      }));

      const raceId = randomUUID();
      const race: Race = {
        id: raceId,
        type: "Senate",
        title: result.raceTitle,
        electionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const candidates: Candidate[] = normalizedCandidates.map((c) => ({
        id: randomUUID(),
        name: c.name,
        party: c.party,
      }));

      const predictions: Prediction[] = candidates.map((candidate) => {
        const predData = result.predictions[candidate.name];
        
        if (!predData) {
          console.warn(`No prediction data found for candidate: ${candidate.name}, using defaults`);
          return {
            raceId: race.id,
            candidateId: candidate.id,
            winProbability: 50,
            confidenceInterval: { low: 40, high: 60 },
            factors: {
              polling: 50,
              fundraising: 50,
              nameRecognition: 50,
              demographics: 50,
              endorsements: 50,
              historicalTrends: 50,
            },
            lastUpdated: new Date().toISOString(),
            methodology: "AI-powered natural language analysis (default values)",
          };
        }

        return {
          raceId: race.id,
          candidateId: candidate.id,
          winProbability: predData.probability,
          confidenceInterval: {
            low: Math.max(0, predData.probability - 8),
            high: Math.min(100, predData.probability + 8),
          },
          factors: predData.factors,
          lastUpdated: new Date().toISOString(),
          methodology: "AI-powered natural language analysis",
        };
      });

      res.json({
        query,
        raceTitle: result.raceTitle,
        candidates,
        predictions,
        analysis: result.analysis,
      });
    } catch (error) {
      console.error("Error analyzing natural language query:", error);
      res.status(500).json({ error: "Failed to analyze query" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
