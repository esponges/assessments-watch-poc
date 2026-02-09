import { useState } from 'react';
import CameraPermission from '../components/CameraPermission';
import VideoPreview from '../components/VideoPreview';
import type { CameraError } from '../types/camera';

const Assessment: React.FC = () => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);

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
            <p>✓ Camera access granted. Live video preview is available.</p>
            <p>You can toggle the video preview visibility using the button in the bottom-right corner.</p>
            <p>Assessment interface will be implemented in the next step.</p>
          </div>
          
          <VideoPreview
            stream={cameraStream}
            isVisible={isVideoVisible}
            onToggleVisibility={handleToggleVideoVisibility}
            onStreamError={handleVideoStreamError}
          />
        </div>
      )}
    </div>
  );
};

export default Assessment;