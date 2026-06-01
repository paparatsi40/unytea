"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  PlayCircle,
  Users,
  TrendingUp,
  Award,
  Star,
} from "lucide-react";

// Locale-aware currency formatting (symbol + grouping position vary by locale).
const formatCurrency = (value: number, locale: string, currency = "USD") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);

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

export interface SessionData {
  total: number;
  completed: number;
  scheduled: number;
  live: number;
  avgAttendance: number;
  avgRating: number | null;
  totalFeedback: number;
  dailyChart: DailyChartPoint[];
}

export interface CourseData {
  totalCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  avgProgress: number;
  certificateCount: number;
  courseBreakdown: CourseBreakdown[];
  enrollmentChart: DailyChartPoint[];
}

export interface RevenueData {
  totalRevenue: number;
  courseRevenue: number;
  membershipRevenue: number;
  paidMembers: number;
  courseBreakdown: { title: string; price: number; enrollments: number; revenue: number }[];
  communityBreakdown: { name: string; price: number; members: number; revenue: number }[];
}

interface AnalyticsChartsProps {
  sessions: SessionData | null;
  courses: CourseData | null;
  revenue: RevenueData | null;
}

type TabId = "sessions" | "courses" | "revenue";

// ── Mini Bar Chart (pure CSS) ────────────────────────────────────────
function MiniBarChart({
  data,
  dataKey,
  color,
  height = 120,
  locale,
}: {
  data: DailyChartPoint[];
  dataKey: "sessions" | "attendees" | "enrollments";
  color: string;
  height?: number;
  locale: string;
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
            className="group relative min-w-0 flex-1"
            title={`${d.label}: ${val.toLocaleString(locale)}`}
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
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
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
export function AnalyticsCharts({ sessions, courses, revenue }: AnalyticsChartsProps) {
  const t = useTranslations("dashboard.analytics.charts");
  const locale = useLocale();
  const [tab, setTab] = useState<TabId>("sessions");

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "sessions", label: t("tabs.sessions"), icon: PlayCircle },
    { id: "courses", label: t("tabs.courses"), icon: BookOpen },
    { id: "revenue", label: t("tabs.revenue"), icon: DollarSign },
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
                  <StatBox
                    icon={PlayCircle}
                    label={t("sessions.total")}
                    value={sessions.total}
                    color="text-blue-500"
                  />
                  <StatBox
                    icon={Users}
                    label={t("sessions.avgAttendance")}
                    value={sessions.avgAttendance}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={Star}
                    label={t("sessions.avgRating")}
                    value={
                      sessions.avgRating ? `${sessions.avgRating}/5` : t("sessions.notAvailable")
                    }
                    sub={t("sessions.reviews", { count: sessions.totalFeedback })}
                    color="text-amber-500"
                  />
                  <StatBox
                    icon={BarChart3}
                    label={t("sessions.status")}
                    value={sessions.completed}
                    sub={t("sessions.statusSub", {
                      scheduled: sessions.scheduled,
                      live: sessions.live,
                    })}
                    color="text-purple-500"
                  />
                </div>

                {/* Sessions chart */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    {t("sessions.chartTitle")}
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <MiniBarChart
                      data={sessions.dailyChart}
                      dataKey="attendees"
                      color="bg-purple-400"
                      height={140}
                      locale={locale}
                    />
                    <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                      <span>{sessions.dailyChart[0]?.label}</span>
                      <span>{sessions.dailyChart[sessions.dailyChart.length - 1]?.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text={t("sessions.empty")} />
            )}
          </>
        )}

        {/* ── Courses Tab ───────────────────────────────────── */}
        {tab === "courses" && (
          <>
            {courses ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatBox
                    icon={BookOpen}
                    label={t("courses.total")}
                    value={courses.totalCourses}
                    color="text-blue-500"
                  />
                  <StatBox
                    icon={Users}
                    label={t("courses.enrollments")}
                    value={courses.totalEnrollments}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={TrendingUp}
                    label={t("courses.completionRate")}
                    value={`${courses.completionRate}%`}
                    sub={t("courses.completedSub", { count: courses.completedEnrollments })}
                    color="text-purple-500"
                  />
                  <StatBox
                    icon={Award}
                    label={t("courses.certificates")}
                    value={courses.certificateCount}
                    color="text-amber-500"
                  />
                </div>

                {/* Enrollments chart */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    {t("courses.chartTitle")}
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <MiniBarChart
                      data={courses.enrollmentChart}
                      dataKey="enrollments"
                      color="bg-emerald-400"
                      height={120}
                      locale={locale}
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
                      {t("courses.performance")}
                    </h4>
                    <div className="space-y-2">
                      {courses.courseBreakdown.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{c.title}</span>
                            <span className="text-xs text-gray-500">
                              {t("courses.enrolled", { count: c.enrollments })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <ProgressBar value={c.avgProgress} color="bg-purple-500" />
                            </div>
                            <span className="w-12 text-right text-xs text-gray-500">
                              {c.avgProgress}%
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-gray-400">
                            {t("courses.completionModules", {
                              completion: c.completionRate,
                              modules: c.modules,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text={t("courses.empty")} />
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
                    label={t("revenue.total")}
                    value={formatCurrency(revenue.totalRevenue, locale)}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={BookOpen}
                    label={t("revenue.course")}
                    value={formatCurrency(revenue.courseRevenue, locale)}
                    color="text-blue-500"
                  />
                  <StatBox
                    icon={Users}
                    label={t("revenue.membership")}
                    value={formatCurrency(revenue.membershipRevenue, locale)}
                    sub={t("revenue.paidMembers", { count: revenue.paidMembers })}
                    color="text-purple-500"
                  />
                </div>

                {/* Course revenue breakdown */}
                {revenue.courseBreakdown.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-500">
                      {t("revenue.byCourse")}
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
                              {t("revenue.priceEnrollments", {
                                price: formatCurrency(c.price, locale),
                                count: c.enrollments,
                              })}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(c.revenue, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {revenue.totalRevenue === 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                    <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">{t("revenue.emptyHint")}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text={t("revenue.empty")} />
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
