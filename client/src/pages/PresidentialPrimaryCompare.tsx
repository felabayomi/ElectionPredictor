import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComparisonResult } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PresidentialPrimaryCompare() {
  const { data: comparison, isLoading } = useQuery<ComparisonResult>({
    queryKey: ["/api/compare/presidential-primary"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Presidential Democratic Primary</h1>
              <p className="text-sm text-muted-foreground">Harris vs Obama</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          </div>
        ) : comparison ? (
          <ComparisonPanel comparison={comparison} />
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Comparison data not available</p>
          </Card>
        )}
      </main>
    </div>
  );
}
