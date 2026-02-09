export type RecordingState = 'idle' | 'recording' | 'stopped' | 'error';

export interface RecordingOptions {
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  mimeType?: string;
  timeslice?: number;
}

export interface RecordingError {
  type: 'START_ERROR' | 'STOP_ERROR' | 'DATA_ERROR' | 'UNSUPPORTED_FORMAT';
  message: string;
  originalError?: Error;
}

export interface RecordingResult {
  blob: Blob | null;
  duration: number;
  size: number;
  mimeType: string;
}

export interface UseVideoRecorderReturn {
  recordingState: RecordingState;
  recordingDuration: number;
  recordingResult: RecordingResult | null;
  error: RecordingError | null;
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  canRecord: boolean;
}