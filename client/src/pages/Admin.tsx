import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, TrendingUp, Eye, Calendar } from "lucide-react";
import type { FeaturedMatchup, SuggestedMatchup, Race } from "@shared/schema";
import { useState } from "react";

interface RaceWithData {
  race: Race;
  candidates: any[];
  predictions: any[];
}

export default function Admin() {
  const { toast } = useToast();
  const [newMatchup, setNewMatchup] = useState({
    title: "",
    description: "",
    url: "",
  });

  const { data: featuredMatchups = [], isLoading: loadingFeatured } = useQuery<FeaturedMatchup[]>({
    queryKey: ["/api/featured-matchups"],
  });

  const { data: suggestedMatchups = [], isLoading: loadingSuggested } = useQuery<SuggestedMatchup[]>({
    queryKey: ["/api/admin/suggested-matchups"],
  });

  const { data: racesData = [] } = useQuery<RaceWithData[]>({
    queryKey: ["/api/races"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newMatchup) => {
      return apiRequest("POST", "/api/admin/featured-matchups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured-matchups"] });
      setNewMatchup({ title: "", description: "", url: "" });
      toast({ title: "Featured matchup created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create matchup", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/featured-matchups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured-matchups"] });
      toast({ title: "Featured matchup deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete matchup", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteRaceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/races/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      toast({ title: "Race deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete race", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateFromSuggestion = (suggestion: SuggestedMatchup) => {
    const candidateNames = suggestion.candidates.map(c => c.name).join(" vs ");
    const url = `/races/${suggestion.race.id}`;
    
    setNewMatchup({
      title: candidateNames,
      description: `${suggestion.race.title} - ${suggestion.reason}`,
      url,
    });

    toast({ 
      title: "Suggestion loaded", 
      description: "Review and create the featured matchup below" 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchup.title.trim() || !newMatchup.description.trim() || !newMatchup.url.trim()) {
      toast({ 
        title: "All fields are required", 
        variant: "destructive" 
      });
      return;
    }
    createMutation.mutate(newMatchup);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage featured matchups and view suggested races</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Featured Matchup</CardTitle>
              <CardDescription>Add a new featured matchup to the homepage</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    data-testid="input-matchup-title"
                    placeholder="Harris vs Obama"
                    value={newMatchup.title}
                    onChange={(e) => setNewMatchup({ ...newMatchup, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="input-matchup-description"
                    placeholder="2028 Democratic Presidential Primary - The race everyone's watching"
                    value={newMatchup.description}
                    onChange={(e) => setNewMatchup({ ...newMatchup, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL Path</Label>
                  <Input
                    id="url"
                    data-testid="input-matchup-url"
                    placeholder="/races/presidential-primary-2028"
                    value={newMatchup.url}
                    onChange={(e) => setNewMatchup({ ...newMatchup, url: e.target.value })}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  data-testid="button-create-matchup"
                  disabled={createMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? "Creating..." : "Create Featured Matchup"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Featured Matchups</CardTitle>
              <CardDescription>
                {featuredMatchups.length} active matchup{featuredMatchups.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFeatured ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : featuredMatchups.length === 0 ? (
                <p className="text-muted-foreground">No featured matchups yet. Create one above or use a suggestion.</p>
              ) : (
                <div className="space-y-3">
                  {featuredMatchups.map((matchup) => (
                    <div
                      key={matchup.id}
                      data-testid={`matchup-${matchup.id}`}
                      className="flex items-start justify-between p-4 rounded-md border"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{matchup.title}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{matchup.description}</p>
                        <p className="text-xs text-muted-foreground">{matchup.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${matchup.id}`}
                        onClick={() => deleteMutation.mutate(matchup.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suggested Matchups</CardTitle>
            <CardDescription>AI-recommended races based on competitiveness, views, and timing</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSuggested ? (
              <p className="text-muted-foreground">Analyzing races...</p>
            ) : suggestedMatchups.length === 0 ? (
              <p className="text-muted-foreground">No suggestions available</p>
            ) : (
              <div className="space-y-3">
                {suggestedMatchups.map((suggestion, index) => {
                  const candidateNames = suggestion.candidates.map(c => c.name).join(" vs ");
                  const topPrediction = suggestion.predictions[0];
                  const margin = Math.abs(
                    suggestion.predictions[0].winProbability - 
                    suggestion.predictions[1].winProbability
                  );

                  return (
                    <div
                      key={`${suggestion.race.id}-${index}`}
                      data-testid={`suggestion-${index}`}
                      className="p-4 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => handleCreateFromSuggestion(suggestion)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{candidateNames}</h3>
                        <span className="text-xs font-mono text-muted-foreground">
                          {suggestion.score.toFixed(0)} pts
                        </span>
                      </div>
                      <p className="text-sm mb-2">{suggestion.race.title}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {margin.toFixed(1)}% margin
                        </div>
                        {suggestion.race.viewCount && suggestion.race.viewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {suggestion.race.viewCount} views
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(suggestion.race.electionDate).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">{suggestion.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Races</CardTitle>
          <CardDescription>
            {racesData.length} race{racesData.length !== 1 ? "s" : ""} in database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {racesData.length === 0 ? (
            <p className="text-muted-foreground">No races yet. Use Natural Language Analysis to create races.</p>
          ) : (
            <div className="space-y-3">
              {racesData.map(({ race, candidates, predictions }) => (
                <div
                  key={race.id}
                  data-testid={`race-${race.id}`}
                  className="flex items-start justify-between p-4 rounded-md border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{race.title}</h3>
                      <span className="text-xs text-muted-foreground">({race.type})</span>
                    </div>
                    {race.description && (
                      <p className="text-sm text-muted-foreground mb-1">{race.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
                      <span>{predictions.length} prediction{predictions.length !== 1 ? "s" : ""}</span>
                      {race.viewCount && race.viewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {race.viewCount} views
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-delete-race-${race.id}`}
                    onClick={() => deleteRaceMutation.mutate(race.id)}
                    disabled={deleteRaceMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
