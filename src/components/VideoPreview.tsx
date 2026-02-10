import { useEffect, useRef, useState } from 'react';
import type { VideoPreviewProps, VideoPreviewState } from '../types/video';
import type { FrameData } from '../types/frameProcessing';
import type { FaceDetectionResult } from '../types/faceDetection';
import type { FaceCountEvent } from '../types/faceCounter';
import { useFrameProcessor } from '../utils/useFrameProcessor';
import { useFaceCounter } from '../utils/useFaceCounter';
import { useFaceCountLogger } from '../utils/useFaceCountLogger';
import { useEventCollector } from '../utils/useEventCollector';
import { useMultiplePersonDetector } from '../utils/useMultiplePersonDetector';
import { useGazeEstimator } from '../utils/useGazeEstimator';
import { useLookingAwayDetector } from '../utils/useLookingAwayDetector';
import FrameProcessorStatus from './FrameProcessorStatus';
import FaceDetectionOverlay from './FaceDetectionOverlay';
import FaceCountDisplay from './FaceCountDisplay';
import EventMonitor from './EventMonitor';
import ScoreDisplay from './ScoreDisplay';
import MultiplePersonIndicator from './MultiplePersonIndicator';
import GazeIndicator from './GazeIndicator';
import GazeCalibration from './GazeCalibration';
import LookingAwayTimer from './LookingAwayTimer';
import './VideoPreview.css';

const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  isVisible = true,
  onToggleVisibility,
  onStreamError,
  enableFrameProcessing = false,
  onFrameProcessed
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<VideoPreviewState>({
    isPlaying: false,
    hasError: false,
    errorMessage: ''
  });
  const [latestFaceDetection, setLatestFaceDetection] = useState<FaceDetectionResult | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);

  // Frame processing
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  useEffect(() => {
    setVideoElement(videoRef.current);
  }, [enableFrameProcessing]);

  // Event collection system
  const eventCollector = useEventCollector({
    maxEvents: 1000,
    autoCleanup: true,
    enableValidation: true,
    autoStart: enableFrameProcessing
  });

  // Event logging (keeping for backward compatibility)
  const logger = useFaceCountLogger({
    autoSave: true,
    maxEvents: 500
  });

  // Multiple person detection with scoring
  // Gaze tracking system
  const gazeEstimator = useGazeEstimator({
    config: {
      lookAwayThreshold: 25, // degrees
      confidenceThreshold: 0.6,
      smoothingWindow: 5,
      calibrationPoints: 9,
      eyeOpenThreshold: 0.3,
      stabilityThreshold: 500
    },
    onGazeUpdate: (estimation) => {
      console.log('Gaze updated:', estimation);
      
      // Add gaze events to event collector
      if (eventCollector.isActive && estimation.isLookingAway) {
        eventCollector.addEvent({
          type: 'gaze_direction_change',
          confidence: estimation.confidence,
          gazeData: {
            direction: {
              x: estimation.gazePoint.x,
              y: estimation.gazePoint.y
            },
            deviation: estimation.deviation,
            isLookingAway: estimation.isLookingAway
          }
        });
      }
    },
    onError: (error) => {
      console.error('Gaze estimator error:', error);
      onStreamError?.(error.message);
    },
    autoStart: enableFrameProcessing
  });

  // Looking away detection system
  const lookingAwayDetector = useLookingAwayDetector({
    config: {
      lookAwayThreshold: 30, // degrees
      sustainedThreshold: 5000, // 5 seconds
      confidenceThreshold: 0.6,
      scoringThreshold: 5000, // 5 seconds for scoring
      resetGracePeriod: 500,
      maxCumulativeTime: 300000,
      pointsPerScoringEvent: 3 // +3 points per spec
    },
    onLookingAwayStart: (event) => {
      console.log('Looking away started:', event);
    },
    onLookingAwayEnd: (event) => {
      console.log('Looking away ended:', event);
    },
    onLookingAwayScoring: (event) => {
      console.log('Looking away scoring:', event);
      
      // Add to event collection system
      if (eventCollector.isActive) {
        eventCollector.addEvent({
          type: 'looking_away_extended',
          confidence: event.confidence,
          lookAwayDuration: event.duration,
          direction: {
            x: event.direction.includes('left') ? -1 : event.direction.includes('right') ? 1 : 0,
            y: event.direction.includes('up') ? -1 : event.direction.includes('down') ? 1 : 0
          },
          severity: event.severity
        });
      }
    },
    onError: (error) => {
      console.error('Looking away detector error:', error);
      onStreamError?.(error.message);
    },
    autoStart: enableFrameProcessing
  });

  const multiplePersonDetector = useMultiplePersonDetector({
    onScoreChange: (scoreStatus) => {
      console.log('Score changed:', scoreStatus);
    },
    onMultiplePersonEvent: (event) => {
      console.log('Multiple person event:', event);
      
      // Add to event collection system
      if (eventCollector.isActive) {
        if (event.type === 'multiple_person_start') {
          eventCollector.addEvent({
            type: 'multiple_faces_detected',
            confidence: event.confidence,
            faceCount: event.faceCount,
            previousCount: 1, // Assuming single person before
            sustainedDuration: event.sustained ? event.duration : undefined
          });
        } else if (event.type === 'multiple_person_end') {
          eventCollector.addEvent({
            type: 'single_face_restored',
            confidence: event.confidence,
            previousCount: event.faceCount,
            multipleFacesDuration: event.duration
          });
        }
      }
    },
    onError: (error) => {
      console.error('Multiple person detector error:', error);
      onStreamError?.(error.message);
    },
    config: {
      scoreConfig: {
        multipleFacesPoints: 10,
        sustainedMultipleFacesThreshold: 3,
        sustainedMultipleFacesBonus: 5,
        confidenceThreshold: 0.7,
        temporalValidationWindow: 200
      },
      sustainedThresholdMs: 3000,
      glitchFilterMs: 200,
      flaggingThreshold: 8,
      confidenceThreshold: 0.7,
      maxScoreHistory: 50
    },
    autoStart: enableFrameProcessing
  });

  // Face counting with integrated event collection
  const faceCounter = useFaceCounter({
    onCountChange: (event: FaceCountEvent) => {
      console.log('Face count event:', event);
      
      // Log to both systems
      logger.logEvent(event);
      
      // Process with multiple person detector
      const currentStatus = faceCounter.getCurrentStatus();
      if (multiplePersonDetector.isActive && currentStatus) {
        multiplePersonDetector.processDetection(currentStatus, event);
      }
      
      // Add to event collection system
      if (eventCollector.isActive) {
        // Convert FaceCountEvent to MonitoringEvent format
        if (event.eventType === 'multiple_faces_detected') {
          eventCollector.addEvent({
            type: 'multiple_faces_detected',
            confidence: event.confidence,
            faceCount: event.currentCount,
            previousCount: event.previousCount,
            sustainedDuration: event.duration
          });
        } else if (event.eventType === 'single_face_restored') {
          eventCollector.addEvent({
            type: 'single_face_restored',
            confidence: event.confidence,
            previousCount: event.previousCount,
            multipleFacesDuration: event.duration || 0
          });
        } else if (event.eventType === 'no_faces_detected') {
          eventCollector.addEvent({
            type: 'no_faces_detected',
            confidence: event.confidence,
            previousCount: event.previousCount,
            noFacesDuration: event.duration || 0
          });
        } else if (event.eventType === 'count_change') {
          eventCollector.addEvent({
            type: 'face_count_change',
            confidence: event.confidence,
            previousCount: event.previousCount,
            currentCount: event.currentCount,
            detectionData: {
              faces: [], // Will be populated with actual face data
              frameSize: { width: 640, height: 480 } // Default size
            }
          });
        }
      }
    },
    onError: (error) => {
      console.error('Face counter error:', error);
      onStreamError?.(error.message);
    },
    config: {
      confidenceThreshold: 0.7,
      smoothingWindow: 3,
      stableCountThreshold: 5,
      alertSensitivity: 0.8
    },
    autoStart: enableFrameProcessing
  });

  // Process looking away detection when gaze estimation updates
  useEffect(() => {
    if (gazeEstimator.gazeEstimation && lookingAwayDetector.isActive) {
      lookingAwayDetector.processGazeEstimation(gazeEstimator.gazeEstimation);
    }
  }, [gazeEstimator.gazeEstimation, lookingAwayDetector]);

  const frameProcessor = useFrameProcessor(
    enableFrameProcessing ? videoElement : null,
    {
      onFrame: (frameData: FrameData) => {
        // Update face detection results
        if (frameData.faceDetection) {
          setLatestFaceDetection(frameData.faceDetection);
          
          // Process face counting
          if (faceCounter.isActive) {
            faceCounter.processDetection(frameData.faceDetection);
          }
          
          // Process gaze estimation
          if (gazeEstimator.isModelLoaded && videoRef.current) {
            gazeEstimator.estimateGaze(videoRef.current);
          }
        }
        
        // Call parent callback
        onFrameProcessed?.(frameData);
      },
      onError: (error) => {
        console.error('Frame processing error:', error);
        onStreamError?.(error.message);
      },
      config: {
        interval: 500, // 2 FPS
        targetWidth: 640,
        targetHeight: 480,
        maintainAspectRatio: true,
        enableDebugCanvas: false,
        maxFrameRate: 5,
        enableFaceDetection: true
      }
    }
  );

  useEffect(() => {
    const video = videoRef.current;
    
    if (!video || !stream) return;

    const handleCanPlay = () => {
      video.play().then(() => {
        setVideoState(prev => ({
          ...prev,
          isPlaying: true,
          hasError: false,
          errorMessage: ''
        }));
      }).catch((error) => {
        const errorMsg = `Failed to play video: ${error.message}`;
        setVideoState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: errorMsg
        }));
        onStreamError?.(errorMsg);
      });
    };

    const handleError = () => {
      const errorMsg = 'Video playback error occurred';
      setVideoState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: errorMsg
      }));
      onStreamError?.(errorMsg);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      });
    };

    // Set up event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Set the stream
    video.srcObject = stream;

    // Cleanup function
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      
      if (video.srcObject) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream, onStreamError]);

  // Handle stream interruption
  useEffect(() => {
    if (!stream) return;

    const checkStreamStatus = () => {
      const tracks = stream.getTracks();
      const activeTracks = tracks.filter(track => track.readyState === 'live');
      
      if (activeTracks.length === 0) {
        const errorMsg = 'Video stream was interrupted or stopped';
        setVideoState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: errorMsg
        }));
        onStreamError?.(errorMsg);
      }
    };

    // Check stream status periodically
    const interval = setInterval(checkStreamStatus, 2000);

    return () => clearInterval(interval);
  }, [stream, onStreamError]);

  if (!stream) {
    return null;
  }

  return (
    <div className={`video-preview ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
        />

        {enableFrameProcessing && latestFaceDetection && (
          <FaceDetectionOverlay
            faceDetection={latestFaceDetection}
            videoWidth={240}
            videoHeight={180}
            isVisible={isVisible}
          />
        )}
        
        {videoState.hasError && (
          <div className="video-error-overlay">
            <div className="error-icon">⚠</div>
            <p>{videoState.errorMessage}</p>
          </div>
        )}

        {onToggleVisibility && (
          <div className="video-controls">
            <button 
              onClick={onToggleVisibility}
              className="toggle-visibility-btn"
              title={isVisible ? 'Hide camera preview' : 'Show camera preview'}
            >
              {isVisible ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        )}

        <div className="video-info">
          <div className={`status-indicator ${videoState.isPlaying ? 'playing' : 'stopped'}`}>
            <div className="status-dot"></div>
            {videoState.isPlaying ? 'Live' : 'Stopped'}
          </div>
          {enableFrameProcessing && frameProcessor.stats && (
            <div className="frame-stats">
              <span className="frame-fps">{frameProcessor.stats.currentFPS.toFixed(1)} FPS</span>
              <span className="frame-count">{frameProcessor.stats.processedFrames} frames</span>
            </div>
          )}
        </div>
      </div>

      {enableFrameProcessing && isVisible && (
        <div className="frame-processing-overlay">
          <FrameProcessorStatus
            isProcessing={frameProcessor.isProcessing}
            stats={frameProcessor.stats}
            config={frameProcessor.stats ? {
              interval: 500,
              targetWidth: 640,
              targetHeight: 480,
              maintainAspectRatio: true,
              enableDebugCanvas: false,
              maxFrameRate: 5,
              skipFramesWhenBusy: true,
              enableFaceDetection: true
            } : null}
            onStart={frameProcessor.startProcessing}
            onStop={frameProcessor.stopProcessing}
            onPause={frameProcessor.pauseProcessing}
            onResume={frameProcessor.resumeProcessing}
            onConfigUpdate={frameProcessor.updateConfig}
            error={frameProcessor.error}
            compact={true}
          />
          
          {/* Face Count Display */}
          <FaceCountDisplay
            status={faceCounter.status}
            stats={faceCounter.stats}
            history={faceCounter.getHistory()}
            isVisible={isVisible}
            compact={true}
            showHistory={false}
          />

          {/* Multiple Person Detection Indicator */}
          <MultiplePersonIndicator
            detectionStatus={multiplePersonDetector.detectionStatus}
            isVisible={isVisible}
            compact={true}
            showConfidence={true}
          />

          {/* Score Display */}
          <ScoreDisplay
            scoreStatus={multiplePersonDetector.scoreStatus}
            isVisible={isVisible}
            compact={true}
            showHistory={false}
          />

          {/* Gaze Indicator */}
          <GazeIndicator
            gazeEstimation={gazeEstimator.gazeEstimation}
            stats={gazeEstimator.stats}
            isVisible={isVisible}
            compact={true}
            showZone={true}
            showDeviation={true}
            showConfidence={true}
          />

          {/* Looking Away Timer */}
          <LookingAwayTimer
            timerState={lookingAwayDetector.timerState}
            warning={lookingAwayDetector.warning}
            stats={lookingAwayDetector.stats}
            isVisible={isVisible}
            compact={true}
            showProgress={true}
            showStats={false}
          />

          {/* Event Monitor */}
          <EventMonitor
            recentEvents={eventCollector.recentEvents}
            statistics={eventCollector.statistics}
            eventCount={eventCollector.eventCount}
            sessionId={eventCollector.sessionId}
            onExportEvents={(options) => {
              const result = eventCollector.exportEvents(options);
              
              // Trigger download
              const blob = new Blob([
                typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)
              ], { 
                type: options.format === 'json' ? 'application/json' : 'text/csv' 
              });
              
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = result.filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              console.log('Events exported:', result);
            }}
            isVisible={isVisible}
            compact={true}
          />
        </div>
      )}
      
      {/* Gaze Calibration Modal */}
      <GazeCalibration
        isVisible={showCalibration}
        onCalibrationComplete={(calibration) => {
          gazeEstimator.setCalibration(calibration);
          setShowCalibration(false);
          console.log('Calibration completed:', calibration);
        }}
        onCancel={() => setShowCalibration(false)}
        getCurrentGaze={() => gazeEstimator.gazeEstimation?.gazePoint || null}
      />
    </div>
  );
};

export default VideoPreview;