import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CandidateCard } from "@/components/CandidateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, Prediction } from "@shared/schema";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface AnalysisResult {
  query: string;
  raceTitle: string;
  candidates: Candidate[];
  predictions: Prediction[];
  analysis: string;
}

export default function NaturalLanguageAnalysis() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!query.trim()) {
        throw new Error("Please enter a question or scenario");
      }

      const data = await apiRequest<AnalysisResult>(
        "POST",
        "/api/natural-language-analysis",
        { query: query.trim() }
      );
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.candidates?.length || 0} candidates in your query.`,
      });
    },
    onError: (error) => {
      console.error("Natural language analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze your question. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate();
  };

  const exampleQueries = [
    {
      label: "Multiple Candidates (Comma-Separated)",
      query: "Who would win the 2028 California Senate race? Consider these candidates: Adam Schiff, Katie Porter, Barbara Lee, Eric Swalwell"
    },
    {
      label: "Multiple Candidates (Bulleted List)",
      query: `If Chuck Schumer retires, who could win his Senate seat in 2028? Top contenders:
• Alexandria Ocasio-Cortez
• Letitia James
• Pat Ryan
• Ritchie Torres
• Tom Suozzi`
    },
    {
      label: "Head-to-Head Matchup",
      query: "Who would win in a Democratic presidential primary between Kamala Harris and Michelle Obama?"
    },
    {
      label: "Ideological Comparison",
      query: "Compare the chances of progressive vs moderate Democrats in a contested New York Senate primary"
    },
    {
      label: "Governor Race Analysis",
      query: "What are the win probabilities for Gavin Newsom, Gretchen Whitmer, and Josh Shapiro in a potential 2028 Democratic presidential primary?"
    }
  ];

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
              <h1 className="text-2xl font-bold">Natural Language Analysis</h1>
              <p className="text-sm text-muted-foreground">Ask questions in plain English</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask Your Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Enter your election prediction question or scenario
              </label>
              <Textarea
                placeholder="Example: Which candidates can win Schumer's Senate seat if he retires in 2028? Alexandria Ocasio-Cortez, Letitia James, Pat Ryan, Ritchie Torres, Tom Suozzi"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="resize-none"
                data-testid="textarea-query"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Include candidate names in your question for more accurate analysis
              </p>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !query.trim()}
              className="w-full"
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Question
                </>
              )}
            </Button>

            {analyzeMutation.isError && (
              <p className="text-sm text-destructive">
                {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : "Analysis failed"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Example Questions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click any example to try it. Include specific candidate names for best results.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {exampleQueries.map((example, index) => (
              <div key={index} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  {example.label}
                </p>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => setQuery(example.query)}
                  data-testid={`button-example-${index}`}
                >
                  <span className="text-sm whitespace-pre-wrap">{example.query}</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {analyzeMutation.isPending && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          </div>
        )}

        {result && !analyzeMutation.isPending && result.candidates && result.candidates.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{result.raceTitle}</CardTitle>
                <Badge className="w-fit">AI-Powered Analysis</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Your Question:</h3>
                    <p className="text-sm text-muted-foreground italic">{result.query}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Analysis:</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Predicted Outcomes ({result.candidates.length} candidates)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.candidates
                  .map((candidate) => ({
                    candidate,
                    prediction: result.predictions.find((p) => p.candidateId === candidate.id),
                  }))
                  .sort((a, b) => (b.prediction?.winProbability || 0) - (a.prediction?.winProbability || 0))
                  .map(({ candidate, prediction }) => (
                    <CandidateCard key={candidate.id} candidate={candidate} prediction={prediction} />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
