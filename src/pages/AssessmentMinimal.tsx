import { useRef, useEffect, useState, useCallback } from 'react';
import { useModel } from '../hooks/useModel';

const AssessmentMinimal: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Only use face detection model - nothing else
  const { data: faceModel, isLoading, isSuccess } = useModel('face-detection');

  // Get camera
  useEffect(() => {
    const getCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: false 
        });
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Camera error:', error);
      }
    };

    getCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simple face detection function
  const detectFaces = useCallback(async () => {
    if (!faceModel || !videoRef.current || !canvasRef.current) {
      return;
    }

    try {
      // Create a canvas to capture the current video frame
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const video = videoRef.current;
      
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempCtx.drawImage(video, 0, 0);
      
      // Use the Transformers.js face detection model with canvas as input
      const predictions = await faceModel(tempCanvas);
      
      if (predictions && predictions.length > 0) {
        console.log(`Detected ${predictions.length} face(s)`);
        setDetections(predictions);
        
        // Draw detections on canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        
        predictions.forEach((detection: any) => {
          if (detection.box) {
            const { xmin, ymin, xmax, ymax } = detection.box;
            ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
          }
        });
      } else {
        setDetections([]);
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, [faceModel]);

  // Start/stop detection
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isDetecting && isSuccess && videoRef.current) {
      intervalId = setInterval(detectFaces, 1000); // Detect every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isDetecting, isSuccess, detectFaces]);

  const toggleDetection = () => {
    setIsDetecting(prev => !prev);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Minimal Face Detection Assessment</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Model Status: {isLoading ? '⏳ Loading...' : isSuccess ? '✅ Ready' : '❌ Error'}</p>
        <p>Camera Status: {stream ? '✅ Connected' : '⏳ Connecting...'}</p>
        <p>Detection Status: {isDetecting ? '🟢 Running' : '🔴 Stopped'}</p>
        <p>Faces Detected: {detections.length}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={toggleDetection}
          disabled={!isSuccess || !stream}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: isDetecting ? 'red' : 'green',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isDetecting ? 'Stop Detection' : 'Start Detection'}
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          style={{ border: '1px solid #ccc' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Detection Log:</h3>
        <div style={{ 
          height: '200px', 
          overflowY: 'scroll', 
          border: '1px solid #ccc', 
          padding: '10px',
          backgroundColor: '#f5f5f5'
        }}>
          {detections.map((detection, index) => (
            <div key={index}>
              Face {index + 1}: {detection.label} (confidence: {(detection.score * 100).toFixed(1)}%)
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssessmentMinimal;