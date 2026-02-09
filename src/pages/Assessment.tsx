import { useState } from 'react';
import CameraPermission from '../components/CameraPermission';
import VideoPreview from '../components/VideoPreview';
import RecordingControls from '../components/RecordingControls';
import { useVideoRecorder } from '../utils/useVideoRecorder';
import type { CameraError } from '../types/camera';

const Assessment: React.FC = () => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);

  // Initialize video recorder
  const videoRecorder = useVideoRecorder(cameraStream, {
    videoBitsPerSecond: 2500000,
    mimeType: 'video/webm;codecs=vp9'
  });

  const handlePermissionGranted = (stream: MediaStream) => {
    setCameraStream(stream);
    setCameraError(null);
    console.log('Camera permission granted:', stream);
  };

  const handlePermissionDenied = (error: CameraError) => {
    setCameraError(error);
    setCameraStream(null);
    console.error('Camera permission denied:', error);
  };

  const handleVideoStreamError = (errorMessage: string) => {
    console.error('Video stream error:', errorMessage);
  };

  const handleToggleVideoVisibility = () => {
    setIsVideoVisible(prev => !prev);
  };

  return (
    <div className="assessment">
      <h1>Assessment</h1>
      
      {!cameraStream ? (
        <div>
          <p>Before starting the assessment, we need access to your camera for monitoring purposes.</p>
          <CameraPermission 
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        </div>
      ) : (
        <div>
          <div className="camera-status">
            <p>✓ Camera access granted. Monitoring system is ready.</p>
            <p>You can start recording your assessment session using the controls below.</p>
          </div>

          <RecordingControls recorder={videoRecorder} />
          
          <VideoPreview
            stream={cameraStream}
            isVisible={isVideoVisible}
            onToggleVisibility={handleToggleVideoVisibility}
            onStreamError={handleVideoStreamError}
          />

          {videoRecorder.recordingResult && (
            <div className="recording-completed">
              <p>✓ Recording completed successfully! Assessment interface will be implemented in the next step.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Assessment;