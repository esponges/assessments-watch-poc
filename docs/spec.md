# Anti-Cheating Assessment Monitoring System - PoC Specification

## Project Overview

**Objective**: Build a proof-of-concept anti-cheating system for online assessments using browser-based AI monitoring with real-time detection and post-assessment analysis capabilities.

**Timeline**: 2-3 weeks for working prototype
**Scope**: Standalone demo page with tunable detection parameters

## System Architecture

### Technology Stack
- **Frontend**: React with MediaRecorder API
- **Backend**: Python (leveraging existing LLM infrastructure)
- **Database**: MongoDB (flexible schema for detection events)
- **AI Models**: Browser-based TensorFlow.js models for real-time detection
- **Storage**: Local filesystem for PoC (videos and JSON logs)

### Deployment Model
- **Development**: Fully local setup
- **Recording**: Browser-based recording with local file storage
- **Analysis**: Browser-first with planned backend expansion

## Security Levels

### Implementation Strategy
**Incremental Feature Flags**: Start with core features, expand based on testing

#### Level 1: Basic Monitoring
- Tab switching detection
- Copy/paste blocking
- Basic session recording

#### Level 2: AI-Powered Detection (PoC Focus)
- Face counting and multiple person detection
- Gaze direction analysis
- Behavioral pattern flagging

#### Level 3: Advanced Analysis (Future)
- Object detection (phones, books, papers)
- Audio analysis for conversation detection
- Advanced behavioral analytics

## Core Features for PoC

### 1. Visual Detection Priority Features

#### Face Counting
- **Purpose**: Detect multiple people in frame
- **Technology**: TensorFlow.js BlazeFace model
- **Scoring**: Multiple faces detected = +10 points (auto-flag)

#### Gaze Direction Analysis
- **Purpose**: Detect students looking away from screen for extended periods
- **Trigger Conditions**:
  - Looking away >5 seconds continuously
  - Repeated long stares in any non-screen direction
  - Any direction away from center screen considered suspicious
- **Technology**: MediaPipe or TensorFlow.js pose estimation
- **Scoring**: Extended looking away = +3 points per incident

### 2. Recording System

#### Browser Recording
- **Implementation**: MediaRecorder API
- **Format**: WebM/MP4 with fallbacks
- **Storage**: Local filesystem during PoC
- **Strategy**: Full session recording for testing phase

#### Future Evolution Path
- **Resource Optimization**: Capture highlights/flagged moments only
- **Cloud Storage**: Migrate to object storage for production
- **Streaming**: Real-time analysis capability

### 3. Flagging System

#### Scoring Algorithm
```
Flag Threshold: 8+ points
- Multiple people detected: +10 points (immediate flag)
- Phone/device visible: +8 points 
- Extended looking away (>5s): +3 points
- Covering/blocking camera: +5 points
- Frequent gaze shifts: +2 points
```

#### Output Format
**JSON Log Structure**:
```json
{
  "assessmentId": "uuid",
  "studentId": "uuid", 
  "timestamp": "ISO-8601",
  "flagged": boolean,
  "totalScore": number,
  "priority": "high|medium|low",
  "events": [
    {
      "type": "gaze_away|multiple_faces|device_detected",
      "timestamp": "ISO-8601",
      "duration": number,
      "confidence": number,
      "score": number
    }
  ]
}
```

### 4. User Interface

#### Standalone Demo Page
- **Assessment Interface**: Simple quiz with multiple choice questions
- **Monitoring Overlay**: Non-intrusive camera preview
- **Permission Handling**: Clear camera/microphone permission requests
- **Feedback System**: Visual indicators for students (optional)

#### Administrative Dashboard (Basic)
- **Real-time Monitoring**: Live flagging status
- **Post-Assessment Review**: JSON log viewer
- **Threshold Tuning**: Adjustable scoring parameters

## Technical Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. **Setup React Application**
   - Basic assessment interface
   - Camera permission and recording setup
   - MediaRecorder integration

2. **AI Model Integration**
   - TensorFlow.js setup
   - BlazeFace model for face detection
   - Basic gaze estimation implementation

### Phase 2: Detection Logic (Week 2)
1. **Implement Scoring System**
   - Real-time event detection
   - Scoring algorithm implementation
   - Flagging logic

2. **Data Logging**
   - JSON log generation
   - Local storage integration
   - Event timestamp tracking

### Phase 3: Tuning and Validation (Week 3)
1. **Testing and Calibration**
   - False positive/negative analysis
   - Threshold optimization
   - Performance testing

2. **Documentation and Demo**
   - Usage instructions
   - Tuning guidelines
   - Demo scenarios

## Browser AI Models

### Primary Models
1. **BlazeFace** (TensorFlow.js)
   - Purpose: Face detection and counting
   - Size: ~1MB
   - Performance: 30+ FPS on modern browsers

2. **MediaPipe Face Mesh** (Web version)
   - Purpose: Detailed facial landmark detection for gaze estimation
   - Features: Eye tracking, head pose estimation
   - Accuracy: High precision for gaze direction

### Alternative/Backup Models
- **MobileNet** for general object detection
- **PoseNet** for body pose estimation
- **Custom lightweight models** if needed

## Data Flow

### Real-time Processing
1. **Video Capture**: Browser MediaRecorder
2. **Frame Analysis**: TensorFlow.js models (client-side)
3. **Event Detection**: Real-time scoring algorithm
4. **Logging**: JSON event storage
5. **Flagging**: Immediate notification system

### Post-Assessment Analysis
1. **Session Review**: JSON log analysis
2. **Priority Assignment**: Risk scoring
3. **Instructor Dashboard**: Flagged assessment queue
4. **Evidence Collection**: Timestamp + event details

## Success Metrics for PoC

### Technical Validation
- **Performance**: <100ms latency for detection
- **Accuracy**: <10% false positive rate for face detection
- **Reliability**: Consistent detection across browser types
- **Resource Usage**: Acceptable CPU/memory consumption

### Functional Validation
- **Detection Coverage**: Successful flagging of test scenarios
- **User Experience**: Non-intrusive monitoring flow
- **Data Quality**: Actionable JSON logs for review
- **Tunability**: Easy threshold adjustment capability

## Future Expansion Roadmap

### Backend AI Integration
- **Python Backend**: More sophisticated detection models
- **Hybrid Processing**: Client + server analysis
- **Advanced Features**: Audio analysis, object detection

### Production Features
- **Live Streaming**: Real-time video analysis
- **Cloud Storage**: Scalable video storage solutions
- **Advanced Analytics**: ML-powered behavior analysis
- **Integration**: LMS and assessment platform integration

## Risk Considerations

### Privacy and Ethics
- **Data Protection**: Secure handling of video recordings
- **Consent Management**: Clear student consent processes
- **Bias Prevention**: Model fairness across demographics

### Technical Challenges
- **Browser Compatibility**: Cross-browser AI model support
- **Performance Optimization**: Maintaining smooth user experience
- **False Positives**: Balancing security with usability

## Development Resources

### Required Skills
- React development
- TensorFlow.js/MediaPipe experience
- Computer vision basics
- Python backend development (future phases)

### Dependencies
- **Frontend**: React, TensorFlow.js, MediaRecorder API
- **AI Models**: BlazeFace, MediaPipe Face Mesh
- **Storage**: Browser LocalStorage/IndexedDB for PoC
- **Development Tools**: Modern browser with WebRTC support

---

**Document Version**: 1.0  
**Last Updated**: February 9, 2026  
**Status**: Ready for Implementation