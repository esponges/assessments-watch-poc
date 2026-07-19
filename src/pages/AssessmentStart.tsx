import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModels } from '../hooks/useModel';

const AssessmentStart: React.FC = () => {
  const navigate = useNavigate();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { isLoading: modelsLoading, isSuccess: modelsReady, isError: modelsError } = useModels();

  // Get camera permission
  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        setCameraStream(stream);
        console.log('Camera permission granted');
      } catch (error) {
        console.error('Camera permission denied:', error);
      }
    };

    getCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartAssessment = () => {
    if (modelsReady && cameraStream) {
      navigate('/assessment');
    }
  };

  const isReady = modelsReady && cameraStream !== null;

  return (
    <div className="assessment-start">
      <h1>Assessment Setup</h1>
      
      <div className="setup-checklist">
        <h3>System Check</h3>
        
        <div className={`check-item ${modelsReady ? 'ready' : 'loading'}`}>
          <span>🤖 AI Models: </span>
          {modelsLoading && <span>Loading...</span>}
          {modelsReady && <span>✅ Ready</span>}
          {modelsError && <span>❌ Error</span>}
        </div>
        
        <div className={`check-item ${cameraStream ? 'ready' : 'loading'}`}>
          <span>📹 Camera: </span>
          {cameraStream ? <span>✅ Connected</span> : <span>⏳ Requesting permission...</span>}
        </div>
      </div>

      {isReady && (
        <div className="ready-section">
          <h3>✅ System Ready</h3>
          <p>All systems are operational. You may begin the assessment.</p>
          <button 
            onClick={handleStartAssessment}
            className="start-button"
          >
            Start Assessment
          </button>
        </div>
      )}

      {!isReady && (
        <div className="waiting-section">
          <p>Please wait while we prepare the assessment system...</p>
        </div>
      )}
    </div>
  );
};

export default AssessmentStart;