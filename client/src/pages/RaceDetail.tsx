import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateCard } from "@/components/CandidateCard";
import { ShareButton } from "@/components/ShareButton";
import { apiRequest, queryClient, SUBSCRIBER_EMAIL_STORAGE_KEY } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import type { Race, Candidate, Prediction, SubscriberProfile } from "@shared/schema";
import { ArrowLeft, Calendar, Mail, MapPin, RefreshCw, User } from "lucide-react";

interface RaceDetailData {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
  lastCheckedAt?: string;
}

function formatElectionDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, { timeZone: "UTC" });
}

function formatCreatedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function resolveRaceCreatedAt(
  race: Race,
  predictions: Prediction[],
  lastCheckedAt?: string,
): string {
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

interface ReanalysisResponse {
  mode?: string;
  model?: string | null;
  fallbackReason?: string | null;
  changeSummary?: {
    changedCandidates?: number;
    unchangedCandidates?: number;
    maxDelta?: number;
  };
}

const SUPPORT_EMAIL = "ccspcivicos@gmail.com";

function openSupportEmail(action: "edit" | "delete", race: Race, subscriberEmail: string) {
  const normalizedSubscriberEmail = subscriberEmail.trim().toLowerCase();
  const subject = `[ElectionPredictor] ${action.toUpperCase()} request for ${race.title}`;
  const bodyLines = [
    `Hello ElectionPredictor Support,`,
    "",
    `I am requesting a ${action} change for this race scenario:`,
    `Race ID: ${race.id}`,
    `Race title: ${race.title}`,
    `Election date: ${race.electionDate}`,
    "",
    "Requested changes / reason:",
    "- ",
    "",
    `Subscriber email: ${normalizedSubscriberEmail || "(not provided)"}`,
    "",
    "Thank you.",
  ];

  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  if (typeof window !== "undefined") {
    window.location.href = mailtoUrl;
  }
}

export default function RaceDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/race/:id");
  const raceId = params?.id;
  const subscriberEmail = typeof window !== "undefined"
    ? (window.localStorage.getItem(SUBSCRIBER_EMAIL_STORAGE_KEY) || "").trim().toLowerCase()
    : "";

  const { data, isLoading, isError, error } = useQuery<RaceDetailData>({
    queryKey: ["/api/races", raceId || ""],
    enabled: !!raceId,
  });

  // Fetch subscriber profile if race has createdByEmail
  const { data: subscriberProfile } = useQuery<SubscriberProfile | null>({
    queryKey: ["/api/subscriber-profiles", data?.race?.createdByEmail || ""],
    enabled: !!(data?.race?.createdByEmail),
    queryFn: async () => {
      if (!data?.race?.createdByEmail) return null;
      try {
        const response = await apiRequest<SubscriberProfile>(
          "GET",
          `/api/subscriber-profiles?email=${encodeURIComponent(data.race.createdByEmail)}`,
        );
        return response || null;
      } catch {
        // Profile might not be public or doesn't exist - that's ok
        return null;
      }
    },
  });

  const raceLookupError = getErrorMessage(error, "");
  const raceNotFound = isError && /^404\b/.test(raceLookupError);

  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      if (!raceId) throw new Error("Race ID is missing.");
      if (!subscriberEmail) throw new Error("Save your subscriber email in Subscriber Studio first.");
      return apiRequest<ReanalysisResponse>("POST", `/api/subscriber/races/${raceId}/reanalyze`, {});
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/races", raceId || ""] });
      void queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      const moved = result.changeSummary?.changedCandidates ?? 0;
      const unchanged = result.changeSummary?.unchangedCandidates ?? 0;
      const maxDelta = Number(result.changeSummary?.maxDelta || 0).toFixed(1);
      toast({
        title: "Race reanalyzed",
        description: `Mode: ${result.mode || "unknown"} | Changed: ${moved} | Unchanged: ${unchanged} | Max shift: ${maxDelta} pts`,
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to reanalyze",
        description: getErrorMessage(error, "Please check subscription status and try again."),
        variant: "destructive",
      });
    },
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

  if (raceNotFound || !data) {
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

  const { race, candidates, predictions, lastCheckedAt } = data;
  const raceCreatedAt = resolveRaceCreatedAt(race, predictions, lastCheckedAt);

  const candidatesWithPredictions = candidates
    .map((candidate) => ({
      candidate,
      prediction: predictions.find((p) => p.candidateId === candidate.id),
    }))
    .sort((a, b) => {
      const probDiff = (b.prediction?.winProbability || 0) - (a.prediction?.winProbability || 0);
      if (probDiff !== 0) return probDiff;
      return a.candidate.name.localeCompare(b.candidate.name);
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
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
            <ShareButton
              title={race.title}
              text={candidatesWithPredictions.length > 0
                ? `🗳️ Based on the scenario analysis, ${candidatesWithPredictions[0]?.candidate.name} currently has the highest estimated win probability at ${candidatesWithPredictions[0]?.prediction?.winProbability.toFixed(1)}% in the ${race.title}. ${typeof window !== 'undefined' ? window.location.href : ''}`
                : `🗳️ Check out the ${race.title} election analysis on ElectionPredict! ${typeof window !== 'undefined' ? window.location.href : ''}`}
              url={typeof window !== 'undefined' ? window.location.href : ''}
              variant="outline"
              size="sm"
            />
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
                    <span>
                      {formatCreatedDate(raceCreatedAt)}
                    </span>
                  </div>
                  {lastCheckedAt && (
                    <Badge variant="outline">Last checked {new Date(lastCheckedAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => reanalyzeMutation.mutate()}
                  disabled={reanalyzeMutation.isPending}
                  data-testid="button-subscriber-reanalyze"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${reanalyzeMutation.isPending ? "animate-spin" : ""}`} />
                  {reanalyzeMutation.isPending ? "Reanalyzing..." : "Reanalyze"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openSupportEmail("edit", race, subscriberEmail)}
                  data-testid="button-request-edit"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openSupportEmail("delete", race, subscriberEmail)}
                  data-testid="button-request-delete"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          {race.description && (
            <CardContent>
              <p className="text-muted-foreground mb-4">{race.description}</p>
            </CardContent>
          )}
          {race.createdByEmail && (
            <CardContent className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                {subscriberProfile ? (
                  <div>
                    <span className="text-muted-foreground">Generated by </span>
                    <Link href={`/subscriber-profile/${encodeURIComponent(race.createdByEmail)}`}>
                      <a className="font-medium text-primary hover:underline">{subscriberProfile.displayName || "Anonymous Subscriber"}</a>
                    </Link>
                    <span className="text-muted-foreground"> in Subscriber Studio</span>
                    {subscriberProfile.bio && (
                      <p className="text-xs text-muted-foreground mt-1">{subscriberProfile.bio}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Generated by Subscriber Studio</span>
                )}
              </div>
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
