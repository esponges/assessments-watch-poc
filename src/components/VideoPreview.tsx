import { useEffect, useRef, useState } from 'react';
import type { VideoPreviewProps, VideoPreviewState } from '../types/video';
import type { FrameData } from '../types/frameProcessing';
import { useFrameProcessor } from '../utils/useFrameProcessor';
import FrameProcessorStatus from './FrameProcessorStatus';
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

  // Frame processing
  const frameProcessor = useFrameProcessor(
    enableFrameProcessing ? videoRef.current : null,
    {
      onFrame: onFrameProcessed,
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
        maxFrameRate: 5
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
              skipFramesWhenBusy: true
            } : null}
            onStart={frameProcessor.startProcessing}
            onStop={frameProcessor.stopProcessing}
            onPause={frameProcessor.pauseProcessing}
            onResume={frameProcessor.resumeProcessing}
            onConfigUpdate={frameProcessor.updateConfig}
            error={frameProcessor.error}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPreview;