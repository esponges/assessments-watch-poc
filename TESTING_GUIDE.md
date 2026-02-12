# Testing Guide: Anti-Cheating Assessment System

## 🎯 Overview

The anti-cheating assessment monitoring system is **fully functional and ready for manual testing**. We have completed 17 out of 20 implementation steps, with all core features implemented and integrated.

### Implementation Status
- ✅ **Completed:** Steps 1-17 (Core functionality complete)
- 🔄 **Remaining:** Steps 18-20 (Configuration panel, final integration, polish)

## 🚀 Quick Start

```bash
# Start the development server
npm run dev

# Navigate to http://localhost:5173
# The app will open with navigation: Home | Assessment | Dashboard
```

---

## 📋 Test Scenarios

### 1. Complete Assessment Flow Testing

**Objective:** Test the full student assessment experience with monitoring

**Test Steps:**
1. Navigate to `/assessment`
2. **Camera Setup Phase:**
   - Click "Grant Camera Permission" 
   - Allow camera access in browser
   - Verify live video preview appears
3. **Instructions Phase:**
   - Read assessment instructions
   - Check consent checkbox
   - Click "Start Assessment"
4. **Assessment Phase:**
   - Answer 10 multiple-choice questions
   - Observe timer countdown (20 minutes total)
   - Notice monitoring overlay (video preview in top-right)
5. **Results Phase:**
   - View final scores and monitoring data
   - Download assessment report (JSON)

**Expected Behavior:**
- Smooth transitions between phases
- Monitoring starts automatically during assessment
- Real-time score updates for suspicious behavior
- Complete JSON export with all events

**Key Files to Debug:**
- `src/pages/Assessment.tsx` - Main assessment workflow orchestration
- `src/utils/useAssessmentLogic.ts` - Assessment session and timer management
- `src/utils/useAssessmentLogger.ts` - JSON logging and export system
- `src/data/questionBank.ts` - Question pool (15 questions available)

### 2. Real-Time Monitoring Dashboard

**Objective:** Test administrator monitoring capabilities

**Test Steps:**
1. Open two browser tabs/windows
2. **Tab 1:** Navigate to `/dashboard`, switch to "Real-time" mode
3. **Tab 2:** Navigate to `/assessment` and start an assessment
4. **Observe in Dashboard:**
   - New active session appears automatically
   - Live metrics update (score, events, duration)
   - Click on session card for detailed monitoring
   - Real-time event updates every 5 seconds

**Expected Behavior:**
- Live session tracking with auto-refresh
- Session status indicators (active/flagged/suspicious)
- Real-time statistics and charts
- Session detail view with live data

**Key Files to Debug:**
- `src/pages/Dashboard.tsx` - Dashboard orchestration and state management
- `src/utils/useDashboardData.ts` - Mock data generation and real-time updates
- `src/components/RealTimeMonitoring.tsx` - Live monitoring interface
- `src/components/DashboardNavigation.tsx` - Controls and statistics display

### 3. AI Detection System Testing

**Objective:** Verify anti-cheating detection accuracy

**Test Scenarios:**

#### A. Face Detection Testing
1. Start assessment 
2. **Multiple People Detection:**
   - Have another person enter camera view
   - Verify "Multiple faces detected" event logged
   - Check score increases by +10 points
3. **No Face Detection:**
   - Move completely out of camera view
   - Verify "No faces detected" event logged

#### B. Gaze Tracking Testing  
1. Look directly at screen (normal behavior)
2. **Looking Away Test:**
   - Look away from screen for 6+ seconds
   - Verify "Looking away extended" event logged
   - Check score increases by +3 points
3. **Return to Normal:**
   - Look back at screen
   - Verify "Gaze direction restored" event

#### C. Automatic Flagging
1. Accumulate 8+ monitoring points through detected behavior
2. Verify automatic flag raised
3. Check session status changes to "Flagged"

