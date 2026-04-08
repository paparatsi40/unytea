"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Flame,
  PlayCircle,
  Trophy,
  Users,
  TrendingUp,
  Award,
  Star,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
interface DailyChartPoint {
  date: string;
  label: string;
  sessions?: number;
  attendees?: number;
  enrollments?: number;
}

interface CourseBreakdown {
  id: string;
  title: string;
  enrollments: number;
  modules: number;
  completionRate: number;
  avgProgress: number;
}

interface LeaderboardEntry {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  points: number;
  level: number;
  streak: number;
  longestStreak: number;
}

interface SessionData {
  total: number;
  completed: number;
  scheduled: number;
  live: number;
  avgAttendance: number;
  avgRating: number | null;
  totalFeedback: number;
  dailyChart: DailyChartPoint[];
}

interface CourseData {
  totalCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  avgProgress: number;
  certificateCount: number;
  courseBreakdown: CourseBreakdown[];
  enrollmentChart: DailyChartPoint[];
}

interface RevenueData {
  totalRevenue: number;
  courseRevenue: number;
  membershipRevenue: number;
  paidMembers: number;
  courseBreakdown: { title: string; price: number; enrollments: number; revenue: number }[];
  communityBreakdown: { name: string; price: number; members: number; revenue: number }[];
}

interface GamificationData {
  leaderboard: LeaderboardEntry[];
  streakDistribution: { range: string; count: number }[];
  levelDistribution: { range: string; count: number }[];
  totalAchievements: number;
  avgStreak: number;
}

interface AnalyticsChartsProps {
  sessions: SessionData | null;
  courses: CourseData | null;
  revenue: RevenueData | null;
  gamification: GamificationData | null;
}

type TabId = "sessions" | "courses" | "revenue" | "gamification";

