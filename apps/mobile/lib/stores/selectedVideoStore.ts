import { SelectedVideo } from "@hyperbolic/shared-types";

/**
 * Simple in-memory store for passing selected video data between screens.
 * This avoids navigation param serialization issues and stack duplication.
 */

interface SelectedVideoData {
  video: SelectedVideo;
  thumbnailUri: string | null;
}

let selectedVideoData: SelectedVideoData | null = null;

export function setSelectedVideo(data: SelectedVideoData): void {
  selectedVideoData = data;
}

export function getSelectedVideo(): SelectedVideoData | null {
  return selectedVideoData;
}

export function clearSelectedVideo(): void {
  selectedVideoData = null;
}
