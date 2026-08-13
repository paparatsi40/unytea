/**
 * Recurrence date maths — deliberately NOT a "use server" module.
 *
 * A pure function with no I/O and no caller identity. While it lived in a
 * "use server" file it was published as a POST endpoint for no reason.
 */
import type { SessionFrequency } from "@prisma/client";

/**
 * Generate upcoming session dates for a series
 * Pure function - no DB operations
 */
export async function generateUpcomingSessions(
  series: {
    frequency: SessionFrequency;
    interval: number;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    startTime: string;
    durationMinutes: number;
    timezone: string;
    startsAt: Date;
  },
  count: number
): Promise<Array<{ scheduledAt: Date; endsAt: Date }>> {
  const instances: Array<{ scheduledAt: Date; endsAt: Date }> = [];

  let currentDate = new Date(series.startsAt);

  for (let i = 0; i < count; i++) {
    // Calculate next occurrence
    if (
      series.frequency === "WEEKLY" &&
      series.dayOfWeek !== null &&
      series.dayOfWeek !== undefined
    ) {
      // Set to the correct day of week
      const dayDiff = series.dayOfWeek - currentDate.getDay();
      currentDate.setDate(currentDate.getDate() + dayDiff);

      // If we've passed this day this week, move to next week
      if (dayDiff < 0 || (dayDiff === 0 && i > 0)) {
        currentDate.setDate(currentDate.getDate() + 7 * series.interval);
      }
    } else if (
      series.frequency === "MONTHLY" &&
      series.dayOfMonth !== null &&
      series.dayOfMonth !== undefined
    ) {
      // Set to the correct day of month
      currentDate.setDate(series.dayOfMonth);

      // Move to next month if needed
      if (i > 0) {
        currentDate.setMonth(currentDate.getMonth() + series.interval);
      }
    } else {
      // Simple interval (add days or months)
      if (series.frequency === "WEEKLY") {
        currentDate.setDate(currentDate.getDate() + 7 * series.interval);
      } else {
        currentDate.setMonth(currentDate.getMonth() + series.interval);
      }
    }

    // Parse startTime (e.g., "10:00") and apply to currentDate
    const [hours, minutes] = series.startTime.split(":").map(Number);
    const scheduledAt = new Date(currentDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    // Calculate end time
    const endsAt = new Date(scheduledAt);
    endsAt.setMinutes(endsAt.getMinutes() + series.durationMinutes);

    instances.push({ scheduledAt, endsAt });

    // Advance for next iteration
    if (series.frequency === "WEEKLY") {
      currentDate = new Date(scheduledAt);
      currentDate.setDate(currentDate.getDate() + 7 * series.interval);
    } else {
      currentDate = new Date(scheduledAt);
      currentDate.setMonth(currentDate.getMonth() + series.interval);
    }
  }

  return instances;
}