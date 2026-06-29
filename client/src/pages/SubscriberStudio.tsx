import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, SUBSCRIBER_EMAIL_STORAGE_KEY, queryClient } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Loader2, ShieldCheck, TriangleAlert, Zap, Eye, EyeOff, User } from "lucide-react";
import type { SubscriberProfile } from "@shared/schema";

interface SubscriptionStatusResponse {
    email: string;
    isActive: boolean;
    subscription: {
        status: string;
        currentPeriodEnd?: string;
    } | null;
}

export default function SubscriberStudio() {
    const { toast } = useToast();
    const [subscriberEmail, setSubscriberEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [isPublic, setIsPublic] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const emailFromUrl = params.get("email");
        const saved = window.localStorage.getItem(SUBSCRIBER_EMAIL_STORAGE_KEY) || "";
        const normalized = (emailFromUrl || saved).trim().toLowerCase();
        if (normalized) {
            setSubscriberEmail(normalized);
            window.localStorage.setItem(SUBSCRIBER_EMAIL_STORAGE_KEY, normalized);
        }

        const checkout = params.get("checkout");
        if (checkout === "success") {
            toast({ title: "Subscription checkout completed", description: "Refresh status below to confirm activation." });
        }
        if (checkout === "cancelled") {
            toast({ title: "Checkout cancelled", description: "No charge was made.", variant: "destructive" });
        }
    }, [toast]);

    const normalizedEmail = useMemo(() => subscriberEmail.trim().toLowerCase(), [subscriberEmail]);

    const { data: statusData, isLoading, refetch } = useQuery<SubscriptionStatusResponse>({
        queryKey: ["subscription-status", normalizedEmail],
        enabled: Boolean(normalizedEmail),
        queryFn: async () => {
            return apiRequest<SubscriptionStatusResponse>(
                "GET",
                `/api/subscription/status?email=${encodeURIComponent(normalizedEmail)}`,
            );
        },
    });

    const { data: profileData } = useQuery<SubscriberProfile | null>({
        queryKey: ["/api/subscriber-profiles", normalizedEmail],
        enabled: Boolean(normalizedEmail),
        queryFn: async () => {
            try {
                const response = await apiRequest<SubscriberProfile>(
                    "GET",
                    `/api/subscriber-profiles/${encodeURIComponent(normalizedEmail)}`,
                );
                return response || null;
            } catch {
                return null;
            }
        },
    });

    // Load profile data into form fields when profile is fetched
    useEffect(() => {
        if (profileData) {
            setDisplayName(profileData.displayName || "");
            setBio(profileData.bio || "");
            setIsPublic(profileData.isPublic || false);
        }
    }, [profileData]);

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (!normalizedEmail) {
                throw new Error("Enter your subscriber email first.");
            }

            const result = await apiRequest<{ checkoutUrl?: string }>(
                "POST",
                "/api/subscription/checkout",
                { email: normalizedEmail },
            );

            if (!result.checkoutUrl) {
                throw new Error("Checkout URL was not returned.");
            }

            return result.checkoutUrl;
        },
        onSuccess: (checkoutUrl) => {
            window.localStorage.setItem(SUBSCRIBER_EMAIL_STORAGE_KEY, normalizedEmail);
            window.location.href = checkoutUrl;
        },
        onError: (error) => {
            toast({
                title: "Unable to start checkout",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        },
    });

    const portalMutation = useMutation({
        mutationFn: async () => {
            const result = await apiRequest<{ portalUrl?: string }>(
                "POST",
                "/api/subscription/portal",
                { email: normalizedEmail },
            );

            if (!result.portalUrl) {
                throw new Error("Portal URL was not returned.");
            }

            return result.portalUrl;
        },
        onSuccess: (portalUrl) => {
            window.location.href = portalUrl;
        },
        onError: (error) => {
            toast({
                title: "Unable to open billing portal",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        },
    });

    const profileUpdateMutation = useMutation({
        mutationFn: async () => {
            if (!normalizedEmail) throw new Error("Email not set");
            return apiRequest<SubscriberProfile>(
                "POST",
                "/api/subscriber-profiles",
                {
                    email: normalizedEmail,
                    displayName: displayName.trim() || undefined,
                    bio: bio.trim() || undefined,
                    isPublic,
                },
            );
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["/api/subscriber-profiles", normalizedEmail] });
            toast({ title: "Profile saved", description: "Your public profile has been updated." });
        },
        onError: (error) => {
            toast({
                title: "Unable to save profile",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        },
    });

    const saveEmail = () => {
        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            toast({ title: "Enter a valid email", variant: "destructive" });
            return;
        }
        window.localStorage.setItem(SUBSCRIBER_EMAIL_STORAGE_KEY, normalizedEmail);
        toast({ title: "Subscriber email saved" });
        void refetch();
    };

    const isActive = Boolean(statusData?.isActive);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold">Subscriber Studio</h1>
                                <p className="text-sm text-muted-foreground">Create race scenarios without admin permissions</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="px-3 py-1">
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Create-only access
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Subscription Access</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subscriber Email</label>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={subscriberEmail}
                                    onChange={(e) => setSubscriberEmail(e.target.value)}
                                    data-testid="input-subscriber-email"
                                />
                                <Button variant="outline" onClick={saveEmail} data-testid="button-save-subscriber-email">
                                    Save
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={isActive ? "default" : "secondary"} data-testid="badge-subscription-status">
                                {isLoading ? "Checking..." : isActive ? "Active subscription" : "No active subscription"}
                            </Badge>
                            {statusData?.subscription?.status && (
                                <span className="text-xs text-muted-foreground">
                                    Stripe status: {statusData.subscription.status}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <Button
                                onClick={() => checkoutMutation.mutate()}
                                disabled={checkoutMutation.isPending || !normalizedEmail}
                                data-testid="button-start-subscription"
                            >
                                {checkoutMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Redirecting...
                                    </>
                                ) : (
                                    "Subscribe"
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => portalMutation.mutate()}
                                disabled={portalMutation.isPending || !normalizedEmail}
                                data-testid="button-manage-subscription"
                            >
                                Manage Billing
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => refetch()}
                                disabled={!normalizedEmail}
                                data-testid="button-refresh-subscription"
                            >
                                Refresh Status
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6 border-amber-300 bg-amber-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <TriangleAlert className="h-5 w-5 mt-0.5 text-amber-700" />
                            <div>
                                <p className="font-semibold text-amber-900">Important before creating</p>
                                <p className="text-sm text-amber-800 mt-1">
                                    Subscribers can create and reanalyze scenarios. Edit and delete actions are admin-only.
                                    To request an edit or delete, use the request buttons on any race and email support at ccspcivicos@gmail.com.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Public Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Create a public profile to be credited for your election scenarios.
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Display Name</label>
                            <Input
                                placeholder="Your name or handle"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={!normalizedEmail}
                                data-testid="input-display-name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bio</label>
                            <Textarea
                                placeholder="Brief bio or description (optional)"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                disabled={!normalizedEmail}
                                className="resize-none"
                                rows={3}
                                data-testid="textarea-bio"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsPublic(!isPublic)}
                                disabled={!normalizedEmail}
                                className="gap-2"
                                data-testid="button-toggle-public"
                            >
                                {isPublic ? (
                                    <>
                                        <Eye className="h-4 w-4" />
                                        Public
                                    </>
                                ) : (
                                    <>
                                        <EyeOff className="h-4 w-4" />
                                        Private
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground flex-1">
                                {isPublic
                                    ? "Your profile is visible when you create races"
                                    : "Your profile is hidden from public view"}
                            </p>
                        </div>

                        <Button
                            onClick={() => profileUpdateMutation.mutate()}
                            disabled={profileUpdateMutation.isPending || !normalizedEmail}
                            className="w-full"
                            data-testid="button-save-profile"
                        >
                            {profileUpdateMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Profile"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Custom Prediction
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-primary-foreground/90 mb-4">
                                Build your own race with custom candidates and compare head-to-head with AI analysis
                            </p>
                            <Link href="/custom-prediction">
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    disabled={!isActive}
                                    data-testid="button-subscriber-custom-prediction"
                                >
                                    Create Custom Race
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="bg-chart-3 text-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Natural Language Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-white/90 mb-4">
                                Ask election questions in plain English and get AI-powered predictions
                            </p>
                            <Link href="/natural-language">
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    disabled={!isActive}
                                    data-testid="button-subscriber-natural-language"
                                >
                                    Ask a Question
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
