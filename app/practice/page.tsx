"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  StreakBanner,
  DueForReview,
  PatternMastery,
  SmartRecommendations,
  type DueItem,
} from "@/components/practice";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StatsData {
  overall: {
    total_problems_seen: number;
    problems_mastered: number;
    problems_reviewing: number;
    problems_learning: number;
    problems_new: number;
    mastery_percentage: number;
    streak_days: number;
    longest_streak_days: number;
    total_reviews: number;
    average_score: number;
    total_time_minutes: number;
  };
  by_pattern: {
    pattern: string;
    total: number;
    mastered: number;
    reviewing?: number;
    learning?: number;
    new_count?: number;
    average_score: number;
    mastery_percentage: number;
    weakest_problem_id?: string;
    weakest_problem_title?: string;
  }[];
  by_difficulty: {
    difficulty: "easy" | "medium" | "hard";
    total: number;
    mastered: number;
    average_score: number;
  }[];
  daily_goal: number;
  daily_progress: number;
  problems_today: string[];
}

interface DueData {
  due_now: DueItem[];
  due_today: DueItem[];
  upcoming: DueItem[];
  stats: {
    total_due: number;
    overdue_count: number;
    streak_at_risk: boolean;
  };
}

interface Recommendation {
  type: string;
  scenario_id: string;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  reason: string;
  priority: number;
  estimated_minutes: number;
  companies?: string[];
}

export default function PracticePage() {
  const router = useRouter();
  const { user, loading: authLoading, initialized } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [due, setDue] = useState<DueData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is Pro
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const getAuthToken = useCallback(async () => {
    const { auth } = await import("@/lib/firebase");
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch all data in parallel
      const [statsRes, dueRes, recsRes] = await Promise.all([
        fetch("/api/spaced-repetition/stats", { headers }),
        fetch("/api/spaced-repetition/due", { headers }),
        fetch("/api/spaced-repetition/recommendations", { headers }),
      ]);

      if (!statsRes.ok || !dueRes.ok || !recsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [statsData, dueData, recsData] = await Promise.all([
        statsRes.json(),
        dueRes.json(),
        recsRes.json(),
      ]);

      setStats(statsData);
      setDue(dueData);
      setRecommendations(recsData.recommendations || []);
    } catch (err) {
      console.error("Error fetching practice data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  const refreshRecommendations = async () => {
    setIsRefreshingRecs(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/spaced-repetition/recommendations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } finally {
      setIsRefreshingRecs(false);
    }
  };

  const handleSkipProblem = async (problemId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/spaced-repetition/skip", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem_id: problemId }),
      });

      if (res.ok) {
        // Refresh due data
        const dueRes = await fetch("/api/spaced-repetition/due", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (dueRes.ok) {
          const dueData = await dueRes.json();
          setDue(dueData);
        }
      }
    } catch (err) {
      console.error("Error skipping problem:", err);
    }
  };

  // Check subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;

      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const token = await currentUser.getIdToken();

        const res = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const profile = await res.json();
          setIsPro(profile.subscription_tier === "pro" || profile.subscription_tier === "enterprise");
        } else {
          setIsPro(false);
        }
      } catch {
        setIsPro(false);
      }
    };

    if (initialized && user) {
      checkSubscription();
    }
  }, [user, initialized]);

  // Fetch data when user is authenticated
  useEffect(() => {
    if (initialized && user && isPro) {
      fetchData();
    }
  }, [initialized, user, isPro, fetchData]);

  // Redirect if not authenticated
  useEffect(() => {
    if (initialized && !user && !authLoading) {
      router.push("/login?redirect=/practice");
    }
  }, [initialized, user, authLoading, router]);

  // Show loading while checking auth
  if (!initialized || authLoading || isPro === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Show upgrade prompt for non-Pro users
  if (!isPro) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-card p-8">
              <Lock className="h-16 w-16 text-accent mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-3">
                Spaced Repetition Practice
              </h1>
              <p className="text-gray-400 mb-6">
                Unlock smart practice sessions with spaced repetition to maximize your
                learning. Our AI-powered system schedules reviews at optimal intervals
                based on your performance.
              </p>
              <div className="space-y-4">
                <div className="grid gap-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Scientifically-optimized review intervals</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Pattern mastery tracking</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>AI-powered recommendations</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Streak tracking and daily goals</span>
                  </div>
                </div>
                <Link href="/pricing">
                  <Button className="bg-accent hover:bg-accent/80 text-black mt-4">
                    Upgrade to Pro
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Practice Dashboard
            </h1>
            <p className="text-gray-400">
              Review problems at optimal intervals to maximize retention
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Streak Banner */}
          <div className="mb-6">
            <StreakBanner
              streakDays={stats?.overall.streak_days || 0}
              dailyGoal={stats?.daily_goal || 5}
              dailyProgress={stats?.daily_progress || 0}
              longestStreak={stats?.overall.longest_streak_days}
              isLoading={isLoading}
            />
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Due for Review - Takes 2 columns */}
            <div className="lg:col-span-2">
              <DueForReview
                dueNow={due?.due_now || []}
                dueToday={due?.due_today || []}
                upcoming={due?.upcoming || []}
                totalDue={due?.stats.total_due || 0}
                overdueCount={due?.stats.overdue_count || 0}
                onSkip={handleSkipProblem}
                isLoading={isLoading}
              />
            </div>

            {/* Smart Recommendations - 1 column */}
            <div>
              <SmartRecommendations
                recommendations={recommendations as any}
                onRefresh={refreshRecommendations}
                isLoading={isLoading}
                isRefreshing={isRefreshingRecs}
              />
            </div>

            {/* Pattern Mastery - Full width */}
            <div className="lg:col-span-3">
              <PatternMastery
                patterns={stats?.by_pattern || []}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Stats Summary */}
          {stats && !isLoading && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-white">
                  {stats.overall.total_problems_seen}
                </div>
                <div className="text-sm text-gray-400">Problems Practiced</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {stats.overall.problems_mastered}
                </div>
                <div className="text-sm text-gray-400">Mastered</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-accent">
                  {stats.overall.average_score}%
                </div>
                <div className="text-sm text-gray-400">Average Score</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-white">
                  {Math.round(stats.overall.total_time_minutes / 60)}h
                </div>
                <div className="text-sm text-gray-400">Total Practice Time</div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
