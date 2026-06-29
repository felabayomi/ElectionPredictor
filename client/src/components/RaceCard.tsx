import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Race, RaceType } from "@shared/schema";
import { RaceSummaryCard } from "@/components/race/RaceSummaryCard";
import { AdminRaceActions } from "@/components/race/AdminRaceActions";
import { EditRaceDialog } from "@/components/race/EditRaceDialog";

interface RaceCardProps {
  race: Race;
  displayDate?: string;
  leadingCandidate?: string;
  leadingProbability?: number;
  leadingDataQualityScore?: number;
  candidateCount?: number;
  lastCheckedAt?: string;
  onDelete?: (id: string) => void;
  deleteDisabled?: boolean;
  onEdit?: (id: string, title: string, raceType: RaceType) => void;
  editDisabled?: boolean;
  onReanalyze?: (id: string) => void;
  reanalyzeDisabled?: boolean;
  onManageCandidates?: (id: string) => void;
}

const raceTypeColors: Record<RaceType, string> = {
  Presidential: "bg-primary text-primary-foreground",
  Senate: "bg-chart-2 text-white",
  House: "bg-chart-3 text-white",
  Governor: "bg-chart-4 text-white",
  Local: "bg-chart-5 text-white",
};

export function RaceCard({ race, displayDate, leadingCandidate, leadingProbability, leadingDataQualityScore, candidateCount, lastCheckedAt, onDelete, deleteDisabled, onEdit, editDisabled, onReanalyze, reanalyzeDisabled, onManageCandidates }: RaceCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(race.title);
  const [editedRaceType, setEditedRaceType] = useState<RaceType>(race.type);

  const handleSaveEdit = () => {
    if (onEdit && editedTitle.trim()) {
      onEdit(race.id, editedTitle.trim(), editedRaceType);
      setIsEditDialogOpen(false);
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
            <AdminRaceActions
              raceId={race.id}
              section="header"
              onRequestEdit={onEdit
                ? () => {
                  setEditedTitle(race.title);
                  setEditedRaceType(race.type);
                  setIsEditDialogOpen(true);
                }
                : undefined}
              editDisabled={editDisabled}
              onDelete={onDelete}
              deleteDisabled={deleteDisabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <RaceSummaryCard
            race={race}
            displayDate={displayDate}
            leadingCandidate={leadingCandidate}
            leadingProbability={leadingProbability}
            leadingDataQualityScore={leadingDataQualityScore}
            candidateCount={candidateCount}
            lastCheckedAt={lastCheckedAt}
          />

          <AdminRaceActions
            raceId={race.id}
            section="content"
            onManageCandidates={onManageCandidates}
            onReanalyze={onReanalyze}
            reanalyzeDisabled={reanalyzeDisabled}
          />
        </CardContent>
      </Card>

      <EditRaceDialog
        open={isEditDialogOpen}
        title={editedTitle}
        raceType={editedRaceType}
        editDisabled={editDisabled}
        onOpenChange={setIsEditDialogOpen}
        onTitleChange={setEditedTitle}
        onRaceTypeChange={setEditedRaceType}
        onSave={handleSaveEdit}
      />
    </>
  );
}