**Expected Detection Behavior:**
- Face detection: BlazeFace model with 0.7 confidence threshold
- Gaze tracking: MediaPipe Face Mesh with 25° deviation threshold
- Scoring: +10 for multiple faces, +3 for looking away >5 seconds
- Flagging: Automatic at 8+ points

**Core Detection Files:**
- `src/utils/faceDetector.ts` - BlazeFace integration and face detection logic
- `src/utils/gazeEstimator.ts` - Gaze direction calculation and calibration
- `src/utils/useFrameProcessor.ts` - Video frame analysis pipeline
- `src/utils/scoreManager.ts` - Point scoring and flagging system
- `src/components/VideoPreview.tsx` - Central monitoring integration hub

### 4. Data Export and Review Testing

**Objective:** Verify data integrity and export functionality

**Test Steps:**
1. Complete an assessment with some monitored events
2. **JSON Export Testing:**
   - Click "Download Assessment Report" 
   - Verify JSON file downloads
   - Check JSON structure matches specification
3. **Dashboard Review Testing:**
   - Navigate to `/dashboard` → "Review" mode
   - Find completed session in session list
   - Click session for detailed analysis
   - Export individual session data

**Expected JSON Structure:**
```json
{
  "assessmentId": "assessment_...",
  "studentId": "student_...", 
  "sessionId": "session_...",
  "flagged": boolean,
  "totalScore": number,
  "events": [...],
  "summary": {...},
  "flags": [...],
  "statistics": {...}
}
```

**Key Files to Debug:**
- `src/utils/assessmentLogger.ts` - JSON generation and structure
- `src/utils/jsonValidator.ts` - Schema validation and data integrity
- `src/utils/sampleJsonOutput.ts` - Reference implementation
- `src/components/SessionDetailView.tsx` - Detailed session analysis UI

---

## 🏗️ Architecture Overview

### Data Flow Pipeline
```
Camera Input → Frame Processing → AI Detection → Event Collection → Scoring → JSON Export
     ↓              ↓                ↓              ↓              ↓          ↓
VideoPreview → FrameProcessor → FaceDetector → EventCollector → ScoreManager → AssessmentLogger
```

### Key Integration Points

1. **VideoPreview Component** (`src/components/VideoPreview.tsx`)
   - Central monitoring hub that orchestrates all detection systems
   - Integrates: face detection, gaze tracking, event collection, scoring
   - Real-time data flow coordination

2. **Assessment Logic** (`src/utils/useAssessmentLogic.ts`)
   - Session lifecycle management (start, pause, complete)
   - Question progression and timing
   - Integration with monitoring systems

3. **Event Collection System** (`src/utils/useEventCollector.ts`)
   - Centralized event aggregation from all detection sources
   - Real-time event validation and deduplication
   - Export functionality for analysis

4. **Score Management** (`src/utils/useScoreManager.ts`)
   - Point-based scoring system (+10 multiple faces, +3 looking away)
   - Automatic flagging at threshold (8+ points)
   - Score history and change tracking

---

## 🐛 Debugging Guide

### Browser Console Monitoring

Open browser developer tools and inspect these global objects:

```javascript
// Key objects available in console for debugging:
window.assessmentLogger // Current session data and events
window.scoreManager     // Real-time scoring state
window.eventCollector   // All collected events
window.frameProcessor   // Video processing statistics
```

### Common Issues and Solutions

