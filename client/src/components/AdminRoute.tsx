import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound } from "lucide-react";
import AdminWatermark from "@/components/AdminWatermark";

interface AdminRouteProps {
    children: React.ReactNode;
}

const ADMIN_KEY_STORAGE = "electionpredictor_admin_key";

export function getStoredAdminKey(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function AdminRoute({ children }: AdminRouteProps) {
    const [keyInput, setKeyInput] = useState("");
    const [hasAccess, setHasAccess] = useState<boolean>(() => Boolean(getStoredAdminKey()));

    const canSubmit = useMemo(() => keyInput.trim().length > 0, [keyInput]);

    const handleUnlock = () => {
        const cleaned = keyInput.trim();
        if (!cleaned) return;
        window.localStorage.setItem(ADMIN_KEY_STORAGE, cleaned);
        setHasAccess(true);
        setKeyInput("");
    };

    if (hasAccess) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative isolate">
            <AdminWatermark compact />
            <Card className="w-full max-w-md relative z-10 border-rose-200 shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Admin Access Required
                    </CardTitle>
                    <CardDescription>
                        Enter your admin key to access this route. This key is used for admin create, edit, and delete actions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Key</label>
                        <Input
                            type="password"
                            placeholder="Enter admin key"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            data-testid="input-admin-key"
                        />
                    </div>

                    <Button
                        onClick={handleUnlock}
                        disabled={!canSubmit}
                        className="w-full"
                        data-testid="button-unlock-admin"
                    >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Unlock Admin
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
