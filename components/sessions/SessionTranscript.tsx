"use client";

import { useState } from "react";
import { Lock, Unlock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  sessionId: string;
  hasAccess: boolean;
}

// Mock transcript data - in production, this would come from an API
const mockTranscript = [
  { time: "00:00", speaker: "Host", text: "Welcome everyone to today's session on building scalable community platforms." },
  { time: "00:45", speaker: "Host", text: "We'll cover three main topics: growth loops, engagement mechanics, and monetization." },
  { time: "02:30", speaker: "Participant", text: "How do you balance open access with exclusive content?" },
  { time: "03:15", speaker: "Host", text: "Great question! The key is to think in terms of discovery vs. depth." },
  { time: "05:00", speaker: "Host", text: "Public sessions act as your marketing funnel - they should be valuable standalone." },
  { time: "07:45", speaker: "Host", text: "Then you convert engaged participants into your community for deeper content." },
  { time: "12:20", speaker: "Participant", text: "What's the ideal session length for maximum engagement?" },
  { time: "13:00", speaker: "Host", text: "45-60 minutes tends to be the sweet spot. Long enough for depth, short enough to commit." },
];

export function SessionTranscript({ hasAccess }: Props) {
  const [showFull, setShowFull] = useState(false);
  const previewLines = 5;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Session Transcript</h2>
              <p className="text-sm text-gray-500">
                {hasAccess 
                  ? "Full transcript with searchable content" 
                  : "Join the session to unlock the full transcript"}
              </p>
            </div>
          </div>
          {hasAccess ? (
            <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
              <Unlock className="w-3 h-3" />
              Unlocked
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Locked
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6">
        {hasAccess ? (
          <>
            {/* Search bar - only for unlocked */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search transcript..."
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            {/* Full transcript */}
            <div className="space-y-4">
              {(showFull ? mockTranscript : mockTranscript.slice(0, previewLines)).map((line, i) => (
                <div key={i} className="flex gap-4 group hover:bg-gray-50 p-2 rounded-lg -mx-2">
                  <span className="text-sm text-gray-400 font-mono w-12 flex-shrink-0">
                    {line.time}
                  </span>
                  <div>
                    <span className="font-medium text-violet-700">{line.speaker}:</span>{" "}
                    <span className="text-gray-700">{line.text}</span>
                  </div>
                </div>
              ))}
            </div>

            {mockTranscript.length > previewLines && (
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => setShowFull(!showFull)}
              >
                {showFull ? "Show less" : `Show all ${mockTranscript.length} lines`}
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Blurred preview */}
            <div className="space-y-4">
              {mockTranscript.slice(0, previewLines).map((line, i) => (
                <div key={i} className="flex gap-4 opacity-50">
                  <span className="text-sm text-gray-400 font-mono w-12 flex-shrink-0">
                    {line.time}
                  </span>
                  <div>
                    <span className="font-medium text-gray-500">{line.speaker}:</span>{" "}
                    <span className="text-gray-400">{line.text}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Locked message */}
            <div className="mt-8 text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Transcript Locked</h3>
              <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                Join this session to unlock the full transcript with searchable content.
              </p>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                Join to Unlock
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
