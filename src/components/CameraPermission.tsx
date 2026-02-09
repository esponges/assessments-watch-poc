import { useState, useEffect } from 'react';
import { PermissionStatus, CameraError, CameraPermissionProps } from '../types/camera';
import './CameraPermission.css';

const CameraPermission: React.FC<CameraPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('pending');
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const requestCameraPermission = async () => {
    setIsLoading(true);
    setError(null);
    setPermissionStatus('pending');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      setPermissionStatus('granted');
      setIsLoading(false);
      onPermissionGranted(stream);
    } catch (err: any) {
      setIsLoading(false);
      
      let cameraError: CameraError;
      
      switch (err.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          cameraError = {
            type: 'NO_CAMERA',
            message: 'No camera device found. Please connect a camera and try again.'
          };
          break;
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          cameraError = {
            type: 'PERMISSION_DENIED',
            message: 'Camera access denied. Please allow camera permissions to continue.'
          };
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          cameraError = {
            type: 'CAMERA_IN_USE',
            message: 'Camera is already in use by another application. Please close other applications using the camera.'
          };
          break;
        default:
          cameraError = {
            type: 'UNKNOWN',
            message: `Camera access failed: ${err.message || 'Unknown error'}`
          };
      }
      
      setError(cameraError);
      setPermissionStatus('error');
      onPermissionDenied(cameraError);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    requestCameraPermission();
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const renderContent = () => {
    switch (permissionStatus) {
      case 'pending':
        return (
          <div className="camera-permission-pending">
            <div className="loading-spinner"></div>
            <h3>Requesting Camera Access</h3>
            <p>Please allow camera access when prompted by your browser.</p>
            {isLoading && <p className="loading-text">Connecting to camera...</p>}
          </div>
        );

      case 'granted':
        return (
          <div className="camera-permission-success">
            <div className="success-icon">✓</div>
            <h3>Camera Access Granted</h3>
            <p>Your camera is ready for monitoring.</p>
          </div>
        );

      case 'error':
        return (
          <div className="camera-permission-error">
            <div className="error-icon">⚠</div>
            <h3>Camera Access Error</h3>
            <p>{error?.message}</p>
            <div className="error-actions">
              <button onClick={handleRetry} className="retry-button">
                Try Again {retryCount > 0 && `(Attempt ${retryCount + 1})`}
              </button>
              {error?.type === 'PERMISSION_DENIED' && (
                <div className="permission-help">
                  <p><strong>How to enable camera permissions:</strong></p>
                  <ul>
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera access</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="camera-permission">
      {renderContent()}
    </div>
  );
};

export default CameraPermission;