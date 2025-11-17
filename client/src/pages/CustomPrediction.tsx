import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Party, Candidate, Prediction } from "@shared/schema";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";

interface CustomCandidate {
  name: string;
  party: Party;
}

interface AnalysisResult {
  raceId: string;
  title: string;
  candidates: Candidate[];
  predictions: Prediction[];
  analysis: string;
}

export default function CustomPrediction() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [candidates, setCandidates] = useState<CustomCandidate[]>([
    { name: "", party: "Democratic" },
    { name: "", party: "Republican" },
  ]);
  const [raceTitle, setRaceTitle] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const validCandidates = candidates.filter((c) => c.name.trim()).map(c => ({
        name: c.name.trim(),
        party: c.party
      }));
      
      if (validCandidates.length < 2) {
        throw new Error("Please enter at least 2 candidates");
      }

      const result = await apiRequest<AnalysisResult>(
        "POST",
        "/api/custom-prediction",
        {
          candidates: validCandidates,
          raceTitle: raceTitle.trim() || "Custom Race Analysis",
        }
      );
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Race Created Successfully",
        description: "Redirecting to race details...",
      });
      
      setTimeout(() => {
        setLocation(`/race/${data.raceId}`);
      }, 1000);
    },
    onError: (error) => {
      console.error("Custom prediction error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to generate prediction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCandidate = (index: number, field: keyof CustomCandidate, value: string) => {
    const updated = [...candidates];
    updated[index] = { ...updated[index], [field]: value };
    setCandidates(updated);
  };

  const addCandidate = () => {
    setCandidates([...candidates, { name: "", party: "Independent" }]);
  };

  const removeCandidate = (index: number) => {
    if (candidates.length > 2) {
      setCandidates(candidates.filter((_, i) => i !== index));
    }
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate();
  };

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
              <h1 className="text-2xl font-bold">Custom Candidate Prediction</h1>
              <p className="text-sm text-muted-foreground">Build your own race scenario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Race Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Race Title (Optional)</label>
                <Input
                  placeholder="e.g., 2028 New York Senate Race"
                  value={raceTitle}
                  onChange={(e) => setRaceTitle(e.target.value)}
                  data-testid="input-race-title"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Candidates</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Add 2 or more candidates to compare</p>
            </div>
            <Button
              onClick={addCandidate}
              variant="outline"
              size="sm"
              data-testid="button-add-candidate"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Candidate
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates.map((candidate, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder={`Candidate ${index + 1} name`}
                      value={candidate.name}
                      onChange={(e) => updateCandidate(index, "name", e.target.value)}
                      data-testid={`input-candidate-name-${index}`}
                    />
                    <Select
                      value={candidate.party}
                      onValueChange={(value) => updateCandidate(index, "party", value as Party)}
                    >
                      <SelectTrigger data-testid={`select-party-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Democratic">Democratic</SelectItem>
                        <SelectItem value="Republican">Republican</SelectItem>
                        <SelectItem value="Independent">Independent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge
                    className={
                      candidate.party === "Democratic"
                        ? "bg-democrat text-democrat-foreground"
                        : candidate.party === "Republican"
                          ? "bg-republican text-republican-foreground"
                          : "bg-independent text-independent-foreground"
                    }
                  >
                    {candidate.party.charAt(0)}
                  </Badge>
                  {candidates.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCandidate(index)}
                      data-testid={`button-remove-candidate-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || candidates.filter((c) => c.name.trim()).length < 2}
              className="w-full mt-6"
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Generate AI Prediction"
              )}
            </Button>

            {analyzeMutation.isError && (
              <p className="text-sm text-destructive mt-2">
                {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : "Analysis failed"}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
