import { useRef, useEffect, useState, useCallback } from 'react';
import { useModel } from '../hooks/useModel';

const PROMPTS = [
  'a person looking directly at the camera',
  'a person looking away from the screen',
  'multiple people visible',
  'nobody visible in the frame',
];

interface PromptScore {
  label: string;
  score: number;
}

const AssessmentMinimal: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detections, setDetections] = useState<PromptScore[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const { data: faceModel, isLoading, isSuccess } = useModel('face-detection');

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

  const detectFrame = useCallback(async () => {
    if (!faceModel || !videoRef.current) return;

    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const video = videoRef.current;

      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempCtx!.drawImage(video, 0, 0);

      const results: PromptScore[] = await faceModel(tempCanvas, PROMPTS);

      console.log('CLIP scores:', results);
      setDetections(results);
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, [faceModel]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isDetecting && isSuccess && videoRef.current) {
      intervalId = setInterval(detectFrame, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isDetecting, isSuccess, detectFrame]);

  const toggleDetection = () => setIsDetecting(prev => !prev);

  const topLabel = detections.length > 0 ? detections[0].label : null;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Minimal CLIP Assessment</h1>

      <div style={{ marginBottom: '20px' }}>
        <p>Model Status: {isLoading ? '⏳ Loading...' : isSuccess ? '✅ Ready' : '❌ Error'}</p>
        <p>Camera Status: {stream ? '✅ Connected' : '⏳ Connecting...'}</p>
        <p>Detection Status: {isDetecting ? '🟢 Running' : '🔴 Stopped'}</p>
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
            borderRadius: '5px',
          }}
        >
          {isDetecting ? 'Stop Detection' : 'Start Detection'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          style={{ border: '1px solid #ccc' }}
        />
      </div>

      <div>
        <h3>Detection Log:</h3>
        <div style={{
          height: '200px',
          overflowY: 'scroll',
          border: '1px solid #ccc',
          padding: '10px',
          backgroundColor: '#f5f5f5',
        }}>
          {detections.map((item) => (
            <div
              key={item.label}
              style={{ fontWeight: item.label === topLabel ? 'bold' : 'normal' }}
            >
              {item.label === topLabel ? '▶ ' : '  '}{item.label}: {(item.score * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssessmentMinimal;
