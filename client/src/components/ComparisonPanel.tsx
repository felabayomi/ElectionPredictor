import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PartyBadge } from "./PartyBadge";
import { ProbabilityBar } from "./ProbabilityBar";
import { Separator } from "./ui/separator";
import { ShareButton } from "./ShareButton";
import type { ComparisonResult } from "@shared/schema";
import { ArrowRight, TrendingUp, DollarSign, Users, MapPin, Award, Clock } from "lucide-react";

interface ComparisonPanelProps {
  comparison: ComparisonResult;
}

export function ComparisonPanel({ comparison }: ComparisonPanelProps) {
  const { candidate1, candidate2, prediction1, prediction2, factorComparison, aiInsights } = comparison;

  if (!candidate1 || !candidate2 || !prediction1 || !prediction2) {
    return (
      <Card className="p-12">
        <p className="text-center text-muted-foreground">Unable to load comparison data. Please try again.</p>
      </Card>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const factorIcons: Record<string, any> = {
    polling: TrendingUp,
    fundraising: DollarSign,
    nameRecognition: Users,
    demographics: MapPin,
    endorsements: Award,
    historicalTrends: Clock,
  };

  const factorLabels: Record<string, string> = {
    polling: "Polling Average",
    fundraising: "Fundraising",
    nameRecognition: "Name Recognition",
    demographics: "Demographics",
    endorsements: "Endorsements",
    historicalTrends: "Historical Trends",
  };

  const shareText = `⚖️ ${candidate1.name} vs ${candidate2.name} in ${race.title}: ${prediction1.winProbability.toFixed(1)}% vs ${prediction2.winProbability.toFixed(1)}%. Check out this AI-powered election analysis!`;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Head-to-Head Comparison</h2>
        <ShareButton
          title={`${candidate1.name} vs ${candidate2.name} - ${race.title}`}
          text={shareText}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          variant="outline"
          size="sm"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-candidate1">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-24 w-24 shrink-0">
                {candidate1.photoUrl && <AvatarImage src={candidate1.photoUrl} alt={candidate1.name} />}
                <AvatarFallback className="text-2xl">{getInitials(candidate1.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2 truncate">{candidate1.name}</CardTitle>
                <PartyBadge party={candidate1.party} className="mb-2" />
                {candidate1.position && (
                  <p className="text-sm text-muted-foreground">{candidate1.position}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProbabilityBar
              probability={prediction1.winProbability}
              party={candidate1.party}
              confidenceInterval={prediction1.confidenceInterval}
            />
          </CardContent>
        </Card>

        <Card data-testid="card-candidate2">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-24 w-24 shrink-0">
                {candidate2.photoUrl && <AvatarImage src={candidate2.photoUrl} alt={candidate2.name} />}
                <AvatarFallback className="text-2xl">{getInitials(candidate2.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2 truncate">{candidate2.name}</CardTitle>
                <PartyBadge party={candidate2.party} className="mb-2" />
                {candidate2.position && (
                  <p className="text-sm text-muted-foreground">{candidate2.position}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProbabilityBar
              probability={prediction2.winProbability}
              party={candidate2.party}
              confidenceInterval={prediction2.confidenceInterval}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factor-by-Factor Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {factorComparison.map((factor, index) => {
              const Icon = factorIcons[factor.factor] || TrendingUp;
              const isCandidate1Leading = factor.candidate1Score > factor.candidate2Score;
              const diff = Math.abs(factor.candidate1Score - factor.candidate2Score);

              return (
                <div key={factor.factor}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{factor.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="text-right">
                        <span
                          className={`font-mono text-lg font-bold ${isCandidate1Leading ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {factor.candidate1Score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <ArrowRight
                          className={`h-4 w-4 ${isCandidate1Leading ? "text-foreground rotate-180" : "text-foreground"}`}
                        />
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="text-left">
                        <span
                          className={`font-mono text-lg font-bold ${!isCandidate1Leading ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {factor.candidate2Score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      {factor.advantage} (+{diff.toFixed(1)})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsights}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
