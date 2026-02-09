import { useState } from 'react';
import CameraPermission from '../components/CameraPermission';
import type { CameraError } from '../types/camera';

const Assessment: React.FC = () => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);

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
            <p>✓ Camera access granted. Monitoring is ready.</p>
            <p>Assessment interface will be implemented in the next step.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;