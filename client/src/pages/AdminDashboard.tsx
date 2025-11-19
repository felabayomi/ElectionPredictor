import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RaceCard } from "@/components/RaceCard";
import { CandidateCard } from "@/components/CandidateCard";
import { MethodologyModal } from "@/components/MethodologyModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Race, Candidate, Prediction, RaceType, FeaturedMatchup, Party, InsertCandidate } from "@shared/schema";
import { insertCandidateSchema } from "@shared/schema";
import { Link } from "wouter";
import { BarChart3, Info, Zap, Users, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface RaceWithPredictions {
  race: Race;
  candidates: Candidate[];
  predictions: Prediction[];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminDashboard() {
  const [selectedRaceType, setSelectedRaceType] = useState<RaceType | "All">("All");
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [reanalyzingRaceId, setReanalyzingRaceId] = useState<string | null>(null);
  const [managingRaceId, setManagingRaceId] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [editingMatchup, setEditingMatchup] = useState<FeaturedMatchup | null>(null);
  const [deletingMatchupId, setDeletingMatchupId] = useState<string | null>(null);
  const { toast } = useToast();
  
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

  const { data: racesData, isLoading } = useQuery<RaceWithPredictions[]>({
    queryKey: ["/api/races"],
  });

  const { data: featuredMatchups = [], isLoading: loadingFeatured } = useQuery<FeaturedMatchup[]>({
    queryKey: ["/api/featured-matchups"],
  });
  
  const { data: raceCandidates = [], isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/admin/races", managingRaceId, "candidates"],
    enabled: !!managingRaceId,
  });

  const updateRaceMutation = useMutation({
    mutationFn: async ({ id, title, raceType }: { id: string; title: string; raceType?: RaceType }) => {
      return apiRequest("PUT", `/api/admin/races/${id}`, { title, type: raceType });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      toast({ title: "Race updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update race", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const reanalyzeRaceMutation = useMutation({
    mutationFn: async (id: string) => {
      setReanalyzingRaceId(id);
      return apiRequest("POST", `/api/admin/races/${id}/reanalyze`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      setReanalyzingRaceId(null);
      toast({ 
        title: "Race reanalyzed successfully",
        description: "Predictions updated based on current political landscape"
      });
    },
    onError: (error: any) => {
      setReanalyzingRaceId(null);
      toast({ 
        title: "Failed to reanalyze race", 
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

  const updateMatchupMutation = useMutation({
    mutationFn: async ({ id, title, description, url }: { id: string; title: string; description: string; url: string }) => {
      return apiRequest("PUT", `/api/admin/featured-matchups/${id}`, { title, description, url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured-matchups"] });
      setEditingMatchup(null);
      toast({ title: "Featured matchup updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update matchup", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMatchupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/featured-matchups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured-matchups"] });
      setDeletingMatchupId(null);
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

  const filteredRaces = racesData?.filter(
    (item) => selectedRaceType === "All" || item.race.type === selectedRaceType
  );

  const getFeaturedRaces = () => {
    if (!filteredRaces) return [];
    return filteredRaces;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-md">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ElectionPredict Admin</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Election Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/felixdgreat/manage">
                <Button variant="outline" size="sm" data-testid="button-manage-matchups">
                  Manage Featured Matchups
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-public-view">
                  Public View
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMethodologyOpen(true)}
                data-testid="button-methodology"
              >
                <Info className="h-4 w-4 mr-2" />
                Methodology
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">Election Predictions Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of upcoming elections powered by AI and public data
          </p>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
            <TabsTrigger value="all" onClick={() => setSelectedRaceType("All")} data-testid="tab-all">
              All Races
            </TabsTrigger>
            <TabsTrigger
              value="presidential"
              onClick={() => setSelectedRaceType("Presidential")}
              data-testid="tab-presidential"
            >
              Presidential
            </TabsTrigger>
            <TabsTrigger value="senate" onClick={() => setSelectedRaceType("Senate")} data-testid="tab-senate">
              Senate
            </TabsTrigger>
            <TabsTrigger value="house" onClick={() => setSelectedRaceType("House")} data-testid="tab-house">
              House
            </TabsTrigger>
            <TabsTrigger value="governor" onClick={() => setSelectedRaceType("Governor")} data-testid="tab-governor">
              Governor
            </TabsTrigger>
            <TabsTrigger value="local" onClick={() => setSelectedRaceType("Local")} data-testid="tab-local">
              Local
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Custom Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary-foreground/90 mb-4">
                Build your own race with custom candidates and compare head-to-head with AI analysis
              </p>
              <Link href="/custom-prediction">
                <Button variant="secondary" className="w-full" data-testid="button-custom-prediction">
                  Create Custom Race
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-chart-3 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Natural Language Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90 mb-4">
                Ask election questions in plain English and get AI-powered predictions
              </p>
              <Link href="/natural-language">
                <Button variant="secondary" className="w-full" data-testid="button-natural-language">
                  Ask a Question
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {!loadingFeatured && featuredMatchups.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">Featured Matchups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredMatchups.map((matchup) => (
                <Card key={matchup.id} className="hover-elevate active-elevate-2 h-full" data-testid={`card-featured-${matchup.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={matchup.url} className="flex-1">
                        <CardTitle className="text-lg hover:underline cursor-pointer">{matchup.title}</CardTitle>
                      </Link>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-edit-matchup-${matchup.id}`}
                          onClick={() => setEditingMatchup(matchup)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-matchup-${matchup.id}`}
                          onClick={() => setDeletingMatchupId(matchup.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={matchup.url}>
                      <p className="text-sm text-muted-foreground hover:underline cursor-pointer">{matchup.description}</p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-4">
                {selectedRaceType === "All" ? "Featured Races" : `${selectedRaceType} Races`}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFeaturedRaces().map(({ race, candidates, predictions }) => {
                const candidatesWithPredictions = predictions
                  .map((pred) => ({
                    prediction: pred,
                    candidate: candidates.find((c) => c.id === pred.candidateId),
                  }))
                  .filter((item) => item.candidate)
                  .sort((a, b) => {
                    const probDiff = b.prediction.winProbability - a.prediction.winProbability;
                    if (probDiff !== 0) return probDiff;
                    return (a.candidate?.name || "").localeCompare(b.candidate?.name || "");
                  });

                const leadingItem = candidatesWithPredictions[0];

                return (
                  <RaceCard
                    key={race.id}
                    race={race}
                    leadingCandidate={leadingItem?.candidate?.name}
                    leadingProbability={leadingItem?.prediction?.winProbability}
                    candidateCount={candidates.length}
                    onEdit={(id, title, raceType) => updateRaceMutation.mutate({ id, title, raceType })}
                    editDisabled={updateRaceMutation.isPending}
                    onManageCandidates={(id) => setManagingRaceId(id)}
                    onReanalyze={(id) => reanalyzeRaceMutation.mutate(id)}
                    reanalyzeDisabled={reanalyzingRaceId === race.id}
                    onDelete={(id) => deleteRaceMutation.mutate(id)}
                    deleteDisabled={deleteRaceMutation.isPending}
                  />
                );
              })}
            </div>

            {filteredRaces && filteredRaces.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No races found for this category.</p>
              </Card>
            )}
          </>
        )}
      </main>

      <MethodologyModal open={methodologyOpen} onOpenChange={setMethodologyOpen} />
      
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

      {/* Edit Featured Matchup Dialog */}
      <Dialog open={!!editingMatchup} onOpenChange={(open) => {
        if (!open) setEditingMatchup(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Featured Matchup</DialogTitle>
            <DialogDescription>
              Update the title, description, or URL for this featured matchup
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (editingMatchup) {
              updateMatchupMutation.mutate({
                id: editingMatchup.id,
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                url: formData.get('url') as string,
              });
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input
                id="title"
                name="title"
                defaultValue={editingMatchup?.title}
                required
                data-testid="input-matchup-title"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Input
                id="description"
                name="description"
                defaultValue={editingMatchup?.description}
                required
                data-testid="input-matchup-description"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">URL</label>
              <Input
                id="url"
                name="url"
                defaultValue={editingMatchup?.url}
                required
                data-testid="input-matchup-url"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMatchup(null)}
                data-testid="button-cancel-edit-matchup"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMatchupMutation.isPending}
                data-testid="button-save-matchup"
              >
                {updateMatchupMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Featured Matchup Confirmation */}
      <AlertDialog open={!!deletingMatchupId} onOpenChange={(open) => {
        if (!open) setDeletingMatchupId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Featured Matchup</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this featured matchup from the homepage. The race itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-matchup"
              onClick={() => {
                if (deletingMatchupId) {
                  deleteMatchupMutation.mutate(deletingMatchupId);
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
