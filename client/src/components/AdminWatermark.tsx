import { ShieldAlert } from "lucide-react";

interface AdminWatermarkProps {
    compact?: boolean;
}

export default function AdminWatermark({ compact = false }: AdminWatermarkProps) {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,18,60,0.14),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(159,18,57,0.12),transparent_46%)]" />
            <div className="absolute -top-10 -right-16 rotate-12 bg-rose-700/90 text-white px-16 py-2 text-xs tracking-[0.24em] font-semibold shadow-lg">
                RESTRICTED ADMIN AREA
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="select-none text-rose-900/10 text-[18vw] leading-none font-black tracking-[0.18em]">
                    ADMIN
                </div>
            </div>
            {!compact && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-rose-300 bg-white/75 px-3 py-1.5 text-xs font-medium text-rose-900 backdrop-blur-sm">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Protected operations: create, edit, delete, and reanalyze
                </div>
            )}
        </div>
    );
}
