import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import { AdminRoute } from "@/components/AdminRoute";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminManage = lazy(() => import("@/pages/AdminManage"));
const SubscriberStudio = lazy(() => import("@/pages/SubscriberStudio"));
const PresidentialPrimaryCompare = lazy(() => import("@/pages/PresidentialPrimaryCompare"));
const NYSenateCompare = lazy(() => import("@/pages/NYSenateCompare"));
const RaceDetail = lazy(() => import("@/pages/RaceDetail"));
const SubscriberProfilePage = lazy(() => import("@/pages/SubscriberProfile"));
const CustomPrediction = lazy(() => import("@/pages/CustomPrediction"));
const NaturalLanguageAnalysis = lazy(() => import("@/pages/NaturalLanguageAnalysis"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/subscriber-studio" component={SubscriberStudio} />
      <Route
        path="/admin/felixdgreat/manage"
        component={() => (
          <AdminRoute>
            <AdminManage />
          </AdminRoute>
        )}
      />
      <Route
        path="/admin/felixdgreat"
        component={() => (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        )}
      />
      <Route path="/compare/presidential-primary" component={PresidentialPrimaryCompare} />
      <Route path="/compare/ny-senate" component={NYSenateCompare} />
      <Route path="/custom-prediction" component={CustomPrediction} />
      <Route path="/natural-language" component={NaturalLanguageAnalysis} />
      <Route path="/race/:id" component={RaceDetail} />
      <Route path="/subscriber-profile/:email" component={SubscriberProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading page...</div>}>
          <Router />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
