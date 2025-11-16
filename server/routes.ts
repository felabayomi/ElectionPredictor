import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateComparisonInsights, generateCustomPrediction, analyzeNaturalLanguageQuery, generateIntelligentSuggestions } from "./openai";
import type { ComparisonResult, PredictionFactors, Candidate, Prediction, Race, Party, SuggestedMatchup } from "@shared/schema";
import { insertFeaturedMatchupSchema, insertRaceSchema, insertCandidateSchema } from "@shared/schema";
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

  app.post("/api/races/:id/view", async (req, res) => {
    try {
      await storage.incrementRaceViews(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing race views:", error);
      res.status(500).json({ error: "Failed to increment views" });
    }
  });

  app.post("/api/admin/races", async (req, res) => {
    try {
      const result = insertRaceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid race data", details: result.error });
      }

      const race = await storage.createRace(result.data);
      res.json(race);
    } catch (error) {
      console.error("Error creating race:", error);
      res.status(500).json({ error: "Failed to create race" });
    }
  });

  app.post("/api/admin/races/:raceId/candidates", async (req, res) => {
    try {
      const result = insertCandidateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid candidate data", details: result.error });
      }

      const candidate = await storage.createCandidate(result.data, req.params.raceId);
      res.json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(500).json({ error: "Failed to create candidate" });
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
        "demographics",
        "nameRecognition",
        "candidateExperience",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        demographics: "Demographics / Partisan Lean",
        nameRecognition: "Name Recognition",
        candidateExperience: "Candidate Experience",
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
        "demographics",
        "nameRecognition",
        "candidateExperience",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        demographics: "Demographics / Partisan Lean",
        nameRecognition: "Name Recognition",
        candidateExperience: "Candidate Experience",
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

      if (normalizedCandidates.length < 2) {
        return res.status(400).json({ error: "At least 2 candidates are required" });
      }

      const candidateNames = normalizedCandidates.map((c: any) => c.name);
      const uniqueNames = new Set(candidateNames.map((name: string) => name.toLowerCase()));
      if (uniqueNames.size !== candidateNames.length) {
        return res.status(400).json({ error: "All candidates must be different" });
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
              demographics: 50,
              nameRecognition: 50,
              candidateExperience: 50,
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

      const sortedPredictions = [...predictions].sort((a, b) => b.winProbability - a.winProbability);
      const sortedCandidates = sortedPredictions.map(p => 
        customCandidates.find(c => c.id === p.candidateId)!
      );

      const [candidate1, candidate2] = sortedCandidates;
      const [prediction1, prediction2] = sortedPredictions;

      const factorKeys: (keyof PredictionFactors)[] = [
        "polling",
        "demographics",
        "nameRecognition",
        "candidateExperience",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        polling: "Polling Average",
        demographics: "Demographics / Partisan Lean",
        nameRecognition: "Name Recognition",
        candidateExperience: "Candidate Experience",
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
        description: `AI-generated analysis from query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`,
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
              demographics: 50,
              nameRecognition: 50,
              candidateExperience: 50,
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

      await storage.createRace(race);
      
      for (const candidate of candidates) {
        await storage.createCandidate(candidate, race.id);
      }
      
      for (const prediction of predictions) {
        await storage.createPrediction(prediction);
      }

      res.json({
        raceId: race.id,
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

  app.get("/api/featured-matchups", async (_req, res) => {
    try {
      const matchups = await storage.getAllFeaturedMatchups();
      res.json(matchups);
    } catch (error) {
      console.error("Error fetching featured matchups:", error);
      res.status(500).json({ error: "Failed to fetch featured matchups" });
    }
  });

  app.post("/api/races/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.incrementRaceViews(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking race view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  app.post("/api/admin/featured-matchups", async (req, res) => {
    try {
      const validationResult = insertFeaturedMatchupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid matchup data", details: validationResult.error.errors });
      }

      const matchup = await storage.createFeaturedMatchup(validationResult.data);
      res.json(matchup);
    } catch (error) {
      console.error("Error creating featured matchup:", error);
      res.status(500).json({ error: "Failed to create featured matchup" });
    }
  });

  app.delete("/api/admin/featured-matchups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFeaturedMatchup(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting featured matchup:", error);
      res.status(500).json({ error: "Failed to delete featured matchup" });
    }
  });

  app.put("/api/admin/featured-matchups/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { order } = req.body;

      if (typeof order !== "number" || order < 0) {
        return res.status(400).json({ error: "Invalid order value" });
      }

      await storage.updateFeaturedMatchupOrder(id, order);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating matchup order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.get("/api/admin/suggested-matchups", async (_req, res) => {
    try {
      const races = await storage.getAllRaces();
      const racesWithData = await Promise.all(
        races.map(async (race) => ({
          race,
          candidates: await storage.getCandidatesByRace(race.id),
          predictions: await storage.getPredictionsByRace(race.id),
        }))
      );

      const result = await generateIntelligentSuggestions(racesWithData);
      res.json(result);
    } catch (error) {
      console.error("Error generating suggested matchups:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
