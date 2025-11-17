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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Race, RaceType, Party } from "@shared/schema";
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
  onAddCandidate?: (raceId: string, name: string, party: Party) => void;
  addCandidateDisabled?: boolean;
}

const raceTypeColors: Record<RaceType, string> = {
  Presidential: "bg-primary text-primary-foreground",
  Senate: "bg-chart-2 text-white",
  House: "bg-chart-3 text-white",
  Governor: "bg-chart-4 text-white",
  Local: "bg-chart-5 text-white",
};

export function RaceCard({ race, leadingCandidate, leadingProbability, candidateCount, onDelete, deleteDisabled, onEdit, editDisabled, onReanalyze, reanalyzeDisabled, onAddCandidate, addCandidateDisabled }: RaceCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(race.title);
  const [editedRaceType, setEditedRaceType] = useState<RaceType>(race.type);
  const [candidateName, setCandidateName] = useState("");
  const [candidateParty, setCandidateParty] = useState<Party>("Democratic");

  const handleSaveEdit = () => {
    if (onEdit && editedTitle.trim()) {
      onEdit(race.id, editedTitle.trim(), editedRaceType);
      setIsEditDialogOpen(false);
    }
  };

  const handleAddCandidate = () => {
    if (onAddCandidate && candidateName.trim()) {
      onAddCandidate(race.id, candidateName.trim(), candidateParty);
      setCandidateName("");
      setCandidateParty("Democratic");
    }
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

        {onAddCandidate && (
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.preventDefault();
              setIsCandidateDialogOpen(true);
            }}
            disabled={addCandidateDisabled}
            data-testid={`button-manage-candidates-${race.id}`}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Candidates
          </Button>
        )}

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Candidates</DialogTitle>
          <DialogDescription>
            Add candidates to {race.title}. After adding all candidates, click "Generate Analysis" to run AI predictions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="candidateName">Candidate Name</Label>
            <Input
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g., Hakeem Jeffries"
              data-testid="input-candidate-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && candidateName.trim()) {
                  e.preventDefault();
                  handleAddCandidate();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidateParty">Party</Label>
            <Select value={candidateParty} onValueChange={(value) => setCandidateParty(value as Party)}>
              <SelectTrigger id="candidateParty" data-testid="select-candidate-party">
                <SelectValue placeholder="Select party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Democratic">Democratic</SelectItem>
                <SelectItem value="Republican">Republican</SelectItem>
                <SelectItem value="Independent">Independent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsCandidateDialogOpen(false);
              setCandidateName("");
              setCandidateParty("Democratic");
            }}
          >
            Done
          </Button>
          <Button 
            onClick={handleAddCandidate} 
            disabled={!candidateName.trim() || addCandidateDisabled} 
            data-testid="button-add-candidate"
          >
            Add Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
