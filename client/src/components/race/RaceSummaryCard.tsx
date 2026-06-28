import { Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { Race } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ShareButton";

interface RaceSummaryCardProps {
    race: Race;
    leadingCandidate?: string;
    leadingProbability?: number;
    leadingDataQualityScore?: number;
    hasRecentPolling?: boolean;
    candidateCount?: number;
    lastCheckedAt?: string;
}

function getAbsoluteUrl(path: string): string {
    if (typeof window === "undefined") {
        return path;
    }

    try {
        return new URL(path, window.location.origin).toString();
    } catch {
        return path;
    }
}

export function RaceSummaryCard({ race, leadingCandidate, leadingProbability, leadingDataQualityScore, hasRecentPolling, candidateCount, lastCheckedAt }: RaceSummaryCardProps) {
    const racePath = `/race/${race.id}`;
    const shareUrl = getAbsoluteUrl(racePath);
    const formattedLastCheckedAt = lastCheckedAt
        ? new Date(lastCheckedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : null;

    return (
        <>
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

            {leadingCandidate && leadingProbability != null && (
                <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Current Leader</p>
                    <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">{leadingCandidate}</p>
                        <p className="font-mono font-bold text-primary">{leadingProbability.toFixed(1)}%</p>
                    </div>
                </div>
            )}

            {candidateCount != null && (
                <p className="text-sm text-muted-foreground">
                    {candidateCount} candidate{candidateCount !== 1 ? "s" : ""} analyzed
                </p>
            )}

            {(leadingDataQualityScore != null || hasRecentPolling != null || formattedLastCheckedAt) && (
                <div className="flex flex-wrap gap-2">
                    {leadingDataQualityScore != null && (
                        <Badge variant={leadingDataQualityScore >= 75 ? "default" : leadingDataQualityScore >= 50 ? "secondary" : "destructive"}>
                            Data quality: {leadingDataQualityScore}/100
                        </Badge>
                    )}
                    {hasRecentPolling != null && (
                        <Badge variant={hasRecentPolling ? "default" : "secondary"}>
                            {hasRecentPolling ? "Recent polling" : "No recent polling"}
                        </Badge>
                    )}
                    {formattedLastCheckedAt && (
                        <Badge variant="outline">
                            Last checked {formattedLastCheckedAt}
                        </Badge>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <Link href={racePath} className="flex-1">
                    <Button variant="outline" className="w-full" data-testid={`button-view-analysis-${race.id}`}>
                        View Analysis
                    </Button>
                </Link>
                <ShareButton
                    title={race.title}
                    text={leadingCandidate && leadingProbability != null
                        ? `🗳️ Based on the scenario analysis, ${leadingCandidate} currently has the highest estimated win probability at ${leadingProbability.toFixed(1)}% in the ${race.title}. ${shareUrl}`
                        : `🗳️ Check out the ${race.title} election analysis on ElectionPredict! ${shareUrl}`}
                    url={shareUrl}
                    variant="outline"
                    size="default"
                />
            </div>
        </>
    );
}
