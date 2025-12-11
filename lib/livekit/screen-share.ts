/**
 * Screen Sharing Helper for LiveKit
 * 
 * Simplifies screen sharing operations in video sessions
 */

import { Room, Track } from "livekit-client";

/**
 * Start screen sharing
 */
export async function startScreenShare(room: Room): Promise<boolean> {
  try {
    await room.localParticipant.setScreenShareEnabled(true, {
      audio: true, // Include system audio
    });
    return true;
  } catch (error) {
    console.error("Error starting screen share:", error);
    return false;
  }
}

/**
 * Stop screen sharing
 */
export async function stopScreenShare(room: Room): Promise<boolean> {
  try {
    await room.localParticipant.setScreenShareEnabled(false);
    return true;
  } catch (error) {
    console.error("Error stopping screen share:", error);
    return false;
  }
}

/**
 * Check if user is currently sharing screen
 */
export function isScreenSharing(room: Room): boolean {
  return room.localParticipant.isScreenShareEnabled;
}

/**
 * Get screen share track if active
 */
export function getScreenShareTrack(room: Room) {
  const tracks = room.localParticipant.getTrackPublications();
  
  for (const track of tracks.values()) {
    if (track.source === Track.Source.ScreenShare) {
      return track.track;
    }
  }
  
  return null;
}

/**
 * Check browser support for screen sharing
 */
export function isScreenShareSupported(): boolean {
  return typeof navigator !== "undefined" && 
         typeof navigator.mediaDevices !== "undefined" &&
         typeof navigator.mediaDevices.getDisplayMedia === "function";
}
