import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "./ShareButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Race, RaceType, Party, Candidate, InsertCandidate } from "@shared/schema";
import { insertCandidateSchema } from "@shared/schema";
import { Calendar, MapPin, Trash2, Pencil, RefreshCw, Users } from "lucide-react";
import { Link } from "wouter";

interface RaceCardProps {
  race: Race;
  leadingCandidate?: string;
  leadingProbability?: number;
  candidateCount?: number;
  onDelete?: (id: string) => void;
  deleteDisabled?: boolean;
  onEdit?: (id: string, title: string, raceType: RaceType) => void;
  editDisabled?: boolean;
  onReanalyze?: (id: string) => void;
  reanalyzeDisabled?: boolean;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const raceTypeColors: Record<RaceType, string> = {
  Presidential: "bg-primary text-primary-foreground",
  Senate: "bg-chart-2 text-white",
  House: "bg-chart-3 text-white",
  Governor: "bg-chart-4 text-white",
  Local: "bg-chart-5 text-white",
};

export function RaceCard({ race, leadingCandidate, leadingProbability, candidateCount, onDelete, deleteDisabled, onEdit, editDisabled, onReanalyze, reanalyzeDisabled }: RaceCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(race.title);
  const [editedRaceType, setEditedRaceType] = useState<RaceType>(race.type);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);
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

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/admin/races', race.id, 'candidates'],
    enabled: isCandidateDialogOpen,
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (data: InsertCandidate) => {
      return await apiRequest<Candidate>("POST", `/api/admin/races/${race.id}/candidates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/races', race.id, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/races', race.id, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      setCandidateToEdit(null);
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/races', race.id, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      setCandidateToDelete(null);
      toast({ title: "Candidate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete candidate", variant: "destructive" });
    },
  });

  const handleSaveEdit = () => {
    if (onEdit && editedTitle.trim()) {
      onEdit(race.id, editedTitle.trim(), editedRaceType);
      setIsEditDialogOpen(false);
    }
  };

  const handleAddCandidate = form.handleSubmit((data) => {
    addCandidateMutation.mutate(data);
  });

  const handleUpdateCandidate = editForm.handleSubmit((data) => {
    if (candidateToEdit) {
      updateCandidateMutation.mutate({ id: candidateToEdit.id, data });
    }
  });

  const handleEditClick = (candidate: Candidate) => {
    setCandidateToEdit(candidate);
    editForm.reset({
      name: candidate.name,
      party: candidate.party,
      photoUrl: candidate.photoUrl || "",
    });
  };

  return (
    <>
      <Card className="hover-elevate transition-all" data-testid={`card-race-${race.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Badge className={`${raceTypeColors[race.type]} mb-2`}>{race.type}</Badge>
              <CardTitle className="text-lg truncate">{race.title}</CardTitle>
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-edit-race-${race.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setEditedTitle(race.title);
                    setEditedRaceType(race.type);
                    setIsEditDialogOpen(true);
                  }}
                  disabled={editDisabled}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-delete-race-${race.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(race.id);
                  }}
                  disabled={deleteDisabled}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-3">
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

        {leadingCandidate && leadingProbability && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Current Leader</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold truncate">{leadingCandidate}</p>
              <p className="font-mono font-bold text-primary">{leadingProbability.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {candidateCount && (
          <p className="text-sm text-muted-foreground">
            {candidateCount} candidate{candidateCount !== 1 ? "s" : ""} analyzed
          </p>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => {
            e.preventDefault();
            setIsCandidateDialogOpen(true);
          }}
          data-testid={`button-manage-candidates-${race.id}`}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Candidates
        </Button>

        {onReanalyze && (
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.preventDefault();
              onReanalyze(race.id);
            }}
            disabled={reanalyzeDisabled}
            data-testid={`button-reanalyze-${race.id}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reanalyzeDisabled ? 'animate-spin' : ''}`} />
            {reanalyzeDisabled ? 'Reanalyzing...' : 'Reanalyze'}
          </Button>
        )}

        <div className="flex gap-2">
          <Link href={`/race/${race.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-analysis-${race.id}`}>
              View Analysis
            </Button>
          </Link>
          <ShareButton
            title={race.title}
            text={leadingCandidate && leadingProbability 
              ? `🗳️ Based on the scenario analysis, ${leadingCandidate} currently has the highest estimated win probability at ${leadingProbability.toFixed(1)}% in the ${race.title}. ${window.location.origin}/race/${race.id}`
              : `🗳️ Check out the ${race.title} election analysis on ElectionPredict! ${window.location.origin}/race/${race.id}`}
            url={`${window.location.origin}/race/${race.id}`}
            variant="outline"
            size="default"
          />
        </div>
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Race</DialogTitle>
          <DialogDescription>
            Update the title and race type. Make it clear and descriptive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Race Title</Label>
            <Input
              id="title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="e.g., 2028 New York Senate Race"
              data-testid="input-edit-race-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raceType">Race Type</Label>
            <Select value={editedRaceType} onValueChange={(value) => setEditedRaceType(value as RaceType)}>
              <SelectTrigger id="raceType" data-testid="select-race-type">
                <SelectValue placeholder="Select race type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Presidential">Presidential</SelectItem>
                <SelectItem value="Senate">Senate</SelectItem>
                <SelectItem value="House">House</SelectItem>
                <SelectItem value="Governor">Governor</SelectItem>
                <SelectItem value="Local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={!editedTitle.trim() || editDisabled} data-testid="button-save-edit">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isCandidateDialogOpen} onOpenChange={setIsCandidateDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Candidates</DialogTitle>
          <DialogDescription>
            View, edit, or add candidates for {race.title}. After adding candidates, click "Reanalyze" to generate predictions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Candidates List */}
          {candidatesLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading candidates...</div>
          ) : candidates.length > 0 ? (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Existing Candidates ({candidates.length})</h4>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-4 space-y-2">
                    {candidates.map((candidate) => (
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
                            onClick={() => handleEditClick(candidate)}
                            data-testid={`button-edit-candidate-${candidate.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCandidateToDelete(candidate.id)}
                            data-testid={`button-delete-candidate-${candidate.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="border-t pt-4" />
            </>
          ) : null}

          {/* Add New Candidate Form */}
          <div>
            <h4 className="text-sm font-medium mb-3">Add New Candidate</h4>
            <Form {...form}>
              <form onSubmit={handleAddCandidate} className="space-y-3">
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
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCandidateDialogOpen(false)}
                  >
                    Done
                  </Button>
                  <Button
                    type="submit"
                    disabled={addCandidateMutation.isPending}
                    data-testid="button-add-candidate"
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
    <Dialog open={!!candidateToEdit} onOpenChange={(open) => !open && setCandidateToEdit(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
          <DialogDescription>Update candidate information.</DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={handleUpdateCandidate} className="space-y-4">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCandidateToEdit(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCandidateMutation.isPending}
                data-testid="button-save-candidate-edit"
              >
                {updateCandidateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this candidate and their predictions. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => candidateToDelete && deleteCandidateMutation.mutate(candidateToDelete)}
            disabled={deleteCandidateMutation.isPending}
            data-testid="button-confirm-delete"
          >
            {deleteCandidateMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
