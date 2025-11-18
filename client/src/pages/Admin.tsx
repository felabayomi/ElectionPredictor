import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, TrendingUp, Eye, Calendar, Users, Pencil } from "lucide-react";
import type { FeaturedMatchup, SuggestedMatchup, Race, InsertCandidate, Candidate } from "@shared/schema";
import { insertCandidateSchema } from "@shared/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface RaceWithData {
  race: Race;
  candidates: any[];
  predictions: any[];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Admin() {
  const { toast } = useToast();
  const [newMatchup, setNewMatchup] = useState({
    title: "",
    description: "",
    url: "",
  });
  const [managingRaceId, setManagingRaceId] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  
  const form = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      name: "",
      party: "Democratic",
      photoUrl: "",
    },
  });
  
  const editForm = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      name: "",
      party: "Democratic",
      photoUrl: "",
    },
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
  
  const { data: raceCandidates = [], isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/admin/races", managingRaceId, "candidates"],
    enabled: !!managingRaceId,
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
  
  const addCandidateMutation = useMutation({
    mutationFn: async (data: InsertCandidate) => {
      return await apiRequest<Candidate>("POST", `/api/admin/races/${managingRaceId}/candidates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/races", managingRaceId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      form.reset();
      toast({ title: "Candidate added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add candidate", variant: "destructive" });
    },
  });
  
  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCandidate> }) => {
      return await apiRequest<Candidate>("PUT", `/api/admin/candidates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/races", managingRaceId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      setEditingCandidate(null);
      toast({ title: "Candidate updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update candidate", variant: "destructive" });
    },
  });
  
  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/races", managingRaceId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      setDeletingCandidateId(null);
      toast({ title: "Candidate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete candidate", variant: "destructive" });
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-manage-race-candidates-${race.id}`}
                      onClick={() => setManagingRaceId(race.id)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Candidates
                    </Button>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Manage Candidates Dialog */}
      <Dialog open={!!managingRaceId} onOpenChange={(open) => {
        if (!open) {
          setManagingRaceId(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Candidates</DialogTitle>
            <DialogDescription>
              Add, edit, or remove candidates for this race
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Candidates List */}
            {loadingCandidates ? (
              <div className="text-center py-4 text-muted-foreground">Loading candidates...</div>
            ) : raceCandidates.length > 0 ? (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Existing Candidates ({raceCandidates.length})</h4>
                  <div className="max-h-[30vh] overflow-y-auto border rounded-md p-4 space-y-2">
                    {raceCandidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`candidate-item-${candidate.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
                          <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{candidate.name}</p>
                          <Badge variant="outline" className="text-xs">{candidate.party}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCandidate(candidate);
                              editForm.reset({
                                name: candidate.name,
                                party: candidate.party,
                                photoUrl: candidate.photoUrl || "",
                              });
                            }}
                            data-testid={`button-edit-candidate-${candidate.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCandidateId(candidate.id)}
                            data-testid={`button-delete-candidate-${candidate.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-4" />
              </>
            ) : null}
            
            {/* Add New Candidate Form */}
            <div>
              <h4 className="text-sm font-medium mb-3">Add New Candidate</h4>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  addCandidateMutation.mutate(data);
                })} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Hakeem Jeffries" {...field} data-testid="input-candidate-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="party"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-candidate-party">
                              <SelectValue placeholder="Select party" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Democratic">Democratic</SelectItem>
                            <SelectItem value="Republican">Republican</SelectItem>
                            <SelectItem value="Independent">Independent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/photo.jpg" {...field} data-testid="input-candidate-photo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setManagingRaceId(null);
                        form.reset();
                      }}
                    >
                      Done
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      data-testid="button-add-candidate"
                      disabled={addCandidateMutation.isPending}
                    >
                      {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Candidate Dialog */}
      <Dialog open={!!editingCandidate} onOpenChange={(open) => {
        if (!open) {
          setEditingCandidate(null);
          editForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update candidate information
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (editingCandidate) {
                updateCandidateMutation.mutate({ id: editingCandidate.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-candidate-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="party"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-candidate-party">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Democratic">Democratic</SelectItem>
                        <SelectItem value="Republican">Republican</SelectItem>
                        <SelectItem value="Independent">Independent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-candidate-photo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingCandidate(null);
                    editForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  data-testid="button-update-candidate"
                  disabled={updateCandidateMutation.isPending}
                >
                  {updateCandidateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Candidate Confirmation */}
      <AlertDialog open={!!deletingCandidateId} onOpenChange={(open) => {
        if (!open) setDeletingCandidateId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this candidate and all associated predictions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-candidate"
              onClick={() => {
                if (deletingCandidateId) {
                  deleteCandidateMutation.mutate(deletingCandidateId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