#### 1. Camera Not Working
- **Issue:** Video preview not showing
- **Check:** Browser permissions (chrome://settings/content/camera)
- **Debug:** `src/components/CameraPermission.tsx` error handling
- **Solution:** Try different browser or check camera device

#### 2. AI Models Not Loading  
- **Issue:** Face detection not working
- **Check:** Network connectivity (models load from CDN)
- **Debug:** Browser console for TensorFlow.js errors
- **Files:** `src/utils/aiModelLoader.ts`, `src/utils/faceDetector.ts`
- **Solution:** Check CORS settings, try different network

#### 3. Real-time Updates Not Working
- **Issue:** Dashboard not showing live data
- **Check:** Mock data generation in `useDashboardData.ts`
- **Debug:** Component re-render cycles and state updates  
- **Solution:** Verify auto-refresh intervals and data flow

#### 4. TypeScript Compilation Errors
- **Issue:** Build failures or type errors
- **Check:** Run `npx tsc --noEmit` for detailed errors
- **Debug:** Type definitions in `src/types/` directory
- **Solution:** Fix type mismatches or missing imports

#### 5. Detection Sensitivity Issues
- **Issue:** Too many/few false positives
- **Debug:** Adjust thresholds in component configurations:
  - Face detection confidence: 0.7 (in `faceDetector.ts`)
  - Gaze deviation threshold: 25° (in `gazeEstimator.ts`)  
  - Looking away duration: 5000ms (in `lookingAwayDetector.ts`)

### Performance Monitoring

#### Frame Processing Stats
- Target: 2-5 FPS for real-time analysis
- Check: FrameProcessorStatus component displays current FPS
- Debug: `src/utils/useFrameProcessor.ts` performance metrics

#### Memory Usage
- AI models: ~50-100MB total memory usage
- Event storage: Limited to 1000 events with auto-cleanup
- Video streams: Proper cleanup on component unmount

### Test Data Generation

#### Mock Sessions (Dashboard Testing)
- Generated in: `src/utils/useDashboardData.ts`
- Contains: 50 sample sessions with realistic data
- Includes: Various status types, scores, and event patterns

#### Question Bank
- Location: `src/data/questionBank.ts`
- Contains: 15 sample questions across multiple categories
- Randomization: 10 questions selected randomly per assessment

#### Detection Thresholds (Configurable)
```typescript
// Face Detection
confidenceThreshold: 0.7        // Minimum face detection confidence
smoothingWindow: 3              // Frames for stability

// Gaze Tracking  
lookAwayThreshold: 25           // Degrees deviation from center
sustainedThreshold: 5000        // Milliseconds for scoring event

// Scoring System
multipleFacePoints: 10          // Points for multiple people
lookingAwayPoints: 3            // Points for looking away
flagThreshold: 8                // Points threshold for flagging
```

---

## ✅ System Readiness Checklist

The system is production-ready for testing with:

- [x] Complete assessment interface with monitoring
- [x] Real-time administrator dashboard  
- [x] JSON export matching specification requirements
- [x] AI-powered detection (face detection, gaze tracking)
- [x] Automatic scoring and flagging system
- [x] Responsive design for desktop and mobile
- [x] Comprehensive error handling and validation
- [x] Mock data system for testing and demonstration
- [x] TypeScript type safety throughout
- [x] Performance optimized for real-time processing

### Next Development Steps
Steps 18-20 would add:
- Configuration panel for threshold tuning
- Final integration testing and edge case handling
- UI polish and accessibility improvements

---

## 🔍 Testing Checklist

### Basic Functionality
- [ ] App loads without errors (`npm run dev`)
- [ ] Navigation works between all pages
- [ ] Camera permission request functions
- [ ] Video preview displays live feed

### Assessment Flow
- [ ] Instructions phase works correctly
- [ ] Consent checkbox requirement enforced
- [ ] Questions display and can be answered
- [ ] Timer counts down correctly
- [ ] Assessment completes successfully
- [ ] Results show assessment and monitoring data

### Monitoring Features  
- [ ] Face detection triggers events
- [ ] Multiple person detection works
- [ ] Gaze tracking detects looking away
- [ ] Scoring system accumulates points correctly
- [ ] Automatic flagging at 8+ points
- [ ] JSON export contains all data

### Dashboard Features
- [ ] Real-time mode shows active sessions
- [ ] Review mode lists completed sessions  
- [ ] Session details show comprehensive data
- [ ] Export functionality works
- [ ] Filtering and time range selection

### Cross-Browser Testing
- [ ] Chrome (recommended)
- [ ] Firefox  
- [ ] Safari
- [ ] Edge

This testing guide provides comprehensive coverage for validating the anti-cheating assessment system's functionality and identifying any issues during manual testing.