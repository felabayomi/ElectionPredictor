import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, doublePrecision, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("ep_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const races = pgTable("ep_races", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(),
  title: text("title").notNull(),
  state: text("state"),
  district: text("district"),
  electionDate: text("election_date").notNull(),
  description: text("description"),
  viewCount: integer("view_count").default(0),
});

export const candidates = pgTable("ep_candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  party: varchar("party", { length: 20 }).notNull(),
  photoUrl: text("photo_url"),
  position: text("position"),
  district: text("district"),
  state: text("state"),
  pollingAverage: doublePrecision("polling_average"),
  fundraisingTotal: doublePrecision("fundraising_total"),
  isIncumbent: integer("is_incumbent").default(0),
  yearsExperience: integer("years_experience"),
  majorEndorsements: integer("major_endorsements"),
  recentPolls: jsonb("recent_polls").$type<number[]>(),
  pollDate: text("poll_date"),
  pollsterGrade: text("pollster_grade"),
  cashOnHand: doublePrecision("cash_on_hand"),
  fundraisingQuarter: text("fundraising_quarter"),
  endorsementsList: jsonb("endorsements_list").$type<string[]>(),
  incumbentOffice: text("incumbent_office"),
  priorElectionResults: jsonb("prior_election_results").$type<string[]>(),
  districtPartisanLean: doublePrecision("district_partisan_lean"),
  electionType: varchar("election_type", { length: 20 }),
});

export const predictions = pgTable("ep_predictions", {
  raceId: varchar("race_id").notNull().references(() => races.id, { onDelete: 'cascade' }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  winProbability: doublePrecision("win_probability").notNull(),
  confidenceIntervalLow: doublePrecision("confidence_interval_low").notNull(),
  confidenceIntervalHigh: doublePrecision("confidence_interval_high").notNull(),
  factors: jsonb("factors").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  methodology: text("methodology").notNull(),
  aiAnalysis: text("ai_analysis"),
}, (table) => ({
  pk: primaryKey({ columns: [table.raceId, table.candidateId] })
}));

export const predictionSources = pgTable("ep_prediction_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raceId: varchar("race_id").notNull().references(() => races.id, { onDelete: 'cascade' }),
  candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: 'set null' }),
  factor: varchar("factor", { length: 40 }),
  sourceType: varchar("source_type", { length: 40 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  publishedAt: timestamp("published_at"),
  retrievedAt: timestamp("retrieved_at").notNull(),
  summary: text("summary").notNull(),
});

export const raceCandidates = pgTable("ep_race_candidates", {
  raceId: varchar("race_id").notNull().references(() => races.id, { onDelete: 'cascade' }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.raceId, table.candidateId] })
}));

export const featuredMatchups = pgTable("ep_featured_matchups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriberSubscriptions = pgTable("ep_subscriber_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("inactive"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Party = "Democratic" | "Republican" | "Independent";

export type RaceType = "Presidential" | "Senate" | "House" | "Governor" | "Local";

export interface PredictionFactors {
  partisanLean: number;
  polling: number;
  candidateExperience: number;
  fundraising: number;
  nameRecognition: number;
  endorsements: number;
  issueAlignment: number;
  momentum: number;
}

export interface Candidate {
  id: string;
  name: string;
  party: Party;
  photoUrl?: string;
  position?: string;
  district?: string;
  state?: string;
  pollingAverage?: number;
  fundraisingTotal?: number;
  isIncumbent?: number;
  yearsExperience?: number;
  majorEndorsements?: number;
  recentPolls?: number[];
  pollDate?: string;
  pollsterGrade?: string;
  cashOnHand?: number;
  fundraisingQuarter?: string;
  endorsementsList?: string[];
  incumbentOffice?: string;
  priorElectionResults?: string[];
  districtPartisanLean?: number;
  electionType?: "Primary" | "General";
}

export interface Race {
  id: string;
  type: RaceType;
  title: string;
  state?: string;
  district?: string;
  electionDate: string;
  description?: string;
  viewCount?: number;
}

export interface Prediction {
  raceId: string;
  candidateId: string;
  winProbability: number;
  confidenceInterval: { low: number; high: number };
  factors: PredictionFactors;
  lastUpdated: string;
  methodology: string;
  aiAnalysis?: string;
  dataQualityScore?: number;
  pollingFreshnessDays?: number;
  sourceCount?: number;
  hasRecentPolling?: boolean;
  hasRecentFundraising?: boolean;
}

export interface PredictionSource {
  id: string;
  raceId: string;
  candidateId?: string;
  factor?: keyof PredictionFactors;
  sourceType: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt?: string;
  retrievedAt: string;
  summary: string;
}

export interface InsertPredictionSource {
  raceId: string;
  candidateId?: string;
  factor?: keyof PredictionFactors;
  sourceType: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt?: string;
  retrievedAt: string;
  summary: string;
}

export interface ComparisonResult {
  candidate1: Candidate;
  candidate2: Candidate;
  race: Race;
  prediction1: Prediction;
  prediction2: Prediction;
  factorComparison: {
    factor: keyof PredictionFactors;
    label: string;
    candidate1Score: number;
    candidate2Score: number;
    advantage: string;
  }[];
  aiInsights: string;
}

export interface FeaturedMatchup {
  id: string;
  title: string;
  description: string;
  url: string;
  displayOrder: number;
  createdAt: string;
}

export interface SuggestedMatchup {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
  reason: string;
  score: number;
}

export interface SubscriberSubscription {
  id: string;
  email: string;
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export const insertCandidateSchema = z.object({
  name: z.string().min(1),
  party: z.enum(["Democratic", "Republican", "Independent"]),
  photoUrl: z.string().optional(),
  position: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pollingAverage: z.number().min(0).max(100).optional(),
  fundraisingTotal: z.number().min(0).optional(),
  isIncumbent: z.number().min(0).max(1).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  majorEndorsements: z.string().optional(),
  recentPolls: z.array(z.number().min(0).max(100)).optional(),
  pollDate: z.string().optional(),
  pollsterGrade: z.string().optional(),
  cashOnHand: z.number().min(0).optional(),
  fundraisingQuarter: z.string().optional(),
  endorsementsList: z.array(z.string().min(1)).optional(),
  incumbentOffice: z.string().optional(),
  priorElectionResults: z.array(z.string().min(1)).optional(),
  districtPartisanLean: z.number().min(-100).max(100).optional(),
  electionType: z.enum(["Primary", "General"]).optional(),
});

export const insertRaceSchema = z.object({
  type: z.enum(["Presidential", "Senate", "House", "Governor", "Local"]),
  title: z.string().min(1),
  state: z.string().optional(),
  district: z.string().optional(),
  electionDate: z.string(),
  description: z.string().optional(),
});

export const insertFeaturedMatchupSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.string().min(1),
  displayOrder: z.number().int().min(0).optional(),
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertFeaturedMatchup = z.infer<typeof insertFeaturedMatchupSchema>;
