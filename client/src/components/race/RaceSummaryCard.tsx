import { Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { Race } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ShareButton";

interface RaceSummaryCardProps {
    race: Race;
    displayDate?: string;
    leadingCandidate?: string;
    leadingProbability?: number;
    leadingDataQualityScore?: number;
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

function formatElectionDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(undefined, { timeZone: "UTC" });
}

function getConfidenceDetails(score?: number): { label: string; variant: "default" | "secondary" | "destructive" } | null {
    if (score == null) return null;
    if (score >= 75) return { label: "High confidence", variant: "default" };
    if (score >= 50) return { label: "Medium confidence", variant: "secondary" };
    return { label: "Low confidence", variant: "destructive" };
}

export function RaceSummaryCard({ race, displayDate, leadingCandidate, leadingProbability, leadingDataQualityScore, candidateCount, lastCheckedAt }: RaceSummaryCardProps) {
    const racePath = `/race/${race.id}`;
    const shareUrl = getAbsoluteUrl(racePath);
    const formattedLastCheckedAt = lastCheckedAt
        ? new Date(lastCheckedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : null;
    const confidenceDetails = getConfidenceDetails(leadingDataQualityScore);

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
                <span>{formatElectionDate(displayDate || race.electionDate)}</span>
            </div>

            {leadingCandidate && leadingProbability != null && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <p className="text-sm text-muted-foreground mb-1">Current Leader</p>
                    <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">{leadingCandidate}</p>
                        <div className="flex flex-col items-end gap-1">
                            <p className="font-mono font-bold text-primary">{leadingProbability.toFixed(1)}%</p>
                            {confidenceDetails && (
                                <Badge variant={confidenceDetails.variant} className="text-[11px] leading-none">
                                    {confidenceDetails.label}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, leadingProbability))}%` }}
                        />
                    </div>
                </div>
            )}

            {candidateCount != null && (
                <p className="text-sm text-muted-foreground">
                    {candidateCount} candidate{candidateCount !== 1 ? "s" : ""} analyzed
                </p>
            )}

            {formattedLastCheckedAt && (
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                        Last updated {formattedLastCheckedAt}
                    </Badge>
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
