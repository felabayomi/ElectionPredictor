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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private candidates: Map<string, Candidate>;
  private races: Map<string, Race>;
  private predictions: Map<string, Prediction>;
  private candidateRaceMapping: Map<string, string[]>;
  private featuredMatchups: Map<string, FeaturedMatchup>;

  constructor() {
    this.users = new Map();
    this.candidates = new Map();
    this.races = new Map();
    this.predictions = new Map();
    this.candidateRaceMapping = new Map();
    this.featuredMatchups = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    const presidentialPrimaryRace: Race = {
      id: "presidential-primary-2028",
      type: "Presidential",
      title: "2028 Democratic Presidential Primary",
      electionDate: "2028-03-01",
      description: "Democratic primary to select the party's presidential nominee for 2028",
    };

    const nySenateRace: Race = {
      id: "ny-senate-2026",
      type: "Senate",
      title: "New York U.S. Senate Race",
      state: "New York",
      electionDate: "2026-11-03",
      description: "Potential replacement scenarios for Senator Schumer's seat",
    };

    const caHouseRace: Race = {
      id: "ca-house-12-2026",
      type: "House",
      title: "California 12th Congressional District",
      state: "California",
      district: "CA-12",
      electionDate: "2026-11-03",
    };

    const txGovernorRace: Race = {
      id: "tx-governor-2026",
      type: "Governor",
      title: "Texas Gubernatorial Race",
      state: "Texas",
      electionDate: "2026-11-03",
    };

    this.races.set(presidentialPrimaryRace.id, presidentialPrimaryRace);
    this.races.set(nySenateRace.id, nySenateRace);
    this.races.set(caHouseRace.id, caHouseRace);
    this.races.set(txGovernorRace.id, txGovernorRace);

    const kamalaHarris: Candidate = {
      id: "kamala-harris",
      name: "Kamala Harris",
      party: "Democratic",
      position: "Vice President",
    };

    const michelleObama: Candidate = {
      id: "michelle-obama",
      name: "Michelle Obama",
      party: "Democratic",
      position: "Former First Lady",
    };

    const aoc: Candidate = {
      id: "alexandria-ocasio-cortez",
      name: "Alexandria Ocasio-Cortez",
      party: "Democratic",
      position: "U.S. Representative, NY-14",
      state: "New York",
      district: "NY-14",
    };

    const letitiaJames: Candidate = {
      id: "letitia-james",
      name: "Letitia James",
      party: "Democratic",
      position: "New York Attorney General",
      state: "New York",
    };

    const patRyan: Candidate = {
      id: "pat-ryan",
      name: "Pat Ryan",
      party: "Democratic",
      position: "U.S. Representative, NY-18",
      state: "New York",
      district: "NY-18",
    };

    const ritchieTorres: Candidate = {
      id: "ritchie-torres",
      name: "Ritchie Torres",
      party: "Democratic",
      position: "U.S. Representative, NY-15",
      state: "New York",
      district: "NY-15",
    };

    const tomSuozzi: Candidate = {
      id: "tom-suozzi",
      name: "Tom Suozzi",
      party: "Democratic",
      position: "U.S. Representative, NY-3",
      state: "New York",
      district: "NY-3",
    };

    const johnSmith: Candidate = {
      id: "john-smith",
      name: "John Smith",
      party: "Democratic",
      position: "State Senator",
      state: "California",
    };

    const sarahJohnson: Candidate = {
      id: "sarah-johnson",
      name: "Sarah Johnson",
      party: "Republican",
      position: "Mayor",
      state: "California",
    };

    const mikeDavis: Candidate = {
      id: "mike-davis",
      name: "Mike Davis",
      party: "Republican",
      position: "Lieutenant Governor",
      state: "Texas",
    };

    const emilyWilson: Candidate = {
      id: "emily-wilson",
      name: "Emily Wilson",
      party: "Democratic",
      position: "State Representative",
      state: "Texas",
    };

    [kamalaHarris, michelleObama, aoc, letitiaJames, patRyan, ritchieTorres, tomSuozzi, johnSmith, sarahJohnson, mikeDavis, emilyWilson].forEach(
      (c) => this.candidates.set(c.id, c)
    );

    this.candidateRaceMapping.set(presidentialPrimaryRace.id, [kamalaHarris.id, michelleObama.id]);
    this.candidateRaceMapping.set(nySenateRace.id, [aoc.id, letitiaJames.id, patRyan.id, ritchieTorres.id, tomSuozzi.id]);
    this.candidateRaceMapping.set(caHouseRace.id, [johnSmith.id, sarahJohnson.id]);
    this.candidateRaceMapping.set(txGovernorRace.id, [mikeDavis.id, emilyWilson.id]);

    const harrisFactors: PredictionFactors = {
      polling: 48.5,
      fundraising: 85.2,
      nameRecognition: 92.3,
      demographics: 71.4,
      endorsements: 78.9,
      historicalTrends: 65.0,
    };

    const obamaFactors: PredictionFactors = {
      polling: 51.5,
      fundraising: 45.3,
      nameRecognition: 98.7,
      demographics: 83.2,
      endorsements: 55.1,
      historicalTrends: 70.0,
    };

    const aocFactors: PredictionFactors = {
      polling: 52.3,
      fundraising: 82.1,
      nameRecognition: 88.5,
      demographics: 75.3,
      endorsements: 62.4,
      historicalTrends: 58.2,
    };

    const letitiaFactors: PredictionFactors = {
      polling: 48.7,
      fundraising: 68.4,
      nameRecognition: 72.1,
      demographics: 78.9,
      endorsements: 71.3,
      historicalTrends: 62.5,
    };

    const patRyanFactors: PredictionFactors = {
      polling: 38.2,
      fundraising: 58.9,
      nameRecognition: 45.3,
      demographics: 65.7,
      endorsements: 52.8,
      historicalTrends: 55.1,
    };

    const ritchieFactors: PredictionFactors = {
      polling: 42.1,
      fundraising: 64.3,
      nameRecognition: 51.2,
      demographics: 72.4,
      endorsements: 58.7,
      historicalTrends: 52.9,
    };

    const tomFactors: PredictionFactors = {
      polling: 45.8,
      fundraising: 72.5,
      nameRecognition: 62.8,
      demographics: 68.2,
      endorsements: 66.1,
      historicalTrends: 60.3,
    };

    const harrisPrediction: Prediction = {
      raceId: presidentialPrimaryRace.id,
      candidateId: kamalaHarris.id,
      winProbability: 47.2,
      confidenceInterval: { low: 42.5, high: 52.0 },
      factors: harrisFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const obamaPrediction: Prediction = {
      raceId: presidentialPrimaryRace.id,
      candidateId: michelleObama.id,
      winProbability: 52.8,
      confidenceInterval: { low: 48.0, high: 57.5 },
      factors: obamaFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const aocPrediction: Prediction = {
      raceId: nySenateRace.id,
      candidateId: aoc.id,
      winProbability: 28.5,
      confidenceInterval: { low: 24.2, high: 32.8 },
      factors: aocFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const letitiaPrediction: Prediction = {
      raceId: nySenateRace.id,
      candidateId: letitiaJames.id,
      winProbability: 24.3,
      confidenceInterval: { low: 20.1, high: 28.5 },
      factors: letitiaFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const patPrediction: Prediction = {
      raceId: nySenateRace.id,
      candidateId: patRyan.id,
      winProbability: 14.2,
      confidenceInterval: { low: 11.0, high: 17.5 },
      factors: patRyanFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const ritchiePrediction: Prediction = {
      raceId: nySenateRace.id,
      candidateId: ritchieTorres.id,
      winProbability: 17.8,
      confidenceInterval: { low: 14.2, high: 21.4 },
      factors: ritchieFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const tomPrediction: Prediction = {
      raceId: nySenateRace.id,
      candidateId: tomSuozzi.id,
      winProbability: 15.2,
      confidenceInterval: { low: 12.0, high: 18.5 },
      factors: tomFactors,
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const johnSmithPrediction: Prediction = {
      raceId: caHouseRace.id,
      candidateId: johnSmith.id,
      winProbability: 56.4,
      confidenceInterval: { low: 51.2, high: 61.6 },
      factors: { polling: 54.2, fundraising: 72.1, nameRecognition: 68.5, demographics: 75.3, endorsements: 64.2, historicalTrends: 62.8 },
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const sarahPrediction: Prediction = {
      raceId: caHouseRace.id,
      candidateId: sarahJohnson.id,
      winProbability: 43.6,
      confidenceInterval: { low: 38.4, high: 48.8 },
      factors: { polling: 45.8, fundraising: 68.3, nameRecognition: 62.1, demographics: 58.7, endorsements: 58.9, historicalTrends: 55.2 },
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const mikePrediction: Prediction = {
      raceId: txGovernorRace.id,
      candidateId: mikeDavis.id,
      winProbability: 52.1,
      confidenceInterval: { low: 47.5, high: 56.7 },
      factors: { polling: 51.3, fundraising: 78.5, nameRecognition: 71.2, demographics: 65.8, endorsements: 68.4, historicalTrends: 70.5 },
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    const emilyPrediction: Prediction = {
      raceId: txGovernorRace.id,
      candidateId: emilyWilson.id,
      winProbability: 47.9,
      confidenceInterval: { low: 43.3, high: 52.5 },
      factors: { polling: 48.7, fundraising: 72.1, nameRecognition: 64.5, demographics: 68.2, endorsements: 62.8, historicalTrends: 58.3 },
      lastUpdated: new Date().toISOString(),
      methodology: "AI-powered statistical model combining polls, fundraising, demographics, and historical trends",
    };

    [
      harrisPrediction,
      obamaPrediction,
      aocPrediction,
      letitiaPrediction,
      patPrediction,
      ritchiePrediction,
      tomPrediction,
      johnSmithPrediction,
      sarahPrediction,
      mikePrediction,
      emilyPrediction,
    ].forEach((p) => this.predictions.set(`${p.raceId}-${p.candidateId}`, p));

    const presidentialMatchup: FeaturedMatchup = {
      id: "featured-presidential-2028",
      title: "2028 Democratic Presidential Primary",
      description: "Harris vs Obama: The establishment favorite faces the party's most beloved figure in a historic primary showdown",
      url: "/race/presidential-primary-2028",
      displayOrder: 1,
      createdAt: new Date().toISOString(),
    };

    const nySenateMatchup: FeaturedMatchup = {
      id: "featured-ny-senate",
      title: "New York U.S. Senate Race",
      description: "Progressive firebrand AOC takes on establishment Democrat Letitia James for Senate",
      url: "/race/ny-senate-2026",
      displayOrder: 2,
      createdAt: new Date().toISOString(),
    };

    this.featuredMatchups.set(presidentialMatchup.id, presidentialMatchup);
    this.featuredMatchups.set(nySenateMatchup.id, nySenateMatchup);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async getCandidatesByRace(raceId: string): Promise<Candidate[]> {
    const candidateIds = this.candidateRaceMapping.get(raceId) || [];
    return candidateIds.map((id) => this.candidates.get(id)!).filter(Boolean);
  }

  async getNYSenateCandidates(): Promise<Candidate[]> {
    return this.getCandidatesByRace("ny-senate-2026");
  }

  async getAllRaces(): Promise<Race[]> {
    return Array.from(this.races.values());
  }

  async getRace(id: string): Promise<Race | undefined> {
    return this.races.get(id);
  }

  async getPrediction(raceId: string, candidateId: string): Promise<Prediction | undefined> {
    return this.predictions.get(`${raceId}-${candidateId}`);
  }

  async getPredictionsByRace(raceId: string): Promise<Prediction[]> {
    return Array.from(this.predictions.values()).filter((p) => p.raceId === raceId);
  }

  async incrementRaceViews(raceId: string): Promise<void> {
    const race = this.races.get(raceId);
    if (race) {
      race.viewCount = (race.viewCount || 0) + 1;
      this.races.set(raceId, race);
    }
  }

  async createRace(insertRace: InsertRace): Promise<Race> {
    const id = randomUUID();
    const race: Race = {
      ...insertRace,
      id,
      viewCount: 0,
    };
    this.races.set(id, race);
    return race;
  }

  async createCandidate(insertCandidate: InsertCandidate, raceId: string): Promise<Candidate> {
    const id = randomUUID();
    const candidate: Candidate = {
      ...insertCandidate,
      id,
    };
    this.candidates.set(id, candidate);
    
    const existingCandidates = this.candidateRaceMapping.get(raceId) || [];
    this.candidateRaceMapping.set(raceId, [...existingCandidates, id]);
    
    return candidate;
  }

  async getAllFeaturedMatchups(): Promise<FeaturedMatchup[]> {
    return Array.from(this.featuredMatchups.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createFeaturedMatchup(matchup: InsertFeaturedMatchup): Promise<FeaturedMatchup> {
    const id = randomUUID();
    const existingMatchups = await this.getAllFeaturedMatchups();
    const displayOrder = matchup.displayOrder ?? existingMatchups.length;
    
    const newMatchup: FeaturedMatchup = {
      ...matchup,
      id,
      displayOrder,
      createdAt: new Date().toISOString(),
    };
    
    this.featuredMatchups.set(id, newMatchup);
    return newMatchup;
  }

  async deleteFeaturedMatchup(id: string): Promise<void> {
    this.featuredMatchups.delete(id);
  }

  async updateFeaturedMatchupOrder(id: string, newOrder: number): Promise<void> {
    const matchup = this.featuredMatchups.get(id);
    if (matchup) {
      matchup.displayOrder = newOrder;
      this.featuredMatchups.set(id, matchup);
    }
  }
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
