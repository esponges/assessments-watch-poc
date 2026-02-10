import { useRef, useEffect } from 'react';
import type { FaceDetectionResult } from '../types/faceDetection';
import './FaceDetectionOverlay.css';

interface FaceDetectionOverlayProps {
  faceDetection: FaceDetectionResult | null;
  videoWidth: number;
  videoHeight: number;
  isVisible: boolean;
}

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  faceDetection,
  videoWidth,
  videoHeight,
  isVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !faceDetection || !isVisible) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors
    const scaleX = canvas.width / faceDetection.frameData.width;
    const scaleY = canvas.height / faceDetection.frameData.height;

    // Draw face bounding boxes
    faceDetection.faces.forEach((face, index) => {
      const { boundingBox, confidence } = face;
      
      // Scale coordinates to canvas size
      const x = boundingBox.topLeft[0] * scaleX;
      const y = boundingBox.topLeft[1] * scaleY;
      const width = boundingBox.width * scaleX;
      const height = boundingBox.height * scaleY;

      // Draw bounding box
      ctx.strokeStyle = confidence > 0.8 ? '#00ff00' : confidence > 0.6 ? '#ffff00' : '#ff8800';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);

      // Draw confidence score
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '12px monospace';
      ctx.fillText(
        `Face ${index + 1}: ${(confidence * 100).toFixed(0)}%`,
        x,
        y - 5
      );

      // Draw landmarks if available
      if (face.landmarks) {
        ctx.fillStyle = '#ff0000';
        face.landmarks.forEach(([lx, ly]) => {
          const scaledX = lx * scaleX;
          const scaledY = ly * scaleY;
          
          ctx.beginPath();
          ctx.arc(scaledX, scaledY, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });

    // Draw face count
    if (faceDetection.faces.length > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 120, 25);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Faces: ${faceDetection.faces.length}`,
        15,
        28
      );
    }

    // Draw processing time
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 40, 150, 25);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Processing: ${faceDetection.processingTime.toFixed(1)}ms`,
      15,
      58
    );

  }, [faceDetection, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="face-detection-overlay"
      width={videoWidth}
      height={videoHeight}
    />
  );
};

export default FaceDetectionOverlay;