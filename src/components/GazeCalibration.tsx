import { useState, useEffect, useRef } from 'react';
import type { 
  CalibrationData, 
  CalibrationPoint, 
  GazePoint 
} from '../types/gazeDetection';
import './GazeCalibration.css';

interface GazeCalibrationProps {
  isVisible: boolean;
  onCalibrationComplete: (calibration: CalibrationData) => void;
  onCancel: () => void;
  getCurrentGaze?: () => GazePoint | null;
}

const GazeCalibration: React.FC<GazeCalibrationProps> = ({
  isVisible,
  onCalibrationComplete,
  onCancel,
  getCurrentGaze
}) => {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectedPoints, setCollectedPoints] = useState<CalibrationPoint[]>([]);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 9-point calibration grid
  const calibrationPoints: GazePoint[] = [
    { x: -0.8, y: -0.8 }, // Top-left
    { x: 0, y: -0.8 },    // Top-center
    { x: 0.8, y: -0.8 },  // Top-right
    { x: -0.8, y: 0 },    // Middle-left
    { x: 0, y: 0 },       // Center
    { x: 0.8, y: 0 },     // Middle-right
    { x: -0.8, y: 0.8 },  // Bottom-left
    { x: 0, y: 0.8 },     // Bottom-center
    { x: 0.8, y: 0.8 }    // Bottom-right
  ];

  // Reset calibration when becoming visible
  useEffect(() => {
    if (isVisible) {
      setCurrentPointIndex(0);
      setCollectedPoints([]);
      setIsCollecting(false);
      setCountdown(0);
    }
  }, [isVisible]);

  // Start collecting data for current point
  const startCollection = () => {
    if (!getCurrentGaze) return;

    setIsCollecting(true);
    setCountdown(3);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          collectData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Collect gaze data for current calibration point
  const collectData = () => {
    if (!getCurrentGaze) return;

    const samples: GazePoint[] = [];
    let sampleCount = 0;
    const targetSamples = 30; // Collect samples for 1 second at 30fps

    intervalRef.current = setInterval(() => {
      const gaze = getCurrentGaze();
      if (gaze) {
        samples.push(gaze);
      }
      
      sampleCount++;
      
      if (sampleCount >= targetSamples) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Calculate average gaze point
        const avgGaze: GazePoint = {
          x: samples.reduce((sum, p) => sum + p.x, 0) / samples.length,
          y: samples.reduce((sum, p) => sum + p.y, 0) / samples.length
        };

        // Calculate confidence based on consistency
        const variance = samples.reduce((sum, p) => {
          return sum + Math.pow(p.x - avgGaze.x, 2) + Math.pow(p.y - avgGaze.y, 2);
        }, 0) / samples.length;
        
        const confidence = Math.max(0, 1 - variance);

        // Add calibration point
        const calibrationPoint: CalibrationPoint = {
          screenPoint: calibrationPoints[currentPointIndex],
          gazePoint: avgGaze,
          confidence,
          timestamp: Date.now()
        };

        setCollectedPoints(prev => [...prev, calibrationPoint]);
        setIsCollecting(false);
        
        // Move to next point or finish
        if (currentPointIndex < calibrationPoints.length - 1) {
          setTimeout(() => {
            setCurrentPointIndex(prev => prev + 1);
          }, 500);
        } else {
          finishCalibration([...collectedPoints, calibrationPoint]);
        }
      }
    }, 33); // ~30fps
  };

  // Calculate calibration transformation and finish
  const finishCalibration = (points: CalibrationPoint[]) => {
    // Simple linear transformation calculation
    let sumXScale = 0, sumYScale = 0, sumXOffset = 0, sumYOffset = 0;
    let validPoints = 0;

    points.forEach(point => {
      if (point.confidence > 0.5) { // Only use high-confidence points
        sumXScale += (point.screenPoint.x - point.gazePoint.x);
        sumYScale += (point.screenPoint.y - point.gazePoint.y);
        sumXOffset += point.screenPoint.x - point.gazePoint.x;
        sumYOffset += point.screenPoint.y - point.gazePoint.y;
        validPoints++;
      }
    });

    if (validPoints === 0) {
      // Calibration failed
      alert('Calibration failed. Please try again with better eye visibility.');
      return;
    }

    const transformation = {
      scaleX: 1 + (sumXScale / validPoints),
      scaleY: 1 + (sumYScale / validPoints),
      offsetX: sumXOffset / validPoints,
      offsetY: sumYOffset / validPoints
    };

    // Calculate overall quality based on point confidence
    const averageConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    const quality = Math.min(0.95, averageConfidence * (validPoints / points.length));

    const calibrationData: CalibrationData = {
      points,
      transformation,
      quality,
      timestamp: Date.now()
    };

    onCalibrationComplete(calibrationData);
  };

  // Convert normalized coordinates to screen pixels
  const pointToScreenPosition = (point: GazePoint) => {
    return {
      left: `${50 + (point.x * 40)}%`, // Scale to fit in screen area
      top: `${50 + (point.y * 40)}%`
    };
  };

  if (!isVisible) {
    return null;
  }

  const currentPoint = calibrationPoints[currentPointIndex];
  const progress = ((currentPointIndex + (isCollecting ? 1 : 0)) / calibrationPoints.length) * 100;

  return (
    <div className="gaze-calibration-overlay">
      <div className="calibration-background" onClick={onCancel} />
      
      <div className="calibration-container">
        <div className="calibration-header">
          <h2>Gaze Calibration</h2>
          <button className="cancel-btn" onClick={onCancel}>×</button>
        </div>

        <div className="calibration-instructions">
          {currentPointIndex === 0 && !isCollecting ? (
            <div className="start-instructions">
              <p>Follow the red dot with your eyes and keep your head still.</p>
              <p>Click the dot when you're ready to calibrate that point.</p>
              <button className="start-btn" onClick={startCollection}>
                Start Calibration
              </button>
            </div>
          ) : (
            <div className="progress-info">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p>
                Point {currentPointIndex + 1} of {calibrationPoints.length}
                {isCollecting && countdown > 0 && ` - Starting in ${countdown}...`}
                {isCollecting && countdown === 0 && ' - Collecting data...'}
              </p>
            </div>
          )}
        </div>

        <div className="calibration-screen">
          {/* Show all points for context */}
          {calibrationPoints.map((point, index) => (
            <div
              key={index}
              className={`calibration-point ${
                index === currentPointIndex ? 'active' : ''
              } ${
                index < currentPointIndex ? 'completed' : ''
              } ${
                collectedPoints[index]?.confidence < 0.5 ? 'low-quality' : ''
              }`}
              style={pointToScreenPosition(point)}
              onClick={() => {
                if (index === currentPointIndex && !isCollecting) {
                  startCollection();
                }
              }}
            >
              <div className="point-inner" />
              {isCollecting && index === currentPointIndex && countdown > 0 && (
                <div className="countdown">{countdown}</div>
              )}
              {index < currentPointIndex && (
                <div className="completion-check">✓</div>
              )}
            </div>
          ))}

          {/* Center reference */}
          <div className="center-reference">
            <div className="center-cross-h" />
            <div className="center-cross-v" />
          </div>
        </div>

        <div className="calibration-footer">
          <div className="quality-indicator">
            {collectedPoints.length > 0 && (
              <span>
                Quality: {(collectedPoints.reduce((sum, p) => sum + p.confidence, 0) / collectedPoints.length * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <button className="cancel-btn-text" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GazeCalibration;