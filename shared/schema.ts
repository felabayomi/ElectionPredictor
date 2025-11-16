import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  polling: number;
  fundraising: number;
  nameRecognition: number;
  demographics: number;
  endorsements: number;
  historicalTrends: number;
}

export interface Candidate {
  id: string;
  name: string;
  party: Party;
  photoUrl?: string;
  position?: string;
  district?: string;
  state?: string;
}

export interface Race {
  id: string;
  type: RaceType;
  title: string;
  state?: string;
  district?: string;
  electionDate: string;
  description?: string;
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

export const insertCandidateSchema = z.object({
  name: z.string().min(1),
  party: z.enum(["Democratic", "Republican", "Independent"]),
  photoUrl: z.string().optional(),
  position: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
});

export const insertRaceSchema = z.object({
  type: z.enum(["Presidential", "Senate", "House", "Governor", "Local"]),
  title: z.string().min(1),
  state: z.string().optional(),
  district: z.string().optional(),
  electionDate: z.string(),
  description: z.string().optional(),
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
