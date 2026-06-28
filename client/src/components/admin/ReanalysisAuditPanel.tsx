import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PredictionFactors, PredictionSource } from "@shared/schema";

interface ReanalysisScorecard {
    candidateName: string;
    factors: PredictionFactors;
    factorRationales?: Partial<Record<keyof PredictionFactors, string>>;
    overallRationale?: string;
    compositeScore: number;
    normalizedProbability: number;
}

export interface ReanalysisAuditData {
    reanalyzedAt: string;
    summary?: string;
    analysis?: string;
    scorecards?: ReanalysisScorecard[];
    predictionSources?: PredictionSource[];
    sourceFreshness?: {
        lastCheckedAt?: string;
        sourceCount?: number;
        retrievedAt?: string;
    };
}

interface ReanalysisAuditPanelProps {
    audit: ReanalysisAuditData;
    title?: string;
}

const factorLabels: Record<keyof PredictionFactors, string> = {
    partisanLean: "Partisan Lean",
    polling: "Polling",
    candidateExperience: "Experience",
    fundraising: "Fundraising",
    nameRecognition: "Recognition",
    endorsements: "Endorsements",
    issueAlignment: "Issue Alignment",
    momentum: "Momentum",
};

function formatDate(value?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function ReanalysisAuditPanel({ audit, title = "Reanalysis Audit" }: ReanalysisAuditPanelProps) {
    const lastCheckedLabel = formatDate(audit.sourceFreshness?.lastCheckedAt || audit.reanalyzedAt);
    const retrievedLabel = formatDate(audit.sourceFreshness?.retrievedAt);

    return (
        <Card className="border-rose-300 bg-rose-50/60">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{audit.summary || "Audit details for the most recent reanalysis."}</CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                    {lastCheckedLabel && <Badge variant="outline">Last checked {lastCheckedLabel}</Badge>}
                    {retrievedLabel && <Badge variant="outline">Retrieved {retrievedLabel}</Badge>}
                    {audit.sourceFreshness?.sourceCount != null && (
                        <Badge variant="secondary">{audit.sourceFreshness.sourceCount} source{audit.sourceFreshness.sourceCount === 1 ? "" : "s"}</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {audit.analysis && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Analysis Summary</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{audit.analysis}</p>
                    </div>
                )}

                {audit.scorecards && audit.scorecards.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Scorecards</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {audit.scorecards.map((scorecard) => (
                                <Card key={scorecard.candidateName}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">{scorecard.candidateName}</CardTitle>
                                        <CardDescription>
                                            Composite {scorecard.compositeScore.toFixed(2)} | Probability {scorecard.normalizedProbability.toFixed(1)}%
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {Object.entries(scorecard.factors).map(([key, value]) => (
                                                <div key={key} className="rounded-md border p-2">
                                                    <p className="text-xs text-muted-foreground">{factorLabels[key as keyof PredictionFactors]}</p>
                                                    <p className="font-mono font-semibold">{value.toFixed(1)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {scorecard.overallRationale && (
                                            <p className="text-sm text-muted-foreground">{scorecard.overallRationale}</p>
                                        )}
                                        {scorecard.factorRationales && Object.keys(scorecard.factorRationales).length > 0 && (
                                            <ScrollArea className="h-32 rounded-md border p-3">
                                                <div className="space-y-2 text-sm">
                                                    {Object.entries(scorecard.factorRationales).map(([key, rationale]) => (
                                                        <div key={key}>
                                                            <p className="font-medium">{factorLabels[key as keyof PredictionFactors]}</p>
                                                            <p className="text-muted-foreground">{rationale}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {audit.predictionSources && audit.predictionSources.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Source List</h3>
                        <ScrollArea className="h-64 rounded-md border p-3">
                            <div className="space-y-3">
                                {audit.predictionSources.map((source) => (
                                    <div key={source.id} className="rounded-md border p-3">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <p className="font-medium">{source.sourceTitle}</p>
                                            <Badge variant="outline">{source.sourceType}</Badge>
                                            {source.factor && <Badge variant="secondary">{factorLabels[source.factor]}</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {formatDate(source.publishedAt) || "Unknown date"}
                                            {source.candidateId ? " | Candidate-linked" : " | Race-wide"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-2">{source.summary}</p>
                                        <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                                            {source.sourceUrl}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}