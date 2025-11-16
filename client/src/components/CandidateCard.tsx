import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PartyBadge } from "./PartyBadge";
import { ProbabilityBar } from "./ProbabilityBar";
import type { Candidate, Prediction } from "@shared/schema";
import { TrendingUp, Briefcase, Users, MapPin } from "lucide-react";

interface CandidateCardProps {
  candidate: Candidate;
  prediction?: Prediction;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function CandidateCard({ candidate, prediction, onViewDetails, compact = false }: CandidateCardProps) {
  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  if (compact) {
    return (
      <Card className="hover-elevate transition-all" data-testid={`card-candidate-${candidate.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{candidate.name}</h3>
                <PartyBadge party={candidate.party} />
              </div>
              {prediction && (
                <p className="font-mono text-lg font-bold text-foreground mt-1" data-testid={`text-probability-${candidate.id}`}>
                  {prediction.winProbability.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-candidate-${candidate.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold mb-1 truncate">{candidate.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <PartyBadge party={candidate.party} />
                {candidate.position && (
                  <span className="text-sm text-muted-foreground">{candidate.position}</span>
                )}
              </div>
              {(candidate.state || candidate.district) && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {candidate.state}
                    {candidate.district && ` - ${candidate.district}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {prediction && (
        <CardContent className="pt-0 space-y-4">
          <ProbabilityBar
            probability={prediction.winProbability}
            party={candidate.party}
            confidenceInterval={prediction.confidenceInterval}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Polling</span>
              </div>
              <p className="font-mono text-sm font-semibold">{prediction.factors.polling.toFixed(1)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Demographics</span>
              </div>
              <p className="font-mono text-sm font-semibold">{prediction.factors.demographics.toFixed(1)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Recognition</span>
              </div>
              <p className="font-mono text-sm font-semibold">{prediction.factors.nameRecognition.toFixed(1)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>Experience</span>
              </div>
              <p className="font-mono text-sm font-semibold">{(prediction.factors.candidateExperience || 0).toFixed(1)}</p>
            </div>
          </div>

          {onViewDetails && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewDetails}
              data-testid={`button-view-details-${candidate.id}`}
            >
              View Details
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
