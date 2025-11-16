import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateCard } from "@/components/CandidateCard";
import type { Race, Candidate, Prediction } from "@shared/schema";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";

interface RaceDetailData {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
}

export default function RaceDetail() {
  const [, params] = useRoute("/race/:id");
  const raceId = params?.id;

  const { data, isLoading } = useQuery<RaceDetailData>({
    queryKey: ["/api/races", raceId || ""],
    enabled: !!raceId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-12 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Race not found</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { race, candidates, predictions } = data;

  const candidatesWithPredictions = candidates
    .map((candidate) => ({
      candidate,
      prediction: predictions.find((p) => p.candidateId === candidate.id),
    }))
    .sort((a, b) => (b.prediction?.winProbability || 0) - (a.prediction?.winProbability || 0));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{race.title}</h1>
              <p className="text-sm text-muted-foreground">{race.type} Race</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-3xl mb-3">{race.title}</CardTitle>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground">{race.type}</Badge>
                  {(race.state || race.district) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {race.state}
                        {race.district && ` - ${race.district}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(race.electionDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          {race.description && (
            <CardContent>
              <p className="text-muted-foreground">{race.description}</p>
            </CardContent>
          )}
        </Card>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Candidates ({candidates.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidatesWithPredictions.map(({ candidate, prediction }) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              prediction={prediction}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
