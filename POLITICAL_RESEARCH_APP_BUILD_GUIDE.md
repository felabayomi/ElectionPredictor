# Political Research & Fact-Finding App - Complete Build Guide

## 📋 App Overview

**App Name:** Political Research Assistant

**Purpose:** Answer factual questions about political data, past events, polling results, fundraising, ad effectiveness, and historical election information using AI-powered web search and synthesis.

**Target Users:** Political analysts, researchers, journalists, students, and engaged citizens seeking factual political information.

---

## 🎯 Core Features

### 1. Natural Language Question Interface
Users ask research questions in plain English:
- "What were Biden's approval ratings in swing states in October 2024?"
- "Which Super PAC spent the most in the 2022 midterms?"
- "How accurate were the 2020 Georgia Senate polls?"
- "What endorsements did Kamala Harris receive in 2020?"
- "Which political ads tested highest with suburban women?"

### 2. AI-Powered Research Synthesis
- Searches multiple credible political news sources
- Uses GPT-4/GPT-5 to synthesize comprehensive answers
- Provides specific data points and statistics
- Includes context and background information

### 3. Source Citations & Transparency
Every answer includes:
- Direct links to original sources
- Publication names and dates
- Source credibility tier indicators
- Multiple perspectives when available
- Excerpts from articles

### 4. Research History
- Automatically saves all searches and answers
- Browse past research queries
- Search through your research history
- Export findings to PDF or Markdown

### 5. Category Organization
Automatic categorization:
- Polling Data
- Fundraising & Money in Politics
- Ad Effectiveness & Messaging
- Endorsements
- Historical Election Results
- General Political Research

---

## 🏗️ Technical Architecture

### Frontend Stack
```
- React 18+ with TypeScript
- Wouter for client-side routing
- TanStack Query (React Query v5) for data fetching
- shadcn/ui component library (Radix UI + Tailwind)
- Tailwind CSS for styling
- Lucide React for icons
```

### Backend Stack
```
- Node.js + Express
- PostgreSQL database (Neon serverless)
- OpenAI API (GPT-5 recommended, GPT-4 acceptable)
- Web Search API (Tavily, Serper, or Perplexity)
- Drizzle ORM for database management
```

### Database Schema

```typescript
// Table 1: research_queries
{
  id: varchar (UUID primary key)
  query: text (user's question)
  answer: text (AI-synthesized answer)
  sources: jsonb (array of source objects)
  category: varchar (polling/fundraising/ads/endorsements/historical/general)
  created_at: timestamp
  user_ip: varchar (optional, for rate limiting)
}

// Table 2: sources
{
  id: varchar (UUID primary key)
  query_id: varchar (foreign key to research_queries)
  title: text
  url: text
  publication: text (e.g., "Politico", "FiveThirtyEight")
  publish_date: date
  excerpt: text
  credibility_tier: integer (1=highest, 2=medium, 3=lower)
}
```

---

## 🔌 Required API Integrations

### 1. OpenAI API (Required)
**Purpose:** AI synthesis of search results into coherent answers

**Setup:**
```bash
# Use Replit's OpenAI integration
# Search for "openai" in Replit integrations
# Or set environment variable:
OPENAI_API_KEY=your_key_here
```

**Usage:**
- Model: `gpt-5` (recommended) or `gpt-4-turbo`
- Max tokens: 2000-3000
- Temperature: 0.3 (for factual accuracy)

### 2. Web Search API (Choose One)

#### Option A: Tavily API (Recommended)
**Why:** Optimized for AI research, clean results, good political content coverage

**Setup:**
```bash
# Get API key from tavily.com
TAVILY_API_KEY=your_key_here
```

**Pricing:** ~$1 per 1000 searches

#### Option B: Serper API
**Why:** Google search results, comprehensive coverage

**Setup:**
```bash
# Get API key from serper.dev
SERPER_API_KEY=your_key_here
```

**Pricing:** ~$50 per 1000 searches

#### Option C: Perplexity API
**Why:** Built-in AI synthesis, citation-focused

**Setup:**
```bash
# Get API key from perplexity.ai
PERPLEXITY_API_KEY=your_key_here
```

**Pricing:** Usage-based

### 3. PostgreSQL Database
**Use Replit's built-in PostgreSQL database**
- Automatically configured
- Production-ready with Neon
- Supports rollback

---

## 📱 User Interface Design

### Page 1: Home / Search Page
**Route:** `/`

**Layout:**
```
┌────────────────────────────────────────┐
│  🔍 Political Research Assistant       │
│                                         │
│  Get factual answers to political      │
│  research questions                    │
├────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Ask any political research       │  │
│  │ question...                      │  │
│  │                                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [🔍 Search Research]                  │
│                                         │
│  📋 Example Questions:                 │
│  ┌─────────────────────────────────┐   │
│  │ • What were Biden's approval    │   │
│  │   ratings in Oct 2024?          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ • Which Super PAC spent the     │   │
│  │   most in 2022 midterms?        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ • How accurate were Georgia     │   │
│  │   Senate polls in 2020?         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🕒 Recent Searches                    │
│  ├─ Georgia polling accuracy           │
│  ├─ Q3 fundraising totals              │
│  └─ Super PAC spending                 │
└────────────────────────────────────────┘
```

### Page 2: Research Results Page
**Route:** `/research/:id`

**Layout:**
```
┌────────────────────────────────────────┐
│  ← Back to Search            [Export]  │
├────────────────────────────────────────┤
│  📝 Your Question:                     │
│  "Which Super PAC spent the most in    │
│   the 2022 midterms?"                  │
│                                         │
│  📊 Research Findings                  │
│  ┌──────────────────────────────────┐  │
│  │ According to OpenSecrets data,   │  │
│  │ Senate Leadership Fund (SLF)     │  │
│  │ spent $284 million in 2022,      │  │
│  │ making it the top Republican     │  │
│  │ Super PAC. On the Democratic     │  │
│  │ side, Senate Majority PAC spent  │  │
│  │ $260 million.                    │  │
│  │                                  │  │
│  │ Key Data Points:                 │  │
│  │ • SLF: $284M (Republican)        │  │
│  │ • Senate Majority PAC: $260M (D) │  │
│  │ • Congressional Leadership Fund: │  │
│  │   $242M (R)                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  📰 Sources (5)                        │
│  ┌──────────────────────────────────┐  │
│  │ [Tier 1] OpenSecrets             │  │
│  │ "2022 Midterm Super PAC Spending"│  │
│  │ Published: Nov 15, 2022          │  │
│  │ opensecrets.org/...              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ [Tier 1] Politico                │  │
│  │ "Super PACs Break Records..."    │  │
│  │ Published: Nov 10, 2022          │  │
│  └──────────────────────────────────┘  │
│  [View all 5 sources]                  │
│                                         │
│  [Save to History] [Export PDF]        │
└────────────────────────────────────────┘
```

### Page 3: Research History
**Route:** `/history`

**Layout:**
```
┌────────────────────────────────────────┐
│  🕒 Research History                   │
│                                         │
│  [Search history...] [Filter ▼]        │
├────────────────────────────────────────┤
│  📊 Polling Data (12)                  │
│  ├─ Biden approval ratings Oct 2024   │
│  ├─ Georgia Senate polls 2020         │
│  └─ Pennsylvania polls accuracy       │
│                                         │
│  💰 Fundraising (8)                    │
│  ├─ Super PAC spending 2022           │
│  ├─ Q3 fundraising totals             │
│  └─ Small donor contributions         │
│                                         │
│  📺 Ad Effectiveness (5)               │
│  ├─ Suburban women messaging          │
│  ├─ Healthcare ad testing             │
│  └─ Negative ad effectiveness         │
└────────────────────────────────────────┘
```

---

## 🔨 Implementation Guide

### Step 1: Project Initialization
```bash
# Create new Replit project
# Template: "Node.js with React (Full Stack)"
# Or use existing full-stack JavaScript template
```

