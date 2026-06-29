import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RaceCard } from "@/components/RaceCard";
import { MethodologyModal } from "@/components/MethodologyModal";
import { ShareButton } from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Race, Candidate, Prediction, RaceType, FeaturedMatchup } from "@shared/schema";
import { Link } from "wouter";
import { BarChart3, Info, ExternalLink, Sparkles, Eye, Inbox, Clock3, Database, ShieldCheck } from "lucide-react";

interface RaceWithPredictions {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
  lastCheckedAt?: string;
}

function resolveLandingDate(race: Race, predictions: Prediction[], lastCheckedAt?: string): string {
  const raceWithLegacyFields = race as Race & { created_at?: string };

  if (race.createdAt) return race.createdAt;
  if (raceWithLegacyFields.created_at) return raceWithLegacyFields.created_at;

  const newestPredictionDate = predictions
    .map((p) => p.lastUpdated)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  if (newestPredictionDate) return newestPredictionDate;
  if (lastCheckedAt) return lastCheckedAt;

  return race.electionDate;
}

export default function Dashboard() {
  const [selectedRaceType, setSelectedRaceType] = useState<RaceType | "All">("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const { data: racesData, isLoading, error: racesError } = useQuery<RaceWithPredictions[]>({
    queryKey: ["/api/races"],
  });

  const { data: featuredMatchups = [], isLoading: loadingFeatured } = useQuery<FeaturedMatchup[]>({
    queryKey: ["/api/featured-matchups"],
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRaces = racesData?.filter((item) => {
    const inSelectedType = selectedRaceType === "All" || item.race.type === selectedRaceType;

    if (!normalizedSearch) {
      return inSelectedType;
    }

    const raceText = `${item.race.title} ${item.race.type}`.toLowerCase();
    const candidateText = item.candidates.map((c) => c.name.toLowerCase()).join(" ");
    const matchesSearch = raceText.includes(normalizedSearch) || candidateText.includes(normalizedSearch);

    return inSelectedType && matchesSearch;
  });

  const getFeaturedRaces = () => {
    if (!filteredRaces) return [];
    return filteredRaces;
  };

  const tabValueByRaceType: Record<RaceType | "All", string> = {
    All: "all",
    Presidential: "presidential",
    Senate: "senate",
    House: "house",
    Governor: "governor",
    Local: "local",
  };

  const raceTypeByTabValue: Record<string, RaceType | "All"> = {
    all: "All",
    presidential: "Presidential",
    senate: "Senate",
    house: "House",
    governor: "Governor",
    local: "Local",
  };

  const totalRaceCount = racesData?.length ?? 0;
  const latestUpdate = racesData
    ?.flatMap((item) => [
      item.lastCheckedAt,
      ...item.predictions.map((prediction) => prediction.lastUpdated),
    ])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const latestUpdateLabel = latestUpdate
    ? new Date(latestUpdate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Pending refresh";

  return (
    <div className="min-h-screen bg-slate-50/40">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-md">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ElectionPredict Public View</h1>
                <p className="text-sm text-muted-foreground">Read-only election analysis for viewers</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Eye className="h-3.5 w-3.5 mr-1" />
                Public Read-Only
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMethodologyOpen(true)}
                data-testid="button-methodology"
              >
                <Info className="h-4 w-4 mr-2" />
                Methodology
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6 mb-10">
          <h2 className="text-4xl font-bold mb-2">Election Predictions</h2>
          <p className="text-muted-foreground">
            View comprehensive election analysis and predictions powered by AI
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total races</p>
                <p className="mt-1 text-2xl font-semibold" data-testid="stat-total-races">{totalRaceCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium" data-testid="stat-last-updated">
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  {latestUpdateLabel}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast model</p>
                <Badge className="mt-2 inline-flex items-center gap-1" data-testid="badge-ai-forecast">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-powered forecast
                </Badge>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4 rounded-xl border border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">How these predictions are built</p>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                    <p className="inline-flex items-center gap-2">
                      <Database className="h-4 w-4 text-slate-500" />
                      Multi-source political and polling inputs
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
                      Confidence scoring with quality safeguards
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-slate-500" />
                      Continuously refreshed model outputs
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setMethodologyOpen(true)}
                  className="sm:mt-1"
                  data-testid="button-methodology-preview"
                >
                  <Info className="h-4 w-4 mr-2" />
                  View methodology
                </Button>
              </div>
            </CardContent>
          </Card>
          <div>
            <Link href="/subscriber-studio">
              <Button variant="outline" data-testid="button-subscriber-studio">
                <Sparkles className="h-4 w-4 mr-2" />
                Subscriber Studio
              </Button>
            </Link>
          </div>
        </div>

        <Tabs
          value={tabValueByRaceType[selectedRaceType]}
          onValueChange={(value) => setSelectedRaceType(raceTypeByTabValue[value] || "All")}
          className="mb-10"
        >
          <div className="sticky top-[72px] z-30 rounded-xl border border-slate-200 bg-white/90 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 focus-within:ring-2 focus-within:ring-primary/25">
            <TabsList className="scrollbar-none flex w-full snap-x snap-mandatory gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-6 sm:gap-0 sm:overflow-visible">
              <TabsTrigger value="all" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-all">
                All Races
              </TabsTrigger>
              <TabsTrigger value="presidential" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-presidential">
                Presidential
              </TabsTrigger>
              <TabsTrigger value="senate" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-senate">
                Senate
              </TabsTrigger>
              <TabsTrigger value="house" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-house">
                House
              </TabsTrigger>
              <TabsTrigger value="governor" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-governor">
                Governor
              </TabsTrigger>
              <TabsTrigger value="local" className="min-w-[128px] snap-start sm:min-w-0" data-testid="tab-local">
                Local
              </TabsTrigger>
            </TabsList>
            <div className="mt-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by race title, type, or candidate name"
                data-testid="input-search-races"
              />
            </div>
          </div>
        </Tabs>

        <div className="mb-10">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold mb-1">Featured Matchups</h3>
            <p className="text-sm text-muted-foreground">
              Curated head-to-head comparisons created in Admin
            </p>
          </div>
          {loadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-9 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredMatchups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredMatchups.map((matchup) => (
                <Card key={matchup.id} className="h-full flex flex-col" data-testid={`card-featured-${matchup.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{matchup.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{matchup.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={matchup.url}>
                        <Button variant="default" size="sm" data-testid={`button-view-featured-${matchup.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Analysis
                        </Button>
                      </Link>
                      <ShareButton
                        title={matchup.title}
                        text={`⚖️ ${matchup.title}: ${matchup.description} Check out this AI-powered election analysis!`}
                        url={typeof window !== 'undefined' ? `${window.location.origin}${matchup.url}` : matchup.url}
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white">
              <CardContent className="py-10 text-center">
                <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="font-medium text-slate-800">No featured matchups yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Curated highlights will appear here once they are added in Admin.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : racesError ? (
          <Card className="bg-destructive/5 border-destructive/30">
            <CardContent className="py-8 text-center">
              <p className="font-medium text-destructive mb-2">Unable to load races right now.</p>
              <p className="text-sm text-muted-foreground">Please refresh the page in a few seconds.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-1">
                {selectedRaceType === "All" ? "All Races" : `${selectedRaceType} Races`}
              </h3>
              <p className="text-sm text-muted-foreground">
                Races created in Admin or generated from Natural Language Analysis questions
              </p>
            </div>
            {filteredRaces && filteredRaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFeaturedRaces().map(({ race, candidates, predictions, lastCheckedAt }) => {
                  const displayDate = resolveLandingDate(race, predictions, lastCheckedAt);
                  const candidatesWithPredictions = predictions
                    .map((pred) => ({
                      prediction: pred,
                      candidate: candidates.find((c) => c.id === pred.candidateId),
                    }))
                    .filter((item) => item.candidate)
                    .sort((a, b) => {
                      const probDiff = b.prediction.winProbability - a.prediction.winProbability;
                      if (probDiff !== 0) return probDiff;
                      return (a.candidate?.name || "").localeCompare(b.candidate?.name || "");
                    });

                  const leadingItem = candidatesWithPredictions[0];

                  return (
                    <RaceCard
                      key={race.id}
                      race={race}
                      displayDate={displayDate}
                      leadingCandidate={leadingItem?.candidate?.name}
                      leadingProbability={leadingItem?.prediction?.winProbability}
                      leadingDataQualityScore={leadingItem?.prediction?.dataQualityScore}
                      candidateCount={candidates.length}
                      lastCheckedAt={lastCheckedAt}
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white">
                <CardContent className="py-10 text-center">
                  <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <p className="mb-1 font-medium text-slate-800">No races found for this category.</p>
                  <p className="text-sm text-muted-foreground">
                    Create races in <strong>Admin -&gt; Create Race</strong> or ask questions in <strong>Natural Language Analysis</strong>.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <MethodologyModal open={methodologyOpen} onOpenChange={setMethodologyOpen} />
    </div>
  );
}
