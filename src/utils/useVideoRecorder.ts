import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  RecordingState,
  RecordingOptions,
  RecordingError,
  RecordingResult,
  UseVideoRecorderReturn
} from '../types/recording';

const DEFAULT_OPTIONS: RecordingOptions = {
  videoBitsPerSecond: 2500000, // 2.5 Mbps
  mimeType: 'video/webm;codecs=vp9',
  timeslice: 1000 // Collect data every second
};

export const useVideoRecorder = (
  stream: MediaStream | null,
  options: RecordingOptions = {}
): UseVideoRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<RecordingError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Check if recording is supported
  const canRecord = Boolean(
    stream && 
    MediaRecorder.isTypeSupported(mergedOptions.mimeType || DEFAULT_OPTIONS.mimeType!)
  );

  // Clean up function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    chunksRef.current = [];
    setRecordingDuration(0);
    setError(null);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream || !canRecord) {
      setError({
        type: 'START_ERROR',
        message: 'Cannot start recording: no stream available or recording not supported'
      });
      return;
    }

    if (recordingState === 'recording') {
      console.warn('Recording already in progress');
      return;
    }

    try {
      cleanup();

      // Try different MIME types if the preferred one isn't supported
      let mimeType = mergedOptions.mimeType!;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackTypes = [
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
          ''
        ];
        
        mimeType = fallbackTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: mergedOptions.videoBitsPerSecond,
        audioBitsPerSecond: mergedOptions.audioBitsPerSecond
      });

      mediaRecorderRef.current = mediaRecorder;

      // Event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        setRecordingState('recording');
        startTimeRef.current = Date.now();
        
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        setRecordingState('stopped');
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        // Create final blob
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        setRecordingResult({
          blob,
          duration: finalDuration,
          size: blob.size,
          mimeType: blob.type
        });

        console.log('Recording completed:', {
          size: blob.size,
          duration: finalDuration,
          type: blob.type
        });
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setRecordingState('error');
        setError({
          type: 'DATA_ERROR',
          message: `Recording error: ${event.error?.message || 'Unknown error'}`,
          originalError: event.error
        });
        cleanup();
      };

      // Start recording
      mediaRecorder.start(mergedOptions.timeslice);

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setRecordingState('error');
      setError({
        type: 'START_ERROR',
        message: `Failed to start recording: ${err.message}`,
        originalError: err
      });
    }
  }, [stream, canRecord, recordingState, mergedOptions, cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    
    if (!mediaRecorder || recordingState !== 'recording') {
      console.warn('No active recording to stop');
      return;
    }

    try {
      mediaRecorder.stop();
      mediaRecorderRef.current = null;
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setRecordingState('error');
      setError({
        type: 'STOP_ERROR',
        message: `Failed to stop recording: ${err.message}`,
        originalError: err
      });
    }
  }, [recordingState]);

  // Clean up on unmount or when stream changes
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && recordingState === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('Error stopping recording on cleanup:', err);
        }
      }
      cleanup();
    };
  }, [cleanup, recordingState]);

  // Reset state when stream changes
  useEffect(() => {
    if (recordingState === 'recording') {
      stopRecording();
    }
    setRecordingState('idle');
    setRecordingResult(null);
    cleanup();
  }, [stream]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    recordingState,
    recordingDuration,
    recordingResult,
    error,
    startRecording,
    stopRecording,
    isRecording: recordingState === 'recording',
    canRecord
  };
};