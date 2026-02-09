export interface VideoPreviewProps {
  stream: MediaStream | null;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onStreamError?: (error: string) => void;
}

export interface VideoPreviewState {
  isPlaying: boolean;
  hasError: boolean;
  errorMessage: string;
}