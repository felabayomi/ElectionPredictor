import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, Prediction } from "@shared/schema";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

interface AnalysisResult {
  raceId: string;
  query: string;
  raceTitle: string;
  candidates: Candidate[];
  predictions: Prediction[];
  analysis: string;
}

export default function NaturalLanguageAnalysis() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

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
      toast({
        title: "Analysis Complete",
        description: `Saved race with ${data.candidates?.length || 0} candidates. Redirecting...`,
      });
      
      setTimeout(() => {
        setLocation(`/race/${data.raceId}`);
      }, 1000);
    },
    onError: (error) => {
      console.error("Natural language analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze your question. Please try again.";
      const isFactFinding = errorMessage.includes("FACT_FINDING_QUESTION:");
      
      toast({
        title: isFactFinding ? "Research Question Detected" : "Analysis Failed",
        description: isFactFinding 
          ? errorMessage.replace("FACT_FINDING_QUESTION: ", "")
          : errorMessage,
        variant: isFactFinding ? "default" : "destructive",
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
      label: "Presidential Primary (3+ Candidates)",
      query: "What are the win probabilities for Gavin Newsom, Gretchen Whitmer, and Josh Shapiro in a potential 2028 Democratic presidential primary?"
    },
    {
      label: "Republican Senate Race",
      query: "If Ted Cruz retires, who would win the 2028 Texas Republican Senate primary? Dan Crenshaw, Greg Abbott, John Cornyn"
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
              <div className={`text-sm p-3 rounded-md ${
                analyzeMutation.error instanceof Error && analyzeMutation.error.message.includes("FACT_FINDING_QUESTION:")
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}>
                <p className="font-medium mb-1">
                  {analyzeMutation.error instanceof Error && analyzeMutation.error.message.includes("FACT_FINDING_QUESTION:")
                    ? "Research Question Detected"
                    : "Analysis Failed"
                  }
                </p>
                <p className="text-sm">
                  {analyzeMutation.error instanceof Error 
                    ? analyzeMutation.error.message.replace("FACT_FINDING_QUESTION: ", "")
                    : "Analysis failed"
                  }
                </p>
              </div>
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
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Your Question...</h3>
            <p className="text-sm text-muted-foreground">
              Our AI is processing your query and generating predictions. This may take a moment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
