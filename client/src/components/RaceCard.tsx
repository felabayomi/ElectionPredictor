import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "./ShareButton";
import type { Race, RaceType } from "@shared/schema";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface RaceCardProps {
  race: Race;
  leadingCandidate?: string;
  leadingProbability?: number;
  candidateCount?: number;
  onDelete?: (id: string) => void;
  deleteDisabled?: boolean;
}

const raceTypeColors: Record<RaceType, string> = {
  Presidential: "bg-primary text-primary-foreground",
  Senate: "bg-chart-2 text-white",
  House: "bg-chart-3 text-white",
  Governor: "bg-chart-4 text-white",
  Local: "bg-chart-5 text-white",
};

export function RaceCard({ race, leadingCandidate, leadingProbability, candidateCount, onDelete, deleteDisabled }: RaceCardProps) {
  return (
    <Card className="hover-elevate transition-all" data-testid={`card-race-${race.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Badge className={`${raceTypeColors[race.type]} mb-2`}>{race.type}</Badge>
            <CardTitle className="text-lg truncate">{race.title}</CardTitle>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              data-testid={`button-delete-race-${race.id}`}
              onClick={(e) => {
                e.preventDefault();
                onDelete(race.id);
              }}
              disabled={deleteDisabled}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {leadingCandidate && leadingProbability && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Current Leader</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold truncate">{leadingCandidate}</p>
              <p className="font-mono font-bold text-primary">{leadingProbability.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {candidateCount && (
          <p className="text-sm text-muted-foreground">
            {candidateCount} candidate{candidateCount !== 1 ? "s" : ""} analyzed
          </p>
        )}

        <div className="flex gap-2">
          <Link href={`/race/${race.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-analysis-${race.id}`}>
              View Analysis
            </Button>
          </Link>
          <ShareButton
            title={race.title}
            text={leadingCandidate && leadingProbability 
              ? `🗳️ Based on the scenario analysis, ${leadingCandidate} currently has the highest estimated win probability at ${leadingProbability.toFixed(1)}% in the ${race.title}.`
              : `🗳️ Check out the ${race.title} election analysis on ElectionPredict!`}
            url={`${window.location.origin}/race/${race.id}`}
            variant="outline"
            size="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}
