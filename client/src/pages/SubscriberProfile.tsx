import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import type { SubscriberProfile } from "@shared/schema";

interface SubscriberProfileWithLegacy extends SubscriberProfile {
  created_at?: string;
  updated_at?: string;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SubscriberProfilePage() {
  const [, params] = useRoute("/subscriber-profile/:email");
  const email = decodeURIComponent(params?.email || "").trim().toLowerCase();

  const { data, isLoading, isError, error } = useQuery<SubscriberProfileWithLegacy>({
    queryKey: ["/api/subscriber-profiles", email],
    enabled: Boolean(email),
    queryFn: async () => {
      return apiRequest<SubscriberProfileWithLegacy>(
        "GET",
        `/api/subscriber-profiles?email=${encodeURIComponent(email)}`,
      );
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-52 w-full" />
        </main>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-lg">
          <p className="text-muted-foreground mb-3">Profile not found</p>
          <p className="text-sm text-muted-foreground mb-5">{getErrorMessage(error, "This subscriber profile is unavailable.")}</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const createdAt = data.createdAt || data.created_at;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Subscriber Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {data.displayName || "Anonymous Subscriber"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.bio && <p className="text-muted-foreground">{data.bio}</p>}
            <div className="text-muted-foreground">Joined {formatDate(createdAt)}</div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