### Step 2: Install Dependencies
```bash
# Backend dependencies (will auto-install via packager_tool)
- express
- @neondatabase/serverless
- drizzle-orm
- drizzle-kit
- openai
- tavily (or serper/perplexity)

# Frontend dependencies
- react
- react-dom
- wouter
- @tanstack/react-query
- shadcn/ui components
- lucide-react
```

### Step 3: Database Setup

**Create schema file:** `shared/schema.ts`

```typescript
import { pgTable, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const researchQueries = pgTable("research_queries", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  query: text("query").notNull(),
  answer: text("answer").notNull(),
  sources: jsonb("sources").$type<Source[]>().notNull(),
  category: varchar("category").notNull(), // polling, fundraising, ads, endorsements, historical, general
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userIp: varchar("user_ip"),
});

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  queryId: varchar("query_id").notNull().references(() => researchQueries.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publication: text("publication").notNull(),
  publishDate: varchar("publish_date"),
  excerpt: text("excerpt"),
  credibilityTier: integer("credibility_tier").notNull().default(3), // 1=highest, 3=lowest
});

export type ResearchQuery = typeof researchQueries.$inferSelect;
export type Source = {
  title: string;
  url: string;
  publication: string;
  publishDate?: string;
  excerpt: string;
  credibilityTier: number;
};

export const insertResearchQuerySchema = createInsertSchema(researchQueries);
export type InsertResearchQuery = z.infer<typeof insertResearchQuerySchema>;
```

**Run migration:**
```bash
npm run db:push
```

### Step 4: Backend API Implementation

**File:** `server/research.ts`

```typescript
import OpenAI from "openai";
import { tavily } from "@tavily/sdk"; // or your chosen search API

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Credible political news sources
const TRUSTED_SOURCES = [
  "fivethirtyeight.com",
  "politico.com",
  "nytimes.com",
  "washingtonpost.com",
  "cookpolitical.com",
  "opensecrets.org",
  "ballotpedia.org",
  "realclearpolitics.com",
  "thehill.com",
  "axios.com",
];

export async function conductResearch(query: string) {
  // Step 1: Search the web
  const searchResults = await tavilyClient.search(query, {
    max_results: 10,
    search_depth: "advanced",
    include_domains: TRUSTED_SOURCES,
  });

  // Step 2: Categorize the query
  const category = categorizeQuery(query);

  // Step 3: Synthesize with AI
  const prompt = `You are a political research assistant specializing in factual analysis.

User Question: ${query}

Web Search Results:
${searchResults.results.map((r, i) => `
[${i + 1}] ${r.title}
Source: ${r.url}
Published: ${r.published_date || "Unknown"}
Content: ${r.content}
`).join('\n')}

Provide a comprehensive, factual answer that:
1. Directly answers the question with specific data and numbers
2. Cites which sources support each claim
3. Provides relevant context
4. Notes any conflicting information or caveats
5. Remains neutral and objective

Return ONLY valid JSON (no markdown, no code blocks):
{
  "answer": "Detailed answer with inline citations like [1], [2]",
  "keyPoints": [
    "Key data point 1",
    "Key data point 2", 
    "Key data point 3"
  ],
  "sources": [
    {
      "title": "Article title",
      "url": "https://...",
      "publication": "Source name",
      "publishDate": "YYYY-MM-DD or null",
      "excerpt": "Relevant excerpt from article",
      "credibilityTier": 1
    }
  ]
}

Credibility Tiers:
- Tier 1: FiveThirtyEight, Politico, NYT, WaPo, Cook Political, OpenSecrets
- Tier 2: The Hill, Axios, RealClearPolitics, Ballotpedia
- Tier 3: Other sources`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // or "gpt-4-turbo"
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 2500,
    temperature: 0.3, // Lower for factual accuracy
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    query,
    answer: result.answer,
    keyPoints: result.keyPoints || [],
    sources: result.sources || [],
    category,
  };
}

function categorizeQuery(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("poll") || lowerQuery.includes("approval") || lowerQuery.includes("rating")) {
    return "polling";
  }
  if (lowerQuery.includes("fundrais") || lowerQuery.includes("donation") || lowerQuery.includes("super pac") || lowerQuery.includes("money")) {
    return "fundraising";
  }
  if (lowerQuery.includes("ad") || lowerQuery.includes("messaging") || lowerQuery.includes("campaign")) {
    return "ads";
  }
  if (lowerQuery.includes("endorsement") || lowerQuery.includes("endorse")) {
    return "endorsements";
  }
  if (lowerQuery.includes("result") || lowerQuery.includes("winner") || lowerQuery.includes("margin")) {
    return "historical";
  }
  
  return "general";
}
```