// ── Mini Bar Chart (pure CSS) ────────────────────────────────────────
function MiniBarChart({
  data,
  dataKey,
  color,
  height = 120,
}: {
  data: DailyChartPoint[];
  dataKey: "sessions" | "attendees" | "enrollments";
  color: string;
  height?: number;
}) {
  const values = data.map((d) => (d[dataKey] as number) || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d) => {
        const val = (d[dataKey] as number) || 0;
        const h = (val / max) * 100;
        return (
          <div
            key={d.date}
            className="group relative flex-1 min-w-0"
            title={`${d.label}: ${val}`}
          >
            <div
              className={`w-full rounded-t-sm ${color} transition-all hover:opacity-80`}
              style={{ height: `${Math.max(h, 2)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────
function ProgressBar({
  value,
  max = 100,
  color = "bg-purple-500",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Stat Box ─────────────────────────────────────────────────────────
function StatBox({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-purple-600",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export function AnalyticsCharts({
  sessions,
  courses,
  revenue,
  gamification,
}: AnalyticsChartsProps) {
  const [tab, setTab] = useState<TabId>("sessions");

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "sessions", label: "Sessions", icon: PlayCircle },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "gamification", label: "Gamification", icon: Trophy },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-purple-500 text-purple-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* ── Sessions Tab ──────────────────────────────────── */}
        {tab === "sessions" && (
          <>
            {sessions ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatBox icon={PlayCircle} label="Total Sessions" value={sessions.total} color="text-blue-500" />
                  <StatBox icon={Users} label="Avg Attendance" value={sessions.avgAttendance} color="text-emerald-500" />
                  <StatBox
                    icon={Star}
                    label="Avg Rating"
                    value={sessions.avgRating ? `${sessions.avgRating}/5` : "N/A"}
                    sub={`${sessions.totalFeedback} reviews`}
                    color="text-amber-500"
                  />
                  <StatBox
                    icon={BarChart3}
                    label="Status"
                    value={sessions.completed}
                    sub={`${sessions.scheduled} scheduled · ${sessions.live} live`}
                    color="text-purple-500"
                  />
                </div>

                {/* Sessions chart */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    Sessions & Attendance (Last 30 days)
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <MiniBarChart
                      data={sessions.dailyChart}
                      dataKey="attendees"
                      color="bg-purple-400"
                      height={140}
                    />
                    <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                      <span>{sessions.dailyChart[0]?.label}</span>
                      <span>
                        {sessions.dailyChart[sessions.dailyChart.length - 1]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="No session data yet" />
            )}
          </>
        )}

        {/* ── Courses Tab ───────────────────────────────────── */}
        {tab === "courses" && (
          <>
            {courses ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatBox icon={BookOpen} label="Total Courses" value={courses.totalCourses} color="text-blue-500" />
                  <StatBox icon={Users} label="Enrollments" value={courses.totalEnrollments} color="text-emerald-500" />
                  <StatBox
                    icon={TrendingUp}
                    label="Completion Rate"
                    value={`${courses.completionRate}%`}
                    sub={`${courses.completedEnrollments} completed`}
                    color="text-purple-500"
                  />
                  <StatBox icon={Award} label="Certificates" value={courses.certificateCount} color="text-amber-500" />
                </div>

                {/* Enrollments chart */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    New Enrollments (Last 30 days)
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <MiniBarChart
                      data={courses.enrollmentChart}
                      dataKey="enrollments"
                      color="bg-emerald-400"
                      height={120}
                    />
                    <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                      <span>{courses.enrollmentChart[0]?.label}</span>
                      <span>
                        {courses.enrollmentChart[courses.enrollmentChart.length - 1]?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Course breakdown table */}
                {courses.courseBreakdown.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-500">
                      Course Performance
                    </h4>
                    <div className="space-y-2">
                      {courses.courseBreakdown.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {c.title}
                            </span>
                            <span className="text-xs text-gray-500">
                              {c.enrollments} enrolled
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <ProgressBar
                                value={c.avgProgress}
                                color="bg-purple-500"
                              />
                            </div>
                            <span className="w-12 text-right text-xs text-gray-500">
                              {c.avgProgress}%
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-gray-400">
                            {c.completionRate}% completion · {c.modules} modules
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="No course data yet" />
            )}
          </>
        )}

        {/* ── Revenue Tab ───────────────────────────────────── */}
        {tab === "revenue" && (
          <>
            {revenue ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatBox
                    icon={DollarSign}
                    label="Total Revenue"
                    value={`$${revenue.totalRevenue.toLocaleString()}`}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={BookOpen}
                    label="Course Revenue"
                    value={`$${revenue.courseRevenue.toLocaleString()}`}
                    color="text-blue-500"
                  />
                  <StatBox
                    icon={Users}
                    label="Membership Revenue"
                    value={`$${revenue.membershipRevenue.toLocaleString()}`}
                    sub={`${revenue.paidMembers} paid members`}
                    color="text-purple-500"
                  />
                </div>

                {/* Course revenue breakdown */}
                {revenue.courseBreakdown.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-500">
                      Revenue by Course
                    </h4>
                    <div className="space-y-2">
                      {revenue.courseBreakdown.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.title}</p>
                            <p className="text-xs text-gray-500">
                              ${c.price} × {c.enrollments} enrollments
                            </p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">
                            ${c.revenue.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {revenue.totalRevenue === 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                    <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Start monetizing by setting prices on your courses and communities
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="No revenue data yet" />
            )}
          </>
        )}

        {/* ── Gamification Tab ──────────────────────────────── */}
        {tab === "gamification" && (
          <>
            {gamification ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatBox
                    icon={Flame}
                    label="Avg Streak"
                    value={`${gamification.avgStreak} days`}
                    color="text-orange-500"
                  />
                  <StatBox
                    icon={Trophy}
                    label="Achievements"
                    value={gamification.totalAchievements}
                    sub="total unlocked"
                    color="text-amber-500"
                  />
                  <StatBox
                    icon={Users}
                    label="Leaderboard"
                    value={gamification.leaderboard.length}
                    sub="ranked members"
                    color="text-purple-500"
                  />
                </div>

                {/* Streak distribution */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    Streak Distribution
                  </h4>
                  <div className="flex gap-2">
                    {gamification.streakDistribution.map((s) => {
                      const total = gamification.streakDistribution.reduce(
                        (sum, x) => sum + x.count,
                        0
                      );
                      const pct = total > 0 ? (s.count / total) * 100 : 0;
                      return (
                        <div key={s.range} className="flex-1 text-center">
                          <div className="mx-auto mb-1 h-20 w-full overflow-hidden rounded-lg bg-gray-100">
                            <div
                              className="mt-auto h-full rounded-lg bg-gradient-to-t from-orange-400 to-amber-300 transition-all"
                              style={{
                                height: `${Math.max(pct, 5)}%`,
                                marginTop: `${100 - Math.max(pct, 5)}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs font-medium text-gray-900">{s.count}</p>
                          <p className="text-[10px] text-gray-400">{s.range}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leaderboard */}
                {gamification.leaderboard.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-500">
                      Top Members
                    </h4>
                    <div className="space-y-1.5">
                      {gamification.leaderboard.map((entry, i) => (
                        <div
                          key={entry.user.id}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <span
                            className={`w-6 text-center text-sm font-bold ${
                              i === 0
                                ? "text-amber-500"
                                : i === 1
                                  ? "text-gray-400"
                                  : i === 2
                                    ? "text-amber-700"
                                    : "text-gray-300"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                            {entry.user.image ? (
                              <img
                                src={entry.user.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                                {(entry.user.name || "?")[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {entry.user.name || entry.user.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              Lvl {entry.level} · {entry.streak}d streak
                            </p>
                          </div>
                          <span className="text-sm font-bold text-purple-600">
                            {entry.points.toLocaleString()} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="No gamification data yet" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
