"use client";

import { useState } from "react";
import { Circle, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { startSessionRecording, stopSessionRecording } from "@/app/actions/recordings";
import { toast } from "react-hot-toast";

interface RecordingControlsProps {
  sessionId: string;
  isRecording?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  isModerator?: boolean;
}

export function RecordingControls({
  sessionId,
  isRecording: initialRecording = false,
  onRecordingStart,
  onRecordingStop,
  isModerator = false,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Format duration (seconds to HH:MM:SS)
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const handleStartRecording = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await startSessionRecording(sessionId);

      if (result.success) {
        setIsRecording(true);
        setRecordingDuration(0);
        onRecordingStart?.();
        toast.success("Recording started! 🎬");

        // Start duration counter
        const interval = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        // Store interval ID for cleanup
        (window as any).recordingInterval = interval;
      } else {
        setError(result.error || "Failed to start recording");
        toast.error(result.error || "Failed to start recording");
      }
    } catch (error) {
      setError("An error occurred");
      toast.error("An error occurred while starting recording");
    } finally {
      setIsProcessing(false);
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Clear duration interval
      if ((window as any).recordingInterval) {
        clearInterval((window as any).recordingInterval);
      }

      const result = await stopSessionRecording(sessionId);

      if (result.success) {
        setIsRecording(false);
        onRecordingStop?.();
        toast.success("Recording stopped! Processing...");
      } else {
        setError(result.error || "Failed to stop recording");
        toast.error(result.error || "Failed to stop recording");
      }
    } catch (error) {
      setError("An error occurred");
      toast.error("An error occurred while stopping recording");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isModerator) {
    // Show read-only status for non-moderators
    if (!isRecording) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            Recording
          </span>
        </div>
        <span className="text-sm text-red-600 dark:text-red-500 font-mono">
          {formatDuration(recordingDuration)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 fill-current" />
                Start Recording
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-500 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <Square className="w-4 h-4 fill-current" />
                Stop Recording
              </>
            )}
          </button>
        )}

        {/* Recording Status */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Recording
              </span>
              <span className="text-sm text-red-600 dark:text-red-500 font-mono">
                {formatDuration(recordingDuration)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Message */}
      {!isRecording && !error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
          <CheckCircle2 className="w-4 h-4" />
          Recordings are automatically saved and transcribed with AI
        </div>
      )}
    </div>
  );
}