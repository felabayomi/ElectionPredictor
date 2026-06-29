import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateComparisonInsights, generateCustomPrediction, analyzeNaturalLanguageQuery, generateIntelligentSuggestions, reanalyzeRace } from "./openai";
import type { ComparisonResult, PredictionFactors, Candidate, Prediction, Race, Party, RaceType, SuggestedMatchup, InsertPredictionSource, PredictionSource } from "@shared/schema";
import { insertFeaturedMatchupSchema, insertRaceSchema, insertCandidateSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import Stripe from "stripe";

const DEFAULT_ADMIN_KEY = "19770520$&?";

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function hasActiveSubscription(status?: string): boolean {
  return status === "active" || status === "trialing";
}

function inferRaceTypeFromText(input: string): RaceType {
  const text = input.toLowerCase();

  if (/president|presidential|white\s+house/.test(text)) return "Presidential";
  if (/senate|senator/.test(text)) return "Senate";
  if (/house|congressional|representative\b/.test(text)) return "House";
  if (/governor|gubernatorial/.test(text)) return "Governor";
  if (/mayor|city\s+council|county|school\s+board|local/.test(text)) return "Local";

  return "Local";
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year
    && value.getUTCMonth() === month - 1
    && value.getUTCDate() === day;
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractExplicitDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (isValidDateParts(year, month, day)) {
      return formatIsoDate(year, month, day);
    }
  }

  const us = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    if (isValidDateParts(year, month, day)) {
      return formatIsoDate(year, month, day);
    }
  }

  return null;
}

function inferElectionYear(text: string): number {
  const currentYear = new Date().getUTCFullYear();
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const plausible = years.filter((year) => year >= currentYear - 2 && year <= currentYear + 12);
  if (plausible.length > 0) return plausible[0];
  return currentYear + 2;
}

function getGeneralElectionDay(year: number): string {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dayOfWeek = nov1.getUTCDay();
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  const firstMonday = 1 + daysUntilMonday;
  const electionDay = firstMonday + 1;
  return formatIsoDate(year, 11, electionDay);
}

function inferScenarioElectionDate(input: { raceTitle: string; raceType?: RaceType; query?: string }): string {
  const combined = `${input.raceTitle || ""} ${input.query || ""}`.trim();
  const explicitDate = extractExplicitDate(combined);
  if (explicitDate) return explicitDate;

  const year = inferElectionYear(combined);
  const isPrimary = /\bprimary|caucus|runoff\b/i.test(combined);
  if (isPrimary) {
    // Primary dates vary by state; use a pre-general placeholder within the same cycle.
    return formatIsoDate(year, 6, 1);
  }

  return getGeneralElectionDay(year);
}

function inferFactorFromSourceType(sourceType: string): keyof PredictionFactors | undefined {
  const normalized = sourceType.toLowerCase();
  if (normalized === "polling") return "polling";
  if (normalized === "fundraising") return "fundraising";
  if (normalized === "endorsements") return "endorsements";
  return undefined;
}

function inferCandidateIdFromSourceText(
  sourceTitle: string,
  summary: string,
  candidates: Candidate[],
): string | undefined {
  const text = `${sourceTitle} ${summary}`.toLowerCase();
  const match = candidates.find((candidate) => text.includes(candidate.name.toLowerCase()));
  return match?.id;
}

