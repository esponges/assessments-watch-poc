import { useRef, useEffect, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useModel } from '../hooks/useModel';

// CLIP handles scene-level signals only; gaze is owned by MediaPipe
const CLIP_PROMPTS = [
  'a person facing the camera with eyes looking forward',
  'multiple people visible',
  'an empty room with nobody present',
];

// MediaPipe 478-point face landmark indices
const LM = {
  noseTip: 1,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  rightIris: 468,
  leftEyeInner: 362,
  leftEyeOuter: 263,
  leftIris: 473,
};

// Tunable thresholds — lower = more sensitive
const HEAD_YAW_THRESHOLD = 0.10;  // fraction of inter-eye distance
const IRIS_THRESHOLD = 0.15;       // fraction of eye width

interface PromptScore { label: string; score: number; }
interface GazeResult { lookingAway: boolean; reason: string; }

function analyzeGaze(lm: NormalizedLandmark[]): GazeResult {
  // Head yaw: how far the nose has moved from the eye midpoint
  const eyeMidX = (lm[LM.rightEyeOuter].x + lm[LM.leftEyeOuter].x) / 2;
  const faceWidth = Math.abs(lm[LM.leftEyeOuter].x - lm[LM.rightEyeOuter].x);
  const headYaw = faceWidth > 0 ? Math.abs(lm[LM.noseTip].x - eyeMidX) / faceWidth : 0;

  // Iris offset: how far each iris deviates from its eye centre
  const rightCenter = (lm[LM.rightEyeOuter].x + lm[LM.rightEyeInner].x) / 2;
  const rightWidth = Math.abs(lm[LM.rightEyeInner].x - lm[LM.rightEyeOuter].x);
  const rightOffset = rightWidth > 0 ? Math.abs(lm[LM.rightIris].x - rightCenter) / rightWidth : 0;

  const leftCenter = (lm[LM.leftEyeOuter].x + lm[LM.leftEyeInner].x) / 2;
  const leftWidth = Math.abs(lm[LM.leftEyeOuter].x - lm[LM.leftEyeInner].x);
  const leftOffset = leftWidth > 0 ? Math.abs(lm[LM.leftIris].x - leftCenter) / leftWidth : 0;

  const irisOffset = Math.max(rightOffset, leftOffset);
  const headTurned = headYaw > HEAD_YAW_THRESHOLD;
  const eyesDeviated = irisOffset > IRIS_THRESHOLD;

  const reason = headTurned && eyesDeviated
    ? `head + eyes (yaw=${headYaw.toFixed(2)}, iris=${irisOffset.toFixed(2)})`
    : headTurned
      ? `head turned (yaw=${headYaw.toFixed(2)})`
      : eyesDeviated
        ? `eyes deviated (iris=${irisOffset.toFixed(2)})`
        : 'looking at screen';

  return { lookingAway: headTurned || eyesDeviated, reason };
}

const AssessmentMinimal: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [clipScores, setClipScores] = useState<PromptScore[]>([]);
  const [gazeResult, setGazeResult] = useState<GazeResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [landmarkerReady, setLandmarkerReady] = useState(false);

  const { data: faceModel, isLoading: clipLoading, isSuccess: clipReady } = useModel('face-detection');

  useEffect(() => {
    FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm`
    ).then(fileset =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        runningMode: 'IMAGE',
        numFaces: 1,
      })
    ).then(landmarker => {
      faceLandmarkerRef.current = landmarker;
      setLandmarkerReady(true);
    }).catch(err => console.error('FaceLandmarker load error:', err));
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then(mediaStream => {
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch(err => console.error('Camera error:', err));

    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  const detectFrame = useCallback(async () => {
    if (!faceModel || !faceLandmarkerRef.current || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const [clipResults, landmarkResult] = await Promise.all([
      faceModel(canvas, CLIP_PROMPTS) as Promise<PromptScore[]>,
      Promise.resolve(faceLandmarkerRef.current.detect(canvas)),
    ]);

    setClipScores(clipResults);

    if (landmarkResult.faceLandmarks.length > 0) {
      setGazeResult(analyzeGaze(landmarkResult.faceLandmarks[0]));
    } else {
      setGazeResult({ lookingAway: false, reason: 'no face detected' });
    }

    console.log(
      'gaze:', landmarkResult.faceLandmarks.length > 0
        ? analyzeGaze(landmarkResult.faceLandmarks[0]).reason
        : 'no face',
      '| clip:', clipResults.map(r => `${r.label.split(' ').slice(-2).join(' ')}: ${(r.score * 100).toFixed(0)}%`).join(', ')
    );
  }, [faceModel]);

  useEffect(() => {
    if (!isDetecting || !clipReady || !landmarkerReady) return;
    const id = setInterval(detectFrame, 3000);
    return () => clearInterval(id);
  }, [isDetecting, clipReady, landmarkerReady, detectFrame]);

  const isReady = clipReady && landmarkerReady;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Minimal CLIP + Gaze Assessment</h1>

      <div style={{ marginBottom: '20px' }}>
        <p>CLIP: {clipLoading ? '⏳ Loading...' : clipReady ? '✅ Ready' : '❌ Error'}</p>
        <p>Gaze tracker: {landmarkerReady ? '✅ Ready' : '⏳ Loading...'}</p>
        <p>Camera: {stream ? '✅ Connected' : '⏳ Connecting...'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setIsDetecting(prev => !prev)}
          disabled={!isReady || !stream}
          style={{
            padding: '10px 20px', fontSize: '16px',
            backgroundColor: isDetecting ? 'red' : 'green',
            color: 'white', border: 'none', borderRadius: '5px',
          }}
        >
          {isDetecting ? 'Stop Detection' : 'Start Detection'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <video ref={videoRef} autoPlay playsInline muted width="640" height="480"
          style={{ border: '1px solid #ccc' }} />
      </div>

      <div>
        <h3>Detection Results:</h3>
        <div style={{ border: '1px solid #ccc', padding: '10px', backgroundColor: '#f5f5f5' }}>
          {gazeResult && (
            <div style={{
              fontWeight: 'bold',
              color: gazeResult.lookingAway ? '#c00' : '#060',
              fontSize: '16px',
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: gazeResult.lookingAway ? '#fff0f0' : '#f0fff0',
              borderRadius: '4px',
            }}>
              {gazeResult.lookingAway ? `⚠️ Looking away — ${gazeResult.reason}` : '✅ Looking at screen'}
            </div>
          )}

          {clipScores.map((item, i) => (
            <div key={item.label} style={{ fontWeight: i === 0 ? 'bold' : 'normal', marginTop: '4px' }}>
              {i === 0 ? '▶ ' : '  '}{item.label}: {(item.score * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssessmentMinimal;
