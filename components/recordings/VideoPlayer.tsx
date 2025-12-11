"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Download, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface TranscriptionSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  transcription?: {
    segments: TranscriptionSegment[];
    fullText: string;
  };
  title?: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({
  videoUrl,
  transcription,
  title,
  onTimeUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);

    // Find active transcription segment
    if (transcription?.segments) {
      const active = transcription.segments.find(
        (seg) => time >= seg.start && time <= seg.end
      );
      setActiveSegment(active?.id || null);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Jump to timestamp
  const jumpToTime = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Change volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // Change playback speed
  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  // Download video
  const downloadVideo = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = title || "recording.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Video Player */}
      <div className="flex-1 flex flex-col bg-black rounded-xl overflow-hidden">
        {/* Video Element */}
        <div className="relative flex-1 bg-black group">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
          />

          {/* Play Button Overlay */}
          {!isPlaying && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Play className="w-10 h-10 text-white ml-1" />
            </motion.button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-3 
                [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:bg-purple-500 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:hover:bg-purple-400"
            />
            <span className="text-white text-sm font-mono">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group">
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-3 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium"
                >
                  {playbackRate}x
                </button>

                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 right-0 bg-gray-900 rounded-lg shadow-xl p-2 space-y-1"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                          playbackRate === rate
                            ? "bg-purple-600 text-white"
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Download */}
              <button
                onClick={downloadVideo}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Download video"
              >
                <Download className="w-5 h-5 text-white" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Sidebar */}
      {transcription && (
        <div className="w-full lg:w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Transcription
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click any segment to jump to that timestamp
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcription.segments.map((segment) => (
              <motion.button
                key={segment.id}
                onClick={() => jumpToTime(segment.start)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeSegment === segment.id
                    ? "bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-500"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                    {formatTime(segment.start)}
                  </span>
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {segment.text}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}