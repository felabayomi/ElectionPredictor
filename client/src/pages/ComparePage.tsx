import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import type { Candidate, ComparisonResult } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ComparePage() {
  const [candidate1Id, setCandidate1Id] = useState<string>("");
  const [candidate2Id, setCandidate2Id] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const { data: candidates, isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const compareMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest<ComparisonResult>(
        "POST",
        "/api/compare",
        { candidate1Id, candidate2Id }
      );
      return result;
    },
    onSuccess: (data) => {
      setComparisonResult(data);
    },
  });

  const handleCompare = () => {
    if (candidate1Id && candidate2Id && candidate1Id !== candidate2Id) {
      compareMutation.mutate();
    }
  };

  const canCompare = candidate1Id && candidate2Id && candidate1Id !== candidate2Id;

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
              <h1 className="text-2xl font-bold">Compare Candidates</h1>
              <p className="text-sm text-muted-foreground">Head-to-head analysis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Candidates to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Candidate 1</label>
                {candidatesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={candidate1Id} onValueChange={setCandidate1Id}>
                    <SelectTrigger data-testid="select-candidate1">
                      <SelectValue placeholder="Select first candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates?.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.party.charAt(0)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Candidate 2</label>
                {candidatesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={candidate2Id} onValueChange={setCandidate2Id}>
                    <SelectTrigger data-testid="select-candidate2">
                      <SelectValue placeholder="Select second candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates
                        ?.filter((c) => c.id !== candidate1Id)
                        .map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name} ({candidate.party.charAt(0)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                onClick={handleCompare}
                disabled={!canCompare || compareMutation.isPending}
                className="w-full"
                data-testid="button-generate-comparison"
              >
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Generate Comparison"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {compareMutation.isPending && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-24 w-24 rounded-full mb-4" />
                    <Skeleton className="h-8 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {comparisonResult && !compareMutation.isPending && (
          <ComparisonPanel comparison={comparisonResult} />
        )}

        {!comparisonResult && !compareMutation.isPending && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Select two candidates above to generate a comparison</p>
          </Card>
        )}
      </main>
    </div>
  );
}
