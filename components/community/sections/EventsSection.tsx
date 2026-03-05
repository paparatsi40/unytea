"use client";

import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  attendeeCount?: number;
  maxAttendees?: number;
  imageUrl?: string;
}

interface EventsSectionProps {
  title?: string;
  events: Event[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function EventsSection({
  title = "Upcoming Events",
  events,
  theme,
}: EventsSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (events.length === 0) {
    return null;
  }

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <a 
          href="#" 
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          View all →
        </a>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.slice(0, 5).map((event) => (
          <article
            key={event.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-6">
              {/* Date Badge */}
              <div 
                className="flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="text-2xl font-bold">
                  {format(new Date(event.startDate), "dd")}
                </div>
                <div className="text-xs uppercase">
                  {format(new Date(event.startDate), "MMM")}
                </div>
              </div>

              {/* Event Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {event.title}
                </h3>

                {event.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Event Details */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(event.startDate), "h:mm a")}
                      {event.endDate && ` - ${format(new Date(event.endDate), "h:mm a")}`}
                    </span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}

                  {event.attendeeCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {event.attendeeCount}
                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Button
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                  className="text-white hover:opacity-90"
                >
                  Register
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}