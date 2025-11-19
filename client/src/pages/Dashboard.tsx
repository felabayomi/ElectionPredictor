import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RaceCard } from "@/components/RaceCard";
import { MethodologyModal } from "@/components/MethodologyModal";
import { ShareButton } from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import type { Race, Candidate, Prediction, RaceType, FeaturedMatchup } from "@shared/schema";
import { Link } from "wouter";
import { BarChart3, Info, ExternalLink } from "lucide-react";

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

  const { data: featuredMatchups = [], isLoading: loadingFeatured } = useQuery<FeaturedMatchup[]>({
    queryKey: ["/api/featured-matchups"],
  });

  const filteredRaces = racesData?.filter(
    (item) => 
      (selectedRaceType === "All" || item.race.type === selectedRaceType) &&
      item.candidates.length > 0 &&
      item.predictions.length > 0
  );

  const getFeaturedRaces = () => {
    if (!filteredRaces) return [];
    return filteredRaces;
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
          <h2 className="text-4xl font-bold mb-2">Election Predictions</h2>
          <p className="text-muted-foreground">
            View comprehensive election analysis and predictions powered by AI
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

        <div className="mb-8">
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
            <Card className="bg-muted/50">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No featured matchups yet.
                </p>
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
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-2">
                    No races found for this category.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create races in <strong>Admin → Create Race</strong> or ask questions on <strong>Natural Language Analysis</strong>
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
