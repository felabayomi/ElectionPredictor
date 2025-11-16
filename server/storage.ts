import type {
  User,
  InsertUser,
  Candidate,
  Race,
  Prediction,
  PredictionFactors,
  Party,
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
  
  getAllRaces(): Promise<Race[]>;
  getRace(id: string): Promise<Race | undefined>;
  
  getPrediction(raceId: string, candidateId: string): Promise<Prediction | undefined>;
  getPredictionsByRace(raceId: string): Promise<Prediction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private candidates: Map<string, Candidate>;
  private races: Map<string, Race>;
  private predictions: Map<string, Prediction>;
  private candidateRaceMapping: Map<string, string[]>;

  constructor() {
    this.users = new Map();
    this.candidates = new Map();
    this.races = new Map();
    this.predictions = new Map();
    this.candidateRaceMapping = new Map();
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
}

export const storage = new MemStorage();
