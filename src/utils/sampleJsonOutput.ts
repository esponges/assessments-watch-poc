import type { AssessmentLogEntry } from '../types/assessmentLogging';

// Sample JSON output demonstrating the exact format specified
export const SAMPLE_ASSESSMENT_LOG: AssessmentLogEntry = {
  "assessmentId": "assessment_1708950000000_abc123",
  "studentId": "student_def456",
  "sessionId": "session_1708950000000_xyz789",
  "timestamp": 1708950000000,
  "duration": 120000,
  "flagged": true,
  "flagPriority": "medium",
  "totalScore": 13,
  "events": [
    {
      "id": "event_1708950005000_001",
      "timestamp": 1708950005000,
      "type": "multiple_faces_detected",
      "confidence": 0.89,
      "duration": undefined,
      "details": {
        "faceCount": 2,
        "previousFaceCount": 1,
        "sustainedDuration": 2500
      },
      "score": {
        "pointsAwarded": 10,
        "reason": "Multiple faces detected (+10 points)",
        "totalScore": 10
      }
    },
    {
      "id": "event_1708950015000_002",
      "timestamp": 1708950015000,
      "type": "looking_away_extended",
      "confidence": 0.76,
      "duration": 6500,
      "details": {
        "lookAwayDuration": 6500,
        "direction": "right",
        "severity": "moderate",
        "gazeAngle": 35
      },
      "score": {
        "pointsAwarded": 3,
        "reason": "Looking away for 6.5s (+3 points)",
        "totalScore": 13
      }
    },
    {
      "id": "event_1708950030000_003",
      "timestamp": 1708950030000,
      "type": "gaze_direction_change",
      "confidence": 0.82,
      "duration": undefined,
      "details": {
        "gazePoint": { "x": 0.75, "y": 0.35 },
        "deviation": 28,
        "eyesVisible": true
      }
    },
    {
      "id": "event_1708950045000_004",
      "timestamp": 1708950045000,
      "type": "single_face_restored",
      "confidence": 0.91,
      "duration": undefined,
      "details": {
        "previousFaceCount": 2,
        "multipleFacesDuration": 8500
      }
    }
  ],
  "summary": {
    "totalEvents": 4,
    "multipleFaceEvents": 1,
    "lookingAwayEvents": 1,
    "systemEvents": 0,
    "averageConfidence": 0.845,
    "sessionQuality": "good"
  },
  "flags": [
    {
      "id": "flag_1708950015500_001",
      "timestamp": 1708950015500,
      "level": "medium",
      "reason": "Assessment requires manual review due to elevated suspicious activity score",
      "score": 13,
      "triggeringEventIds": ["event_1708950005000_001", "event_1708950015000_002"],
      "priority": 6,
      "category": "composite",
      "resolved": false
    }
  ],
  "statistics": {
    "scoreBreakdown": {
      "multipleFaces": 10,
      "lookingAway": 3,
      "other": 0
    },
    "detectionQuality": {
      "averageConfidence": 0.845,
      "lowConfidenceEvents": 0,
      "totalDetections": 3
    },
    "sessionMetrics": {
      "duration": 120000,
      "continuousMonitoring": true,
      "interruptions": 0
    }
  },
  "metadata": {
    "version": "1.0.0",
    "generatedAt": 1708950120000,
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "screenResolution": "1920x1080",
    "cameraResolution": "640x480"
  }
};

// Function to generate pretty-printed JSON for documentation
export function generateSampleJsonOutput(): string {
  return JSON.stringify(SAMPLE_ASSESSMENT_LOG, null, 2);
}

// Function to create a sample JSON file
export function downloadSampleJson(): void {
  const jsonContent = generateSampleJsonOutput();
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_assessment_log.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}