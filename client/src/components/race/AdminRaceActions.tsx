import { Button } from "@/components/ui/button";
import { Pencil, RefreshCw, Trash2, Users } from "lucide-react";

interface AdminRaceActionsProps {
    raceId: string;
    section: "header" | "content";
    onRequestEdit?: () => void;
    editDisabled?: boolean;
    onDelete?: (id: string) => void;
    deleteDisabled?: boolean;
    onManageCandidates?: (id: string) => void;
    onReanalyze?: (id: string) => void;
    reanalyzeDisabled?: boolean;
}

export function AdminRaceActions({
    raceId,
    section,
    onRequestEdit,
    editDisabled,
    onDelete,
    deleteDisabled,
    onManageCandidates,
    onReanalyze,
    reanalyzeDisabled,
}: AdminRaceActionsProps) {
    if (section === "header") {
        if (!onRequestEdit && !onDelete) {
            return null;
        }

        return (
            <div className="flex gap-1">
                {onRequestEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-edit-race-${raceId}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onRequestEdit();
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
                        data-testid={`button-delete-race-${raceId}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete(raceId);
                        }}
                        disabled={deleteDisabled}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        );
    }

    if (!onManageCandidates && !onReanalyze) {
        return null;
    }

    return (
        <>
            {onManageCandidates && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                        e.preventDefault();
                        onManageCandidates(raceId);
                    }}
                    data-testid={`button-manage-candidates-${raceId}`}
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
                        onReanalyze(raceId);
                    }}
                    disabled={reanalyzeDisabled}
                    data-testid={`button-reanalyze-${raceId}`}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${reanalyzeDisabled ? "animate-spin" : ""}`} />
                    {reanalyzeDisabled ? "Reanalyzing..." : "Reanalyze"}
                </Button>
            )}
        </>
    );
}
