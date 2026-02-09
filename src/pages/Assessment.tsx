import { useState } from 'react';
import CameraPermission from '../components/CameraPermission';
import VideoPreview from '../components/VideoPreview';
import RecordingControls from '../components/RecordingControls';
import FileList from '../components/FileList';
import { useVideoRecorder } from '../utils/useVideoRecorder';
import { useFileManager } from '../utils/useFileManager';
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

  // Initialize file manager
  const fileManager = useFileManager();

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

  const handleRecordingComplete = (blob: Blob, duration: number, mimeType: string) => {
    const file = fileManager.addFile(blob, duration, mimeType);
    console.log('Recording added to file manager:', file);
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

          <RecordingControls 
            recorder={videoRecorder}
            onRecordingComplete={handleRecordingComplete}
            autoDownload={true}
          />
          
          <VideoPreview
            stream={cameraStream}
            isVisible={isVideoVisible}
            onToggleVisibility={handleToggleVideoVisibility}
            onStreamError={handleVideoStreamError}
          />

          <FileList
            files={fileManager.files}
            onDownload={fileManager.downloadFileById}
            onRemove={fileManager.removeFile}
            onClearAll={fileManager.clearAllFiles}
            storageStats={fileManager.getStorageStats()}
          />

          {videoRecorder.recordingResult && (
            <div className="recording-completed">
              <p>✓ Recording completed and saved! Assessment interface will be implemented in the next step.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Assessment;