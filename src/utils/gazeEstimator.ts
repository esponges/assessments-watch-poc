// Note: Gaze estimation now uses Transformers.js models through AI context
import type {
  GazeEstimation,
  GazeVector,
  GazePoint,
  EyeLandmarks,
  GazeConfig,
  GazeStats,
  CalibrationData,
  GazeZone,
  EnhancedGazeEstimation,
} from '../types/gazeDetection';
import { EYE_LANDMARK_INDICES } from '../types/gazeDetection';


export class GazeEstimator {
  private config: GazeConfig;
  private stats: GazeStats;
  private calibration: CalibrationData | null = null;
  private gazeHistory: GazePoint[] = [];
  private lastGaze: EnhancedGazeEstimation | null = null;
  private frameCount = 0;

  constructor(config: Partial<GazeConfig> = {}) {
    this.config = {
      lookAwayThreshold: 25, // degrees
      confidenceThreshold: 0.6,
      smoothingWindow: 5,
      calibrationPoints: 9,
      eyeOpenThreshold: 0.3,
      stabilityThreshold: 500, // ms
      ...config
    };

    this.stats = {
      totalFrames: 0,
      averageConfidence: 0,
      gazeStability: 0,
      lookAwayEvents: 0,
      calibrationQuality: 0,
      averageDeviation: 0,
      sessionStartTime: Date.now()
    };
  }

  public async estimateGaze(
    faces: faceLandmarksDetection.Face[],
    videoWidth: number,
    videoHeight: number
  ): Promise<EnhancedGazeEstimation | null> {
    if (!faces || faces.length === 0) {
      return null;
    }

    const face = faces[0]; // Use first face
    const landmarks = face.keypoints;

    if (!landmarks || landmarks.length < 468) {
      return null; // Need full face mesh for gaze estimation
    }

    try {
      // Extract eye landmarks
      const eyeLandmarks = this.extractEyeLandmarks(landmarks);
      
      // Calculate gaze vector
      const gazeVector = this.calculateGazeVector(eyeLandmarks, videoWidth, videoHeight);
      
      // Convert to screen coordinates
      let gazePoint = this.vectorToScreenPoint(gazeVector);
      
      // Apply calibration if available
      if (this.calibration) {
        gazePoint = this.applyCalibratedGaze(gazePoint);
      }

      // Calculate confidence based on eye visibility and landmark quality
      const confidence = this.calculateGazeConfidence(eyeLandmarks, landmarks);
      
      // Calculate deviation from center
      const deviation = this.calculateDeviation(gazePoint);
      
      // Determine if looking away
      const isLookingAway = deviation > this.config.lookAwayThreshold;
      
      // Check eye states
      const leftEyeOpen = this.isEyeOpen(eyeLandmarks.leftEye);
      const rightEyeOpen = this.isEyeOpen(eyeLandmarks.rightEye);
      const eyesVisible = leftEyeOpen && rightEyeOpen;

      // Create basic estimation
      const estimation: GazeEstimation = {
        gazeVector,
        gazePoint,
        confidence,
        eyeLandmarks,
        deviation,
        isLookingAway,
        eyesVisible,
        leftEyeOpen,
        rightEyeOpen
      };

      // Enhanced estimation with zones and movement
      const enhancedEstimation = this.enhanceGazeEstimation(estimation);

      // Update statistics
      this.updateStats(enhancedEstimation);
      
      // Store as last gaze
      this.lastGaze = enhancedEstimation;
      
      return enhancedEstimation;

    } catch (error) {
      console.error('Gaze estimation failed:', error);
      return null;
    }
  }

  private extractEyeLandmarks(landmarks: faceLandmarksDetection.Keypoint[]): EyeLandmarks {
    const getPoint = (index: number): [number, number] => {
      const point = landmarks[index];
      return point ? [point.x, point.y] : [0, 0];
    };

    return {
      leftEye: EYE_LANDMARK_INDICES.LEFT_EYE.map(idx => getPoint(idx)),
      rightEye: EYE_LANDMARK_INDICES.RIGHT_EYE.map(idx => getPoint(idx)),
      leftPupil: getPoint(468), // Approximate pupil center
      rightPupil: getPoint(473), // Approximate pupil center
      leftIris: this.calculateIrisCenter(EYE_LANDMARK_INDICES.LEFT_IRIS.map(idx => getPoint(idx))),
      rightIris: this.calculateIrisCenter(EYE_LANDMARK_INDICES.RIGHT_IRIS.map(idx => getPoint(idx)))
    };
  }

  private calculateIrisCenter(irisPoints: Array<[number, number]>): [number, number] {
    if (irisPoints.length === 0) return [0, 0];
    
    const sumX = irisPoints.reduce((sum, point) => sum + point[0], 0);
    const sumY = irisPoints.reduce((sum, point) => sum + point[1], 0);
    
    return [sumX / irisPoints.length, sumY / irisPoints.length];
  }

  private calculateGazeVector(
    eyeLandmarks: EyeLandmarks, 
    videoWidth: number, 
    videoHeight: number
  ): GazeVector {
    // Simple gaze vector estimation based on iris position relative to eye center
    const leftEyeCenter = this.calculateEyeCenter(eyeLandmarks.leftEye);
    const rightEyeCenter = this.calculateEyeCenter(eyeLandmarks.rightEye);
    
    // Calculate iris offset from eye centers
    const leftIrisOffset = [
      eyeLandmarks.leftIris[0] - leftEyeCenter[0],
      eyeLandmarks.leftIris[1] - leftEyeCenter[1]
    ];
    
    const rightIrisOffset = [
      eyeLandmarks.rightIris[0] - rightEyeCenter[0],
      eyeLandmarks.rightIris[1] - rightEyeCenter[1]
    ];
    
    // Average the offsets
    const avgOffsetX = (leftIrisOffset[0] + rightIrisOffset[0]) / 2;
    const avgOffsetY = (leftIrisOffset[1] + rightIrisOffset[1]) / 2;
    
    // Convert to normalized gaze vector
    const normalizedX = avgOffsetX / (videoWidth * 0.1); // Scale factor
    const normalizedY = avgOffsetY / (videoHeight * 0.1); // Scale factor
    
    return {
      x: Math.max(-1, Math.min(1, normalizedX)),
      y: Math.max(-1, Math.min(1, normalizedY)),
      z: -1 // Assuming looking at screen (negative Z)
    };
  }

  private calculateEyeCenter(eyePoints: Array<[number, number]>): [number, number] {
    if (eyePoints.length === 0) return [0, 0];
    
    const sumX = eyePoints.reduce((sum, point) => sum + point[0], 0);
    const sumY = eyePoints.reduce((sum, point) => sum + point[1], 0);
    
    return [sumX / eyePoints.length, sumY / eyePoints.length];
  }

  private vectorToScreenPoint(vector: GazeVector): GazePoint {
    return {
      x: vector.x,
      y: vector.y
    };
  }

  private applyCalibratedGaze(rawGaze: GazePoint): GazePoint {
    if (!this.calibration) return rawGaze;
    
    const { transformation } = this.calibration;
    
    return {
      x: (rawGaze.x * transformation.scaleX) + transformation.offsetX,
      y: (rawGaze.y * transformation.scaleY) + transformation.offsetY
    };
  }

  private calculateGazeConfidence(
    eyeLandmarks: EyeLandmarks,
    allLandmarks: faceLandmarksDetection.Keypoint[]
  ): number {
    // Base confidence on landmark detection quality
    let confidence = 0.8;
    
    // Reduce confidence if eyes are not well detected
    const leftEyeQuality = this.calculateEyeQuality(eyeLandmarks.leftEye);
    const rightEyeQuality = this.calculateEyeQuality(eyeLandmarks.rightEye);
    
    confidence *= (leftEyeQuality + rightEyeQuality) / 2;
    
    // Reduce confidence if face is at extreme angles
    const faceAngle = this.calculateFaceAngle(allLandmarks);
    if (Math.abs(faceAngle) > 30) {
      confidence *= 0.7;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  private calculateEyeQuality(eyePoints: Array<[number, number]>): number {
    if (eyePoints.length === 0) return 0;
    
    // Check if eye points form a reasonable eye shape
    const center = this.calculateEyeCenter(eyePoints);
    const distances = eyePoints.map(point => 
      Math.sqrt((point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2)
    );
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) / distances.length;
    
    // Lower variance indicates better eye shape detection
    return Math.max(0, 1 - (variance / (avgDistance ** 2)));
  }

  private calculateFaceAngle(landmarks: faceLandmarksDetection.Keypoint[]): number {
    // Use nose bridge points to estimate head rotation
    const noseBridge = landmarks[6]; // Nose tip
    const leftEyeCorner = landmarks[33]; // Left eye inner corner
    const rightEyeCorner = landmarks[362]; // Right eye inner corner
    
    if (!noseBridge || !leftEyeCorner || !rightEyeCorner) return 0;
    
    const eyeCenterX = (leftEyeCorner.x + rightEyeCorner.x) / 2;
    const angle = Math.atan2(noseBridge.y - eyeCenterX, noseBridge.x - eyeCenterX) * (180 / Math.PI);
    
    return angle;
  }

  private calculateDeviation(gazePoint: GazePoint): number {
    const distance = Math.sqrt(gazePoint.x ** 2 + gazePoint.y ** 2);
    return Math.atan(distance) * (180 / Math.PI);
  }

  private isEyeOpen(eyePoints: Array<[number, number]>): boolean {
    if (eyePoints.length < 6) return true; // Assume open if not enough points
    
    // Calculate eye aspect ratio
    const topPoints = eyePoints.slice(1, 3);
    const bottomPoints = eyePoints.slice(4, 6);
    const leftRight = [eyePoints[0], eyePoints[3]];
    
    const verticalDist1 = Math.sqrt(
      (topPoints[0][0] - bottomPoints[0][0]) ** 2 + 
      (topPoints[0][1] - bottomPoints[0][1]) ** 2
    );
    const verticalDist2 = Math.sqrt(
      (topPoints[1][0] - bottomPoints[1][0]) ** 2 + 
      (topPoints[1][1] - bottomPoints[1][1]) ** 2
    );
    const horizontalDist = Math.sqrt(
      (leftRight[0][0] - leftRight[1][0]) ** 2 + 
      (leftRight[0][1] - leftRight[1][1]) ** 2
    );
    
    const eyeAspectRatio = (verticalDist1 + verticalDist2) / (2 * horizontalDist);
    
    return eyeAspectRatio > this.config.eyeOpenThreshold;
  }

  private enhanceGazeEstimation(estimation: GazeEstimation): EnhancedGazeEstimation {
    // Determine gaze zone
    const zone = this.determineGazeZone(estimation.gazePoint);
    const previousZone = this.lastGaze?.zone || null;
    
    // Calculate zone stability
    const now = Date.now();
    let zoneStability = 0;
    
    if (this.lastGaze && zone === this.lastGaze.zone) {
      zoneStability = this.lastGaze.zoneStability + (now - (this.lastGaze as any).timestamp || 0);
    }
    
    // Add to history
    this.gazeHistory.push(estimation.gazePoint);
    if (this.gazeHistory.length > this.config.smoothingWindow) {
      this.gazeHistory = this.gazeHistory.slice(-this.config.smoothingWindow);
    }
    
    // Calculate movement
    const movement = this.calculateGazeMovement();
    
    return {
      ...estimation,
      zone,
      previousZone,
      zoneStability,
      movement,
      history: [...this.gazeHistory]
    };
  }

  private determineGazeZone(gazePoint: GazePoint): GazeZone {
    const threshold = 0.3; // Zone boundary threshold
    
    if (Math.abs(gazePoint.x) < threshold && Math.abs(gazePoint.y) < threshold) {
      return 'center';
    }
    
    if (gazePoint.y < -threshold) {
      if (gazePoint.x < -threshold) return 'up-left';
      if (gazePoint.x > threshold) return 'up-right';
      return 'up';
    }
    
    if (gazePoint.y > threshold) {
      if (gazePoint.x < -threshold) return 'down-left';
      if (gazePoint.x > threshold) return 'down-right';
      return 'down';
    }
    
    return gazePoint.x < 0 ? 'left' : 'right';
  }

  private calculateGazeMovement(): { velocity: GazeVector; acceleration: GazeVector } {
    if (this.gazeHistory.length < 2) {
      return {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 }
      };
    }
    
    const current = this.gazeHistory[this.gazeHistory.length - 1];
    const previous = this.gazeHistory[this.gazeHistory.length - 2];
    
    const velocity = {
      x: current.x - previous.x,
      y: current.y - previous.y,
      z: 0
    };
    
    let acceleration = { x: 0, y: 0, z: 0 };
    
    if (this.lastGaze?.movement) {
      acceleration = {
        x: velocity.x - this.lastGaze.movement.velocity.x,
        y: velocity.y - this.lastGaze.movement.velocity.y,
        z: 0
      };
    }
    
    return { velocity, acceleration };
  }

  private updateStats(estimation: EnhancedGazeEstimation): void {
    this.frameCount++;
    this.stats.totalFrames++;
    
    // Update average confidence
    const totalConfidence = this.stats.averageConfidence * (this.frameCount - 1) + estimation.confidence;
    this.stats.averageConfidence = totalConfidence / this.frameCount;
    
    // Update average deviation
    const totalDeviation = this.stats.averageDeviation * (this.frameCount - 1) + estimation.deviation;
    this.stats.averageDeviation = totalDeviation / this.frameCount;
    
    // Track looking away events
    if (estimation.isLookingAway && (!this.lastGaze || !this.lastGaze.isLookingAway)) {
      this.stats.lookAwayEvents++;
    }
    
    // Calculate gaze stability (how much gaze changes between frames)
    if (this.lastGaze) {
      const gazeChange = Math.sqrt(
        (estimation.gazePoint.x - this.lastGaze.gazePoint.x) ** 2 +
        (estimation.gazePoint.y - this.lastGaze.gazePoint.y) ** 2
      );
      
      const stability = Math.max(0, 1 - gazeChange);
      this.stats.gazeStability = (this.stats.gazeStability * 0.9) + (stability * 0.1);
    }
    
    // Update calibration quality if available
    if (this.calibration) {
      this.stats.calibrationQuality = this.calibration.quality;
    }
  }

  public getStats(): GazeStats {
    return { ...this.stats };
  }

  public getConfig(): GazeConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<GazeConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public reset(): void {
    this.stats = {
      totalFrames: 0,
      averageConfidence: 0,
      gazeStability: 0,
      lookAwayEvents: 0,
      calibrationQuality: 0,
      averageDeviation: 0,
      sessionStartTime: Date.now()
    };
    
    this.gazeHistory = [];
    this.lastGaze = null;
    this.frameCount = 0;
  }

  public setCalibration(calibration: CalibrationData): void {
    this.calibration = calibration;
    this.stats.calibrationQuality = calibration.quality;
  }

  public getCalibration(): CalibrationData | null {
    return this.calibration ? { ...this.calibration } : null;
  }
}
