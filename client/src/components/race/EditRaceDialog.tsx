import type { RaceType } from "@shared/schema";
import { Button } from "@/components/ui/button";
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

interface EditRaceDialogProps {
    open: boolean;
    title: string;
    raceType: RaceType;
    editDisabled?: boolean;
    onOpenChange: (open: boolean) => void;
    onTitleChange: (title: string) => void;
    onRaceTypeChange: (type: RaceType) => void;
    onSave: () => void;
}

export function EditRaceDialog({
    open,
    title,
    raceType,
    editDisabled,
    onOpenChange,
    onTitleChange,
    onRaceTypeChange,
    onSave,
}: EditRaceDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="e.g., 2028 New York Senate Race"
                            data-testid="input-edit-race-title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="raceType">Race Type</Label>
                        <Select value={raceType} onValueChange={(value) => onRaceTypeChange(value as RaceType)}>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={!title.trim() || editDisabled} data-testid="button-save-edit">
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
