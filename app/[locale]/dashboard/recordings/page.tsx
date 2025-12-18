"use client";

import { useEffect, useState } from "react";
import { getUserRecordings } from "@/app/actions/recordings";
import { Play, Clock, Calendar, Search, Filter, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Recording {
  id: string;
  sessionId: string;
  sessionTitle: string;
  recordingUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  completedAt?: Date;
  hasTranscription: boolean;
  transcriptionSummary?: string;
  topics: string[];
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Load recordings
  useEffect(() => {
    loadRecordings();
  }, []);

  // Filter recordings
  useEffect(() => {
    let filtered = [...recordings];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.transcriptionSummary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Topic filter
    if (selectedTopic) {
      filtered = filtered.filter((r) => r.topics.includes(selectedTopic));
    }

    setFilteredRecordings(filtered);
  }, [searchQuery, selectedTopic, recordings]);

  const loadRecordings = async () => {
    setLoading(true);
    const result = await getUserRecordings();

    if (result.success && result.recordings) {
      setRecordings(result.recordings as any);
      setFilteredRecordings(result.recordings as any);
    }

    setLoading(false);
  };

  // Get all unique topics
  const allTopics = Array.from(
    new Set(recordings.flatMap((r) => r.topics))
  );

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate total stats
  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recordings Library
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage your session recordings
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {recordings.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Recordings
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalHours}h {totalMinutes}m
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Duration
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* Topic Filter */}
        <select
          value={selectedTopic || ""}
          onChange={(e) => setSelectedTopic(e.target.value || null)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="">All Topics</option>
          {allTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No recordings found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedTopic
              ? "Try adjusting your filters"
              : "Your session recordings will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording, index) => (
            <motion.div
              key={recording.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/dashboard/sessions/${recording.sessionId}/recording`}
                className="block group"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                    {recording.thumbnailUrl ? (
                      <img
                        src={recording.thumbnailUrl}
                        alt={recording.sessionTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-16 h-16 text-purple-600 opacity-50" />
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-purple-600 ml-1" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {recording.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-white text-xs font-mono">
                        {formatDuration(recording.duration)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {recording.sessionTitle}
                    </h3>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(recording.completedAt)}
                      </div>
                      {recording.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(recording.duration)}
                        </div>
                      )}
                    </div>

                    {/* AI Badge */}
                    {recording.hasTranscription && (
                      <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                          ✨ AI Transcription Available
                        </span>
                      </div>
                    )}

                    {/* Topics */}
                    {recording.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recording.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
                          >
                            {topic}
                          </span>
                        ))}
                        {recording.topics.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                            +{recording.topics.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}