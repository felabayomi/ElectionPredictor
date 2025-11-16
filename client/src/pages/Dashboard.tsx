import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RaceCard } from "@/components/RaceCard";
import { CandidateCard } from "@/components/CandidateCard";
import { MethodologyModal } from "@/components/MethodologyModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Race, Candidate, Prediction, RaceType } from "@shared/schema";
import { Link } from "wouter";
import { BarChart3, Info, Zap } from "lucide-react";

interface RaceWithPredictions {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
}

export default function Dashboard() {
  const [selectedRaceType, setSelectedRaceType] = useState<RaceType | "All">("All");
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const { data: racesData, isLoading } = useQuery<RaceWithPredictions[]>({
    queryKey: ["/api/races"],
  });

  const filteredRaces = racesData?.filter(
    (item) => selectedRaceType === "All" || item.race.type === selectedRaceType
  );

  const getFeaturedRaces = () => {
    if (!filteredRaces) return [];
    return filteredRaces.slice(0, 6);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-md">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ElectionPredict</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Election Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">Election Predictions Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of upcoming elections powered by AI and public data
          </p>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
            <TabsTrigger value="all" onClick={() => setSelectedRaceType("All")} data-testid="tab-all">
              All Races
            </TabsTrigger>
            <TabsTrigger
              value="presidential"
              onClick={() => setSelectedRaceType("Presidential")}
              data-testid="tab-presidential"
            >
              Presidential
            </TabsTrigger>
            <TabsTrigger value="senate" onClick={() => setSelectedRaceType("Senate")} data-testid="tab-senate">
              Senate
            </TabsTrigger>
            <TabsTrigger value="house" onClick={() => setSelectedRaceType("House")} data-testid="tab-house">
              House
            </TabsTrigger>
            <TabsTrigger value="governor" onClick={() => setSelectedRaceType("Governor")} data-testid="tab-governor">
              Governor
            </TabsTrigger>
            <TabsTrigger value="local" onClick={() => setSelectedRaceType("Local")} data-testid="tab-local">
              Local
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Custom Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary-foreground/90 mb-4">
                Build your own race with custom candidates and compare head-to-head with AI analysis
              </p>
              <Link href="/custom-prediction">
                <Button variant="secondary" className="w-full" data-testid="button-custom-prediction">
                  Create Custom Race
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-chart-3 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Natural Language Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90 mb-4">
                Ask election questions in plain English and get AI-powered predictions
              </p>
              <Link href="/natural-language">
                <Button variant="secondary" className="w-full" data-testid="button-natural-language">
                  Ask a Question
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Featured Matchups</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link href="/compare/presidential-primary">
              <Button variant="outline" className="w-full justify-start" data-testid="button-presidential-primary">
                Presidential Primary: Harris vs Obama
              </Button>
            </Link>
            <Link href="/compare/ny-senate">
              <Button variant="outline" className="w-full justify-start" data-testid="button-ny-senate">
                NY Senate: Schumer Replacement Scenarios
              </Button>
            </Link>
          </CardContent>
        </Card>

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
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-4">
                {selectedRaceType === "All" ? "Featured Races" : `${selectedRaceType} Races`}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFeaturedRaces().map(({ race, candidates, predictions }) => {
                const leadingPrediction = predictions.reduce(
                  (max, pred) => (pred.winProbability > max.winProbability ? pred : max),
                  predictions[0]
                );
                const leadingCandidate = candidates.find((c) => c.id === leadingPrediction?.candidateId);

                return (
                  <RaceCard
                    key={race.id}
                    race={race}
                    leadingCandidate={leadingCandidate?.name}
                    leadingProbability={leadingPrediction?.winProbability}
                    candidateCount={candidates.length}
                  />
                );
              })}
            </div>

            {filteredRaces && filteredRaces.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No races found for this category.</p>
              </Card>
            )}
          </>
        )}
      </main>

      <MethodologyModal open={methodologyOpen} onOpenChange={setMethodologyOpen} />
    </div>
  );
}