**File:** `server/routes.ts`

```typescript
import express from "express";
import { storage } from "./storage";
import { conductResearch } from "./research";

const app = express.Router();

// POST /api/research - Conduct new research
app.post("/api/research", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Conduct research
    const result = await conductResearch(query.trim());

    // Save to database
    const savedQuery = await storage.createResearchQuery({
      query: result.query,
      answer: result.answer,
      sources: result.sources,
      category: result.category,
      userIp: req.ip,
    });

    res.json({
      id: savedQuery.id,
      ...result,
    });
  } catch (error) {
    console.error("Research error:", error);
    res.status(500).json({ error: "Failed to conduct research" });
  }
});

// GET /api/research/:id - Get specific research result
app.get("/api/research/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await storage.getResearchQuery(id);

    if (!result) {
      return res.status(404).json({ error: "Research not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Fetch research error:", error);
    res.status(500).json({ error: "Failed to fetch research" });
  }
});

// GET /api/history - Get research history
app.get("/api/history", async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    const history = await storage.getResearchHistory({
      category: category as string,
      limit: parseInt(limit as string),
    });

    res.json(history);
  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default app;
```

### Step 5: Frontend Implementation

**File:** `client/src/pages/Home.tsx`

```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const researchMutation = useMutation({
    mutationFn: async () => {
      if (!query.trim()) {
        throw new Error("Please enter a question");
      }

      return await apiRequest("POST", "/api/research", {
        query: query.trim(),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Research Complete",
        description: "Redirecting to results...",
      });
      setLocation(`/research/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const exampleQuestions = [
    {
      label: "Polling Accuracy",
      query: "How accurate were the Georgia Senate polls in 2020?",
    },
    {
      label: "Super PAC Spending",
      query: "Which Super PAC spent the most in the 2022 midterms?",
    },
    {
      label: "Approval Ratings",
      query: "What were Biden's approval ratings in swing states in October 2024?",
    },
    {
      label: "Fundraising",
      query: "Which Democratic candidate raised the most money in Q3 2024?",
    },
    {
      label: "Ad Effectiveness",
      query: "Which political ads tested highest with suburban women in 2024?",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Political Research Assistant</h1>
              <p className="text-muted-foreground">
                Get factual answers to political research questions
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Ask Your Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: What were Biden's approval ratings in swing states in October 2024?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="textarea-query"
            />

            <Button
              onClick={() => researchMutation.mutate()}
              disabled={researchMutation.isPending || !query.trim()}
              className="w-full"
              size="lg"
              data-testid="button-search"
            >
              {researchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Search Research
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Example Questions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click any example to try it
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {exampleQuestions.map((example, index) => (
              <div key={index}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {example.label}
                </p>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setQuery(example.query)}
                  data-testid={`button-example-${index}`}
                >
                  {example.query}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
```

**File:** `client/src/pages/ResearchResults.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, FileDown } from "lucide-react";

export default function ResearchResults() {
  const [, params] = useRoute("/research/:id");
  const researchId = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: [`/api/research/${researchId}`],
    enabled: !!researchId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen">Research not found</div>;
  }

  const tierLabels = {
    1: "Highly Credible",
    2: "Credible",
    3: "Standard Source",
  };

  const tierColors = {
    1: "bg-green-100 text-green-800 border-green-200",
    2: "bg-blue-100 text-blue-800 border-blue-200",
    3: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Search
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{data.query}</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Research Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{data.answer}</p>
            
            {data.keyPoints && data.keyPoints.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Key Data Points:</h4>
                <ul className="space-y-1">
                  {data.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              📰 Sources ({data.sources?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.sources?.map((source, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-muted/50 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{source.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {source.publication}
                      {source.publishDate && ` • ${source.publishDate}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={tierColors[source.credibilityTier as keyof typeof tierColors]}
                  >
                    {tierLabels[source.credibilityTier as keyof typeof tierLabels]}
                  </Badge>
                </div>
                
                {source.excerpt && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {source.excerpt}
                  </p>
                )}

                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Read full article
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
```

### Step 6: Storage Layer

**File:** `server/storage.ts`

```typescript
import { db } from "./db";
import { researchQueries, sources } from "@shared/schema";
import type { ResearchQuery, InsertResearchQuery } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export const storage = {
  async createResearchQuery(data: InsertResearchQuery): Promise<ResearchQuery> {
    const [query] = await db.insert(researchQueries).values(data).returning();
    return query;
  },

  async getResearchQuery(id: string): Promise<ResearchQuery | null> {
    const [query] = await db
      .select()
      .from(researchQueries)
      .where(eq(researchQueries.id, id));
    return query || null;
  },

  async getResearchHistory(options: {
    category?: string;
    limit?: number;
  }): Promise<ResearchQuery[]> {
    let query = db.select().from(researchQueries).orderBy(desc(researchQueries.createdAt));

    if (options.category) {
      query = query.where(eq(researchQueries.category, options.category));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  },
};
```

---

## 🎨 Design Guidelines

### Color Scheme
```css
/* Professional, data-focused palette */
Primary: #1e40af (Navy Blue)
Secondary: #475569 (Slate Gray)
Accent: #0891b2 (Teal)
Success: #16a34a (Green)
Warning: #eab308 (Yellow)
Error: #dc2626 (Red)

Background (Light): #ffffff
Background (Dark): #0f172a
```

### Typography
```css
Headings: IBM Plex Sans (bold)
Body: Inter or IBM Plex Sans (regular)
Code/Data: IBM Plex Mono
```

### Component Styling
- Use shadcn/ui defaults for consistency
- Minimal shadows and gradients
- Clean borders and spacing
- Focus on readability
- Data-first presentation

---

## 📊 Example Questions by Category

### Polling Data
- "What were Biden's approval ratings in swing states in October 2024?"
- "How accurate were the 2020 Georgia Senate polls compared to actual results?"
- "What are Trump's favorability numbers among suburban women?"
- "Which pollsters were most accurate in the 2022 midterms?"

### Fundraising & Money
- "Which Democratic candidate raised the most in Q3 2024?"
- "How much did Super PACs spend in the Pennsylvania Senate race?"
- "What percentage of donations were from small donors in 2024?"
- "Which industries donated the most to Republican candidates?"

### Ad Effectiveness
- "Which political ads tested highest with swing voters in 2024?"
- "What messaging worked best for healthcare ads in the midterms?"
- "How effective were negative ads compared to positive ads?"
- "Which Prop 50 ad had the best recall among voters?"

### Endorsements
- "Which unions endorsed Biden in 2020?"
- "What newspapers endorsed candidates in the 2022 Georgia governor race?"
- "Which elected officials endorsed Kamala Harris in the primary?"

### Historical Results
- "What was the margin in the 2018 Georgia governor race?"
- "How many House seats flipped in 2022?"
- "What were the final vote counts in the 2020 Arizona Senate race?"

---

## 🚀 Deployment Checklist

### Pre-Launch Testing
```
✓ Test 15+ diverse research questions across all categories
✓ Verify all sources are credible and properly cited
✓ Check mobile responsiveness on iOS and Android
✓ Test dark mode functionality
✓ Verify database persistence across restarts
✓ Test rate limiting (10 searches per minute recommended)
✓ Check loading states and error handling
✓ Test export PDF functionality
✓ Verify search history works correctly
```

### Security & Performance
```
✓ Add rate limiting middleware
✓ Sanitize user inputs
✓ Implement caching for common queries
✓ Set up error monitoring (Sentry or similar)
✓ Add analytics (PostHog or similar)
✓ Optimize database queries with indexes
✓ Set up CORS properly
✓ Use environment variables for all API keys
```

### Launch Configuration
```
✓ Set production OpenAI API key
✓ Set production Tavily/search API key
✓ Configure production database (Neon)
✓ Set up custom domain
✓ Add SEO meta tags
✓ Create privacy policy
✓ Add terms of service
✓ Set up monitoring and alerts
```

---

## 🔧 Environment Variables

**Required `.env` variables:**
```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Web Search API (choose one)
TAVILY_API_KEY=tvly-...
# OR
SERPER_API_KEY=...
# OR
PERPLEXITY_API_KEY=...

# Database (auto-configured by Replit)
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...

# Session (auto-generated by Replit)
SESSION_SECRET=...

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## 📈 Future Enhancement Ideas

### Phase 2 Features
- User accounts and saved research collections
- Share research via unique URLs
- Email research results
- Advanced filtering by date range
- Comparison mode (compare multiple sources)
- RSS feed integration
- Browser extension

### Phase 3 Features
- API access for developers
- Webhook notifications for new data
- Custom data dashboards
- Real-time polling data updates
- Integration with academic databases
- Multi-language support

---

## 🎓 Complete Agent Prompt

**Copy this entire prompt to give to another agent:**

```
BUILD A POLITICAL RESEARCH & FACT-FINDING WEB APPLICATION

APP PURPOSE:
Answer factual political research questions using AI-powered web search and synthesis.

CORE FEATURES:
1. Natural language question input interface
2. AI-powered research using GPT-5 + web search (Tavily API)
3. Source citations with credibility indicators
4. Research history with category organization
5. Export to PDF functionality

TECH STACK:
- Frontend: React + TypeScript, Wouter routing, TanStack Query, shadcn/ui components, Tailwind CSS
- Backend: Node.js + Express, PostgreSQL (Neon), Drizzle ORM
- APIs: OpenAI GPT-5, Tavily Search API

DATABASE SCHEMA:
CREATE TABLE research_queries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB NOT NULL,
  category VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_ip VARCHAR
);

CREATE TABLE sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id VARCHAR REFERENCES research_queries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  publication TEXT NOT NULL,
  publish_date VARCHAR,
  excerpt TEXT,
  credibility_tier INTEGER NOT NULL DEFAULT 3
);

PAGES TO BUILD:
1. Home page (/) - Search interface with example questions
2. Research results (/research/:id) - Display AI answer and sources
3. History page (/history) - Browse past research queries

KEY IMPLEMENTATION STEPS:
1. Set up full-stack project with React + Express
2. Create database tables using Drizzle ORM
3. Integrate Tavily API for web search (prioritize political sources)
4. Build AI synthesis endpoint using GPT-5
5. Implement frontend with three pages
6. Add source credibility tier system (Tier 1: FiveThirtyEight, Politico, NYT)
7. Add category auto-detection (polling, fundraising, ads, endorsements, historical)
8. Test with 15+ diverse political questions

TRUSTED SOURCES TO PRIORITIZE:
fivethirtyeight.com, politico.com, nytimes.com, washingtonpost.com, cookpolitical.com, opensecrets.org, ballotpedia.org, realclearpolitics.com, thehill.com, axios.com

DESIGN: Clean, professional, data-focused, mobile-friendly

TESTING:
Test questions across categories:
- Polling: "What were Biden's approval ratings in Oct 2024?"
- Fundraising: "Which Super PAC spent the most in 2022?"
- Ads: "Which ads tested best with suburban women?"
- Historical: "What was the margin in the 2020 Georgia Senate race?"

Use Replit's built-in PostgreSQL database and OpenAI integration.
```

---

## 📞 Support & Resources

**API Documentation:**
- Tavily: https://docs.tavily.com
- OpenAI: https://platform.openai.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs

**Design Resources:**
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs

**Deployment:**
- Deploy via Replit's built-in deployment
- Use custom domain for production
- Monitor with Replit analytics

---

**Last Updated:** November 2024
**Version:** 1.0
**License:** Use freely for your project

---

Good luck building your Political Research Assistant! 🚀