function computeLastCheckedAt(sources: Array<{ retrievedAt: string }>): string | undefined {
  const latest = sources.reduce((max, source) => {
    const ts = Date.parse(source.retrievedAt);
    return Number.isNaN(ts) ? max : Math.max(max, ts);
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function buildReanalysisSummary(sourceCount: number, retrievedAt: string): string {
  if (sourceCount <= 0) {
    return "Updated using stored candidate data only.";
  }

  const retrievedDate = new Date(retrievedAt);
  const retrievedLabel = Number.isNaN(retrievedDate.getTime())
    ? "recently"
    : retrievedDate.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return `Updated using ${sourceCount} source${sourceCount === 1 ? "" : "s"} retrieved ${retrievedLabel}.`;
}

type PredictionSourceLike = Pick<PredictionSource, "sourceType" | "publishedAt" | "candidateId">;

function findLatestPublishedAtDays(
  sources: PredictionSourceLike[],
  sourceType: string,
  candidateId?: string,
): number | undefined {
  const now = Date.now();
  const relevant = sources.filter((source) => {
    if (source.sourceType !== sourceType) return false;
    if (candidateId && source.candidateId && source.candidateId !== candidateId) return false;
    return Boolean(source.publishedAt);
  });

  if (relevant.length === 0) return undefined;

  const latest = relevant.reduce((max, source) => {
    const ts = Date.parse(source.publishedAt || "");
    return Number.isNaN(ts) ? max : Math.max(max, ts);
  }, 0);

  if (latest <= 0) return undefined;
  return Math.max(0, Math.round((now - latest) / (1000 * 60 * 60 * 24)));
}

function computePredictionDataQuality(
  candidate: Candidate | undefined,
  predictionSources: PredictionSourceLike[],
): Pick<Prediction, "dataQualityScore" | "pollingFreshnessDays" | "sourceCount" | "hasRecentPolling" | "hasRecentFundraising"> {
  const candidateScopedSources = candidate
    ? predictionSources.filter((source) => !source.candidateId || source.candidateId === candidate.id)
    : predictionSources;

  const sourceCount = candidateScopedSources.length;
  const pollingFreshnessDays = findLatestPublishedAtDays(candidateScopedSources, "polling", candidate?.id);
  const fundraisingFreshnessDays = findLatestPublishedAtDays(candidateScopedSources, "fundraising", candidate?.id);
  const hasRecentPolling = pollingFreshnessDays !== undefined && pollingFreshnessDays <= 30;
  const hasRecentFundraising = fundraisingFreshnessDays !== undefined && fundraisingFreshnessDays <= 90;

  let dataQualityScore = 20;
  dataQualityScore += Math.min(30, sourceCount * 4);
  if (hasRecentPolling) dataQualityScore += 25;
  else if (candidate?.pollingAverage != null) dataQualityScore += 8;
  if (hasRecentFundraising) dataQualityScore += 15;
  else if (candidate?.fundraisingTotal != null) dataQualityScore += 6;
  if (candidate?.isIncumbent) dataQualityScore += 5;
  if (candidate?.yearsExperience != null) dataQualityScore += 5;

  return {
    dataQualityScore: Math.min(100, Math.max(5, dataQualityScore)),
    pollingFreshnessDays,
    sourceCount,
    hasRecentPolling,
    hasRecentFundraising,
  };
}

function buildConfidenceInterval(
  probability: number,
  dataQualityScore: number,
  baseMinWidth = 5,
): { low: number; high: number } {
  const width = Math.max(baseMinWidth, Math.round((100 - dataQualityScore) * 0.18));
  return {
    low: Math.max(0, probability - width),
    high: Math.min(100, probability + width),
  };
}

function enrichPredictionsWithDataQuality(
  predictions: Prediction[],
  candidates: Candidate[],
  predictionSources: PredictionSource[],
): Prediction[] {
  return predictions.map((prediction) => {
    const candidate = candidates.find((item) => item.id === prediction.candidateId);
    const dataQuality = computePredictionDataQuality(candidate, predictionSources);
    return {
      ...prediction,
      ...dataQuality,
    };
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const getConfiguredAdminKey = () => process.env.ELECTION_PREDICTOR_ADMIN_KEY || DEFAULT_ADMIN_KEY;

  const isValidAdminRequest = (req: Request): boolean => {
    const providedKey = req.header("x-admin-key");
    return Boolean(providedKey && providedKey === getConfiguredAdminKey());
  };

  const requireAdminAccess = (req: Request, res: Response, next: NextFunction) => {
    if (!isValidAdminRequest(req)) {
      return res.status(401).json({ error: "Unauthorized admin access" });
    }

    next();
  };

  const requireSubscriberAccess = async (req: Request, res: Response, next: NextFunction) => {
    if (isValidAdminRequest(req)) {
      return next();
    }

    const email = normalizeEmail(req.header("x-subscriber-email"));
    if (!email) {
      return res.status(402).json({
        error: "Active subscription required",
        details: "Missing subscriber email header",
      });
    }

    const subscription = await storage.getSubscriptionByEmail(email);
    if (!subscription || !hasActiveSubscription(subscription.status)) {
      return res.status(402).json({
        error: "Active subscription required",
      });
    }

    next();
  };

  app.use("/api/admin", requireAdminAccess);
  
  // Debug endpoint to verify middleware is running
  app.get("/debug/path", (req, res) => {
    res.json({
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      message: "Middleware is running - prefix stripping should have occurred by now"
    });
  });
  
  // Explicit handler for /api/election-predictor/* routes
  // This allows the backend to handle requests that come with the prefix from Netlify
  app.all("/api/election-predictor/*", (req, res, next) => {
    // Remove the prefix and continue routing
    const withoutPrefix = req.path.replace("/api/election-predictor", "");
    req.url = withoutPrefix + (req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "");
    req.baseUrl = withoutPrefix;
    console.log(`[PREFIXED-ROUTE] Stripping /api/election-predictor from ${req.path} -> ${withoutPrefix}`);
    next();
  });

  app.get("/api/subscription/status", async (req, res) => {
    try {
      const email = normalizeEmail(req.query.email);
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const subscription = await storage.getSubscriptionByEmail(email);
      const isActive = Boolean(subscription && hasActiveSubscription(subscription.status));
      res.json({
        email,
        subscription: subscription || null,
        isActive,
      });
    } catch (error) {
      console.error("Error reading subscription status:", error);
      res.status(500).json({ error: "Failed to read subscription status" });
    }
  });

  app.post("/api/subscription/checkout", async (req, res) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      const stripePriceId = process.env.STRIPE_PRICE_ID;

      if (!stripeSecretKey || !stripePriceId) {
        return res.status(503).json({
          error: "Stripe checkout is not configured",
        });
      }

      const email = normalizeEmail(req.body?.email);
      if (!email) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-06-24.dahlia",
      });

      const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        metadata: { email },
        success_url: `${appBaseUrl}/subscriber-studio?checkout=success&email=${encodeURIComponent(email)}`,
        cancel_url: `${appBaseUrl}/subscriber-studio?checkout=cancelled`,
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscription/portal", async (req, res) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(503).json({ error: "Stripe portal is not configured" });
      }

      const email = normalizeEmail(req.body?.email);
      if (!email) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const subscription = await storage.getSubscriptionByEmail(email);
      if (!subscription?.stripeCustomerId) {
        return res.status(404).json({ error: "No Stripe customer found for this email" });
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-06-24.dahlia",
      });

      const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const portal = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${appBaseUrl}/subscriber-studio`,
      });

      res.json({ portalUrl: portal.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.post("/api/subscription/webhook", async (req, res) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripeSecretKey || !stripeWebhookSecret) {
        return res.status(503).json({ error: "Stripe webhook is not configured" });
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-06-24.dahlia",
      });

      const signature = req.header("stripe-signature");
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      const rawBody = req.rawBody;
      if (!rawBody || !(rawBody instanceof Buffer)) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      const event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);

      if (
        event.type === "checkout.session.completed" ||
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        let email = "";
        let status = "inactive";
        let stripeCustomerId = "";
        let stripeSubscriptionId = "";
        let stripePriceId = "";
        let currentPeriodEnd: Date | undefined;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          email = normalizeEmail(session.customer_details?.email || session.customer_email || session.metadata?.email);
          status = "active";
          stripeCustomerId = typeof session.customer === "string" ? session.customer : "";
          stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : "";
        } else {
          const subscription = event.data.object as Stripe.Subscription;
          email = normalizeEmail(subscription.metadata?.email);
          if (!email && typeof subscription.customer === "string") {
            const customer = await stripe.customers.retrieve(subscription.customer);
            if (!("deleted" in customer)) {
              email = normalizeEmail(customer.email);
            }
          }

          status = subscription.status;
          stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : "";
          stripeSubscriptionId = subscription.id;
          stripePriceId = subscription.items.data[0]?.price?.id || "";
          const currentPeriodEndRaw = (subscription as unknown as Record<string, unknown>).current_period_end;
          if (typeof currentPeriodEndRaw === "number") {
            currentPeriodEnd = new Date(currentPeriodEndRaw * 1000);
          }
        }

        if (email) {
          await storage.upsertSubscriptionByEmail(email, {
            status,
            stripeCustomerId: stripeCustomerId || undefined,
            stripeSubscriptionId: stripeSubscriptionId || undefined,
            stripePriceId: stripePriceId || undefined,
            currentPeriodEnd,
          });
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ error: "Webhook handler failed" });
    }
  });

  app.get("/api/subscriber-profiles/:email", async (req, res) => {
    try {
      const email = req.params.email?.toLowerCase();
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const profile = await storage.getSubscriberProfile(email);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!profile.isPublic) {
        return res.status(403).json({ error: "This profile is not public" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching subscriber profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/subscriber-profiles", requireSubscriberAccess, async (req, res) => {
    try {
      const email = normalizeEmail(req.header("x-subscriber-email"));
      if (!email) {
        return res.status(400).json({ error: "Subscriber email is required" });
      }

      const { displayName, bio, profileImageUrl, isPublic } = req.body;
      if (!displayName || typeof displayName !== "string") {
        return res.status(400).json({ error: "Display name is required" });
      }

      const profile = await storage.upsertSubscriberProfile(email, {
        displayName: displayName.trim(),
        bio: bio ? String(bio).trim() : undefined,
        profileImageUrl: profileImageUrl ? String(profileImageUrl).trim() : undefined,
        isPublic: typeof isPublic === "boolean" ? isPublic : true,
      });

      res.json(profile);
    } catch (error) {
      console.error("Error updating subscriber profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/races", async (_req, res) => {
    try {
      const races = await storage.getAllRaces();
      const racesWithPredictions = await Promise.all(
        races.map(async (race) => {
          const candidates = await storage.getCandidatesByRace(race.id);
          const predictions = await storage.getPredictionsByRace(race.id);
          const predictionSources = await storage.getPredictionSourcesByRace(race.id);
          const enrichedPredictions = enrichPredictionsWithDataQuality(predictions, candidates, predictionSources);
          return {
            race,
            candidates,
            predictions: enrichedPredictions,
            predictionSources,
            lastCheckedAt: computeLastCheckedAt(predictionSources),
          };
        })
      );

      // New races should appear first: sort by most recent prediction update,
      // then fall back to election date for races without predictions.
      racesWithPredictions.sort((a, b) => {
        const latestA = a.predictions.reduce((max, p) => {
          const t = Date.parse(p.lastUpdated);
          return Number.isNaN(t) ? max : Math.max(max, t);
        }, 0);

        const latestB = b.predictions.reduce((max, p) => {
          const t = Date.parse(p.lastUpdated);
          return Number.isNaN(t) ? max : Math.max(max, t);
        }, 0);

        if (latestA !== latestB) {
          return latestB - latestA;
        }

        const electionA = Date.parse(a.race.electionDate);
        const electionB = Date.parse(b.race.electionDate);
        return (Number.isNaN(electionB) ? 0 : electionB) - (Number.isNaN(electionA) ? 0 : electionA);
      });

      res.json(racesWithPredictions);
    } catch (error) {
      console.error("Error fetching races:", error);
      res.status(500).json({ error: "Failed to fetch races" });
    }
  });

  app.get("/api/races/:id", async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");

      const race = await storage.getRace(req.params.id);
      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }

      const candidates = await storage.getCandidatesByRace(race.id);
      const predictions = await storage.getPredictionsByRace(race.id);
      const predictionSources = await storage.getPredictionSourcesByRace(race.id);
      const enrichedPredictions = enrichPredictionsWithDataQuality(predictions, candidates, predictionSources);

      res.json({
        race,
        candidates,
        predictions: enrichedPredictions,
        predictionSources,
        lastCheckedAt: computeLastCheckedAt(predictionSources),
      });
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

  app.put("/api/admin/races/:id", async (req, res) => {
    try {
      const race = await storage.updateRace(req.params.id, req.body);
      res.json(race);
    } catch (error) {
      console.error("Error updating race:", error);
      res.status(500).json({ error: "Failed to update race" });
    }
  });

  app.delete("/api/admin/races/:id", async (req, res) => {
    try {
      await storage.deleteRace(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting race:", error);
      res.status(500).json({ error: "Failed to delete race" });
    }
  });

  const reanalyzeRaceHandler = async (req: Request, res: Response) => {
    try {
      res.set("Cache-Control", "no-store");

      const race = await storage.getRace(req.params.id);
      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }

      const candidates = await storage.getCandidatesByRace(req.params.id);
      if (candidates.length === 0) {
        return res.status(400).json({ error: "Race must have candidates to reanalyze" });
      }

      console.log(`Reanalyzing race: ${race.title} with ${candidates.length} candidates`);

      // Call AI to regenerate predictions
      const reanalysis = await reanalyzeRace(race.title, candidates);
      const newPredictions = reanalysis.predictions;
      console.log(`AI generated predictions:`, Object.keys(newPredictions).length > 0 ? Object.keys(newPredictions) : 'EMPTY');

      const sourceRows: InsertPredictionSource[] = reanalysis.sourceContext.sources.map((source) => ({
        raceId: race.id,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        sourceTitle: source.sourceName,
        publishedAt: source.publicationDate,
        retrievedAt: reanalysis.sourceContext.retrievedAt,
        summary: source.snippet,
        candidateId: inferCandidateIdFromSourceText(source.sourceName, source.snippet, candidates),
        factor: inferFactorFromSourceType(source.sourceType),
      }));
      const reanalysisSummary = buildReanalysisSummary(sourceRows.length, reanalysis.sourceContext.retrievedAt);

      // Update each prediction in the database
      for (const candidate of candidates) {
        const predictionData = newPredictions[candidate.name];
        console.log(`Processing candidate ${candidate.name}:`, predictionData ? 'HAS DATA' : 'NO DATA');
        if (predictionData) {
          const dataQuality = computePredictionDataQuality(candidate, sourceRows);
          const prediction: Prediction = {
            raceId: race.id,
            candidateId: candidate.id,
            winProbability: predictionData.probability,
            confidenceInterval: buildConfidenceInterval(predictionData.probability, dataQuality.dataQualityScore || 20, 5),
            factors: predictionData.factors,
            lastUpdated: new Date().toISOString(),
            methodology: "AI-powered comprehensive prediction model using 8 key factors: Partisan Lean/Demographics (25%), Polling (20%), Candidate Experience (15%), Fundraising (15%), Name Recognition (10%), Endorsements (10%), Issue Alignment (5%), and Momentum (5%).",
            aiAnalysis: `${reanalysisSummary} ${reanalysis.analysis}`.trim(),
            ...dataQuality,
          };

          console.log(`Upserting prediction for ${candidate.name}: ${predictionData.probability}%`);
          await storage.updatePrediction(prediction);
        }
      }

      // Fetch updated predictions to return
      const updatedPredictions = await storage.getPredictionsByRace(race.id);
      await storage.replacePredictionSourcesForRace(race.id, sourceRows);
      const updatedPredictionSources = await storage.getPredictionSourcesByRace(race.id);
      const enrichedUpdatedPredictions = enrichPredictionsWithDataQuality(updatedPredictions, candidates, updatedPredictionSources);
      console.log(`Fetched ${updatedPredictions.length} predictions from database`);
      const reanalyzedAt = new Date().toISOString();

      console.log(`Successfully reanalyzed race: ${race.title}`);
      res.json({
        success: true,
        reanalyzedAt,
        predictions: enrichedUpdatedPredictions,
        scorecards: reanalysis.scorecards,
        analysis: `${reanalysisSummary} ${reanalysis.analysis}`.trim(),
        summary: reanalysisSummary,
        predictionSources: updatedPredictionSources,
        sourceFreshness: {
          lastCheckedAt: computeLastCheckedAt(updatedPredictionSources),
          sourceCount: updatedPredictionSources.length,
          retrievedAt: reanalysis.sourceContext.retrievedAt,
        },
        message: "Race reanalyzed successfully"
      });
    } catch (error) {
      console.error("Error reanalyzing race:", error);
      res.status(500).json({ error: "Failed to reanalyze race" });
    }
  };

  app.post("/api/admin/races/:id/reanalyze", reanalyzeRaceHandler);
  app.post("/api/subscriber/races/:id/reanalyze", requireSubscriberAccess, reanalyzeRaceHandler);

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

  app.get("/api/admin/races/:raceId/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidatesByRace(req.params.raceId);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates for race:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  app.put("/api/admin/candidates/:id", async (req, res) => {
    try {
      const result = insertCandidateSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid candidate data", details: result.error });
      }

      const candidate = await storage.updateCandidate(req.params.id, result.data);
      res.json(candidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  app.delete("/api/admin/candidates/:id", async (req, res) => {
    try {
      await storage.deleteCandidate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
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
        "partisanLean",
        "polling",
        "candidateExperience",
        "fundraising",
        "nameRecognition",
        "endorsements",
        "issueAlignment",
        "momentum",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        partisanLean: "Partisan Lean / Demographics",
        polling: "Polling Average",
        candidateExperience: "Candidate Experience / Incumbency",
        fundraising: "Fundraising / Campaign Resources",
        nameRecognition: "Name Recognition / Public Visibility",
        endorsements: "Endorsements / Party Support",
        issueAlignment: "Issue Alignment / Ideology Fit",
        momentum: "Momentum / Public Engagement",
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
        "partisanLean",
        "polling",
        "candidateExperience",
        "fundraising",
        "nameRecognition",
        "endorsements",
        "issueAlignment",
        "momentum",
      ];

      const factorLabels: Record<keyof PredictionFactors, string> = {
        partisanLean: "Partisan Lean / Demographics",
        polling: "Polling Average",
        candidateExperience: "Candidate Experience / Incumbency",
        fundraising: "Fundraising / Campaign Resources",
        nameRecognition: "Name Recognition / Public Visibility",
        endorsements: "Endorsements / Party Support",
        issueAlignment: "Issue Alignment / Ideology Fit",
        momentum: "Momentum / Public Engagement",
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

  app.post("/api/custom-prediction", requireSubscriberAccess, async (req, res) => {
    try {
      const { candidates, raceTitle, raceType } = req.body;

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

      const allowedRaceTypes: RaceType[] = ["Presidential", "Senate", "House", "Governor", "Local"];
      if (!raceType || !allowedRaceTypes.includes(raceType)) {
        return res.status(400).json({
          error: "Race type is required",
          details: "Select Presidential, Senate, House, Governor, or Local",
        });
      }

      const result = await generateCustomPrediction(normalizedCandidates, raceTitle?.trim() || "Custom Race");

      const raceId = randomUUID();
      const subscriberEmail = normalizeEmail(req.header("x-subscriber-email"));
      const race: Race = {
        id: raceId,
        type: raceType,
        title: (raceTitle?.trim() || "Custom Race Analysis"),
        electionDate: inferScenarioElectionDate({ raceTitle: raceTitle?.trim() || "Custom Race Analysis", raceType }),
        description: "Custom race created via manual candidate entry",
        createdByEmail: subscriberEmail || undefined,
      };

      const customCandidates = normalizedCandidates.map((c: any) => ({
        id: randomUUID(),
        name: c.name,
        party: c.party as Party,
      }));

      const predictions: Prediction[] = customCandidates.map((candidate) => {
        const predData = result.predictions[candidate.name];
        const dataQuality = computePredictionDataQuality(candidate, []);

        if (!predData) {
          console.warn(`No prediction data found for candidate: ${candidate.name}, using defaults`);
          return {
            raceId: race.id,
            candidateId: candidate.id,
            winProbability: 50,
            confidenceInterval: buildConfidenceInterval(50, dataQuality.dataQualityScore || 20, 10),
            factors: {
              partisanLean: 50,
              polling: 50,
              candidateExperience: 50,
              fundraising: 50,
              nameRecognition: 50,
              endorsements: 50,
              issueAlignment: 50,
              momentum: 50,
            },
            lastUpdated: new Date().toISOString(),
            methodology: "AI-powered custom prediction analysis (default values)",
            ...dataQuality,
          };
        }

        return {
          raceId: race.id,
          candidateId: candidate.id,
          winProbability: predData.probability,
          confidenceInterval: buildConfidenceInterval(predData.probability, dataQuality.dataQualityScore || 20, 10),
          factors: predData.factors,
          lastUpdated: new Date().toISOString(),
          methodology: "AI-powered custom prediction analysis",
          ...dataQuality,
        };
      });

      // Save to database
      await storage.createRace(race);

      for (const candidate of customCandidates) {
        await storage.createCandidate(candidate, race.id);
      }

      for (const prediction of predictions) {
        await storage.createPrediction(prediction);
      }

      // Return race ID and data for redirect
      res.json({
        raceId: race.id,
        title: race.title,
        candidates: customCandidates,
        predictions,
        analysis: result.analysis,
      });
    } catch (error) {
      console.error("Error generating custom prediction:", error);
      res.status(500).json({ error: "Failed to generate prediction" });
    }
  });

  app.post("/api/natural-language-analysis", requireSubscriberAccess, async (req, res) => {
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
      const subscriberEmail = normalizeEmail(req.header("x-subscriber-email"));
      const inferredRaceType = inferRaceTypeFromText(`${query} ${result.raceTitle}`);
      const race: Race = {
        id: raceId,
        type: inferredRaceType,
        title: result.raceTitle,
        electionDate: inferScenarioElectionDate({ raceTitle: result.raceTitle, raceType: inferredRaceType, query: query.trim() }),
        description: `AI-generated analysis from query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`,
        createdByEmail: subscriberEmail || undefined,
      };

      const candidates = normalizedCandidates.map((c) => ({
        id: randomUUID(),
        name: c.name,
        party: c.party,
      }));

      const predictions: Prediction[] = candidates.map((candidate) => {
        const predData = result.predictions[candidate.name];
        const dataQuality = computePredictionDataQuality(candidate, []);

        if (!predData) {
          console.warn(`No prediction data found for candidate: ${candidate.name}, using defaults`);
          return {
            raceId: race.id,
            candidateId: candidate.id,
            winProbability: 50,
            confidenceInterval: buildConfidenceInterval(50, dataQuality.dataQualityScore || 20, 8),
            factors: {
              partisanLean: 50,
              polling: 50,
              candidateExperience: 50,
              fundraising: 50,
              nameRecognition: 50,
              endorsements: 50,
              issueAlignment: 50,
              momentum: 50,
            },
            lastUpdated: new Date().toISOString(),
            methodology: "AI-powered natural language analysis (default values)",
            ...dataQuality,
          };
        }

        return {
          raceId: race.id,
          candidateId: candidate.id,
          winProbability: predData.probability,
          confidenceInterval: buildConfidenceInterval(predData.probability, dataQuality.dataQualityScore || 20, 8),
          factors: predData.factors,
          lastUpdated: new Date().toISOString(),
          methodology: "AI-powered natural language analysis",
          ...dataQuality,
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
    } catch (error: any) {
      console.error("Error analyzing natural language query:", error);

      // If it's a fact-finding question, pass through the helpful message
      if (error.message?.startsWith("FACT_FINDING_QUESTION:")) {
        return res.status(400).json({ error: error.message });
      }

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

  app.put("/api/admin/featured-matchups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validationResult = insertFeaturedMatchupSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid matchup data", details: validationResult.error.errors });
      }

      const matchup = await storage.updateFeaturedMatchup(id, validationResult.data);
      res.json(matchup);
    } catch (error) {
      console.error("Error updating featured matchup:", error);
      res.status(500).json({ error: "Failed to update featured matchup" });
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
