import type { FrameData } from './frameProcessing';

export interface VideoPreviewProps {
  stream: MediaStream | null;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onStreamError?: (error: string) => void;
  enableFrameProcessing?: boolean;
  onFrameProcessed?: (frameData: FrameData) => void;
}

export interface VideoPreviewState {
  isPlaying: boolean;
  hasError: boolean;
  errorMessage: string;
}