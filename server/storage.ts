import type {
  User,
  InsertUser,
  Candidate,
  InsertCandidate,
  Race,
  InsertRace,
  Prediction,
  PredictionFactors,
  Party,
  FeaturedMatchup,
  InsertFeaturedMatchup,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  getCandidatesByRace(raceId: string): Promise<Candidate[]>;
  getNYSenateCandidates(): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate, raceId: string): Promise<Candidate>;
  
  getAllRaces(): Promise<Race[]>;
  getRace(id: string): Promise<Race | undefined>;
  incrementRaceViews(raceId: string): Promise<void>;
  createRace(race: InsertRace): Promise<Race>;
  
  getPrediction(raceId: string, candidateId: string): Promise<Prediction | undefined>;
  getPredictionsByRace(raceId: string): Promise<Prediction[]>;
  
  getAllFeaturedMatchups(): Promise<FeaturedMatchup[]>;
  createFeaturedMatchup(matchup: InsertFeaturedMatchup): Promise<FeaturedMatchup>;
  deleteFeaturedMatchup(id: string): Promise<void>;
  updateFeaturedMatchupOrder(id: string, newOrder: number): Promise<void>;
}

export class DbStorage implements IStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { users } = await import("@shared/schema");
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllCandidates(): Promise<Candidate[]> {
    const { candidates } = await import("@shared/schema");
    const results = await this.db.select().from(candidates);
    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      party: r.party as Party,
      photoUrl: r.photoUrl || undefined,
      position: r.position || undefined,
      district: r.district || undefined,
      state: r.state || undefined,
    }));
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const { candidates } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      id: r.id,
      name: r.name,
      party: r.party as Party,
      photoUrl: r.photoUrl || undefined,
      position: r.position || undefined,
      district: r.district || undefined,
      state: r.state || undefined,
    };
  }

  async getCandidatesByRace(raceId: string): Promise<Candidate[]> {
    const { candidates, raceCandidates } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const results = await this.db
      .select({
        id: candidates.id,
        name: candidates.name,
        party: candidates.party,
        photoUrl: candidates.photoUrl,
        position: candidates.position,
        district: candidates.district,
        state: candidates.state,
      })
      .from(raceCandidates)
      .innerJoin(candidates, eq(raceCandidates.candidateId, candidates.id))
      .where(eq(raceCandidates.raceId, raceId));
    
    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      party: r.party as Party,
      photoUrl: r.photoUrl || undefined,
      position: r.position || undefined,
      district: r.district || undefined,
      state: r.state || undefined,
    }));
  }

  async getNYSenateCandidates(): Promise<Candidate[]> {
    const { candidates, raceCandidates, races } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    const results = await this.db
      .select({
        id: candidates.id,
        name: candidates.name,
        party: candidates.party,
        photoUrl: candidates.photoUrl,
        position: candidates.position,
        district: candidates.district,
        state: candidates.state,
      })
      .from(raceCandidates)
      .innerJoin(candidates, eq(raceCandidates.candidateId, candidates.id))
      .innerJoin(races, eq(raceCandidates.raceId, races.id))
      .where(and(eq(races.type, "Senate"), eq(races.state, "New York")));
    
    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      party: r.party as Party,
      photoUrl: r.photoUrl || undefined,
      position: r.position || undefined,
      district: r.district || undefined,
      state: r.state || undefined,
    }));
  }

  async createCandidate(insertCandidate: InsertCandidate, raceId: string): Promise<Candidate> {
    const { candidates, raceCandidates } = await import("@shared/schema");
    const result = await this.db.insert(candidates).values(insertCandidate).returning();
    const candidate = result[0];
    
    await this.db.insert(raceCandidates).values({
      raceId,
      candidateId: candidate.id,
    });
    
    return {
      id: candidate.id,
      name: candidate.name,
      party: candidate.party as Party,
      photoUrl: candidate.photoUrl || undefined,
      position: candidate.position || undefined,
      district: candidate.district || undefined,
      state: candidate.state || undefined,
    };
  }

  async getAllRaces(): Promise<Race[]> {
    const { races } = await import("@shared/schema");
    const results = await this.db.select().from(races);
    return results.map((r: any) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      state: r.state || undefined,
      district: r.district || undefined,
      electionDate: r.electionDate,
      description: r.description || undefined,
      viewCount: r.viewCount || 0,
    }));
  }

  async getRace(id: string): Promise<Race | undefined> {
    const { races } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db.select().from(races).where(eq(races.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      state: r.state || undefined,
      district: r.district || undefined,
      electionDate: r.electionDate,
      description: r.description || undefined,
      viewCount: r.viewCount || 0,
    };
  }

  async incrementRaceViews(raceId: string): Promise<void> {
    const { races } = await import("@shared/schema");
    const { eq, sql } = await import("drizzle-orm");
    await this.db
      .update(races)
      .set({ viewCount: sql`${races.viewCount} + 1` })
      .where(eq(races.id, raceId));
  }

  async createRace(insertRace: InsertRace): Promise<Race> {
    const { races } = await import("@shared/schema");
    const result = await this.db.insert(races).values({
      ...insertRace,
      viewCount: 0,
    }).returning();
    const r = result[0];
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      state: r.state || undefined,
      district: r.district || undefined,
      electionDate: r.electionDate,
      description: r.description || undefined,
      viewCount: r.viewCount || 0,
    };
  }

  async getPrediction(raceId: string, candidateId: string): Promise<Prediction | undefined> {
    const { predictions } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    const result = await this.db
      .select()
      .from(predictions)
      .where(and(eq(predictions.raceId, raceId), eq(predictions.candidateId, candidateId)))
      .limit(1);
    
    if (!result[0]) return undefined;
    const p = result[0];
    return {
      raceId: p.raceId,
      candidateId: p.candidateId,
      winProbability: p.winProbability,
      confidenceInterval: {
        low: p.confidenceIntervalLow,
        high: p.confidenceIntervalHigh,
      },
      factors: p.factors as PredictionFactors,
      lastUpdated: p.lastUpdated.toISOString(),
      methodology: p.methodology,
      aiAnalysis: p.aiAnalysis || undefined,
    };
  }

  async getPredictionsByRace(raceId: string): Promise<Prediction[]> {
    const { predictions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const results = await this.db.select().from(predictions).where(eq(predictions.raceId, raceId));
    
    return results.map((p: any) => ({
      raceId: p.raceId,
      candidateId: p.candidateId,
      winProbability: p.winProbability,
      confidenceInterval: {
        low: p.confidenceIntervalLow,
        high: p.confidenceIntervalHigh,
      },
      factors: p.factors as PredictionFactors,
      lastUpdated: p.lastUpdated.toISOString(),
      methodology: p.methodology,
      aiAnalysis: p.aiAnalysis || undefined,
    }));
  }

  async getAllFeaturedMatchups(): Promise<FeaturedMatchup[]> {
    const { featuredMatchups } = await import("@shared/schema");
    const { asc } = await import("drizzle-orm");
    const results = await this.db.select().from(featuredMatchups).orderBy(asc(featuredMatchups.displayOrder));
    return results.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      url: m.url,
      displayOrder: m.displayOrder,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createFeaturedMatchup(matchup: InsertFeaturedMatchup): Promise<FeaturedMatchup> {
    const { featuredMatchups } = await import("@shared/schema");
    const existingMatchups = await this.getAllFeaturedMatchups();
    const displayOrder = matchup.displayOrder ?? existingMatchups.length;
    
    const result = await this.db.insert(featuredMatchups).values({
      ...matchup,
      displayOrder,
    }).returning();
    
    const m = result[0];
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      url: m.url,
      displayOrder: m.displayOrder,
      createdAt: m.createdAt.toISOString(),
    };
  }

  async deleteFeaturedMatchup(id: string): Promise<void> {
    const { featuredMatchups } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await this.db.delete(featuredMatchups).where(eq(featuredMatchups.id, id));
  }

  async updateFeaturedMatchupOrder(id: string, newOrder: number): Promise<void> {
    const { featuredMatchups } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await this.db.update(featuredMatchups).set({ displayOrder: newOrder }).where(eq(featuredMatchups.id, id));
  }
}

import { db } from "./db.js";

export const storage = new DbStorage(db);
