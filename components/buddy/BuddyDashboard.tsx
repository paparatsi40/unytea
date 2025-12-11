"use client";

import { useState, useEffect } from "react";
import { Users, Target, CheckCircle, Heart, TrendingUp, Plus } from "lucide-react";
import {
  getMyBuddyPartnership,
  findBuddyMatch,
  createBuddyPartnership,
  createBuddyGoal,
  completeBuddyGoal,
  createBuddyCheckIn,
} from "@/app/actions/buddy";

type Props = {
  communityId: string;
  communitySlug: string;
};

export function BuddyDashboard({ communityId, communitySlug: _communitySlug }: Props) {
  const [partnership, setPartnership] = useState<any>(null);
  const [buddy, setBuddy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  useEffect(() => {
    loadPartnership();
  }, [communityId]);

  const loadPartnership = async () => {
    setLoading(true);
    const result = await getMyBuddyPartnership(communityId);
    if (result.success && result.partnership) {
      setPartnership(result.partnership);
      setBuddy(result.buddy);
    }
    setLoading(false);
  };

  const handleFindMatch = async () => {
    setMatching(true);
    const result = await findBuddyMatch(communityId);
    if (result.success && result.match) {
      setMatch(result.match);
    } else {
      alert(result.error || "No matches found");
    }
    setMatching(false);
  };

  const handleAcceptMatch = async () => {
    if (!match) return;
    const result = await createBuddyPartnership(match.id, communityId);
    if (result.success) {
      setMatch(null);
      loadPartnership();
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 animate-pulse text-purple-600" />
          <p className="mt-2 text-sm text-gray-500">Loading buddy system...</p>
        </div>
      </div>
    );
  }

  // No buddy yet - show matching interface
  if (!partnership) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Find Your Accountability Partner</h2>
          <p className="mt-2 text-gray-600">
            Get matched with someone to keep each other motivated and accountable!
          </p>

          {!match ? (
            <button
              onClick={handleFindMatch}
              disabled={matching}
              className="mt-6 inline-flex items-center space-x-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              {matching ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Finding match...</span>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  <span>Find My Buddy</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
              <p className="mb-4 text-sm font-medium text-gray-600">We found a match!</p>
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {match.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-gray-900">{match.name}</h3>
                  <p className="text-sm text-gray-600">Level {match.level}</p>
                  {match.interests && match.interests.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {match.interests.slice(0, 3).map((interest: string, i: number) => (
                        <span key={i} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleAcceptMatch}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
                >
                  Accept Match
                </button>
                <button
                  onClick={() => setMatch(null)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="text-center">
            <Target className="mx-auto h-8 w-8 text-purple-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Set Goals</h3>
            <p className="mt-1 text-sm text-gray-600">Work towards shared objectives</p>
          </div>
          <div className="text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-purple-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Check-Ins</h3>
            <p className="mt-1 text-sm text-gray-600">Regular progress updates</p>
          </div>
          <div className="text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-purple-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Grow Together</h3>
            <p className="mt-1 text-sm text-gray-600">10x better results</p>
          </div>
        </div>
      </div>
    );
  }

  // Has buddy - show dashboard
  const activeGoals = partnership.goals?.filter((g: any) => !g.completed) || [];
  const completedGoals = partnership.goals?.filter((g: any) => g.completed) || [];
  const recentCheckIns = partnership.checkIns?.slice(0, 5) || [];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Buddy Header */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {buddy.name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Buddy: {buddy.name}</h2>
              <p className="text-sm text-gray-600">Level {buddy.level} • Partners since {new Date(partnership.matchedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center space-x-2 text-2xl font-bold text-purple-600">
              <Heart className="h-6 w-6 fill-current" />
              <span>{partnership.checkIns?.length || 0}</span>
            </div>
            <p className="text-xs text-gray-600">Check-ins</p>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Active Goals */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Active Goals</h3>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="text-purple-600 hover:text-purple-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {showGoalForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get("title") as string;
                const description = formData.get("description") as string;
                await createBuddyGoal(partnership.id, title, description);
                setShowGoalForm(false);
                loadPartnership();
              }}
              className="mb-4 space-y-2"
            >
              <input
                name="title"
                placeholder="Goal title..."
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                placeholder="Description..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex space-x-2">
                <button type="submit" className="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700">
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {activeGoals.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No active goals. Create one!</p>
            ) : (
              activeGoals.map((goal: any) => (
                <div key={goal.id} className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3">
                  <button
                    onClick={async () => {
                      await completeBuddyGoal(goal.id);
                      loadPartnership();
                    }}
                    className="mt-0.5 h-5 w-5 rounded border-2 border-gray-300 hover:border-purple-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{goal.title}</p>
                    {goal.description && <p className="text-sm text-gray-600">{goal.description}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Check-Ins */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Recent Check-Ins</h3>
            <button
              onClick={() => setShowCheckInForm(!showCheckInForm)}
              className="text-purple-600 hover:text-purple-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {showCheckInForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const mood = parseInt(formData.get("mood") as string);
                const notes = formData.get("notes") as string;
                await createBuddyCheckIn(partnership.id, mood, notes);
                setShowCheckInForm(false);
                loadPartnership();
              }}
              className="mb-4 space-y-2"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">How are you feeling? (1-10)</label>
                <input
                  name="mood"
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="5"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                name="notes"
                placeholder="What's on your mind?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex space-x-2">
                <button type="submit" className="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700">
                  Check In
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckInForm(false)}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {recentCheckIns.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No check-ins yet. Be the first!</p>
            ) : (
              recentCheckIns.map((checkIn: any) => (
                <div key={checkIn.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{checkIn.user.name}</p>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 fill-current text-pink-500" />
                      <span className="text-sm font-semibold text-gray-900">{checkIn.mood}/10</span>
                    </div>
                  </div>
                  {checkIn.notes && <p className="mt-1 text-sm text-gray-600">{checkIn.notes}</p>}
                  <p className="mt-1 text-xs text-gray-500">{new Date(checkIn.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900">Completed Goals 🎉</h3>
          <div className="space-y-2">
            {completedGoals.map((goal: any) => (
              <div key={goal.id} className="flex items-center space-x-3 text-gray-500 line-through">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{goal.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
