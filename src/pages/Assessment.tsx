import { useState, useCallback, useEffect } from 'react';
import CameraPermission from '../components/CameraPermission';
import VideoPreview from '../components/VideoPreview';
import AssessmentInstructions from '../components/AssessmentInstructions';
import QuestionDisplay from '../components/QuestionDisplay';
import ProgressIndicator from '../components/ProgressIndicator';
import AssessmentTimer from '../components/AssessmentTimer';
import AssessmentResults from '../components/AssessmentResults';
import { useVideoRecorder } from '../utils/useVideoRecorder';
import { useFileManager } from '../utils/useFileManager';
import { useModels } from '../hooks/useModel';
import { useAssessmentLogic } from '../utils/useAssessmentLogic';
import { useAssessmentLogger } from '../utils/useAssessmentLogger';
import { DEFAULT_ASSESSMENT_CONFIG } from '../data/questionBank';
import type { CameraError } from '../types/camera';
import type { AssessmentResult } from '../types/assessment';
import './Assessment.css';

type AssessmentPhase = 'setup' | 'instructions' | 'assessment' | 'results';

const Assessment: React.FC = () => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('setup');
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isMonitoringReady, setIsMonitoringReady] = useState(false);

  // Initialize video recorder
  const videoRecorder = useVideoRecorder(cameraStream, {
    videoBitsPerSecond: 2500000,
    mimeType: 'video/webm;codecs=vp9'
  });

  // Initialize file manager
  const fileManager = useFileManager();

  // Initialize AI system
  const { isLoading: modelsLoading, isSuccess: modelsReady } = useModels();

  // Assessment logic
  const assessmentLogic = useAssessmentLogic({
    config: {
      ...DEFAULT_ASSESSMENT_CONFIG,
      totalTimeLimit: 1200, // 20 minutes
      timePerQuestion: 120, // 2 minutes per question
      warningTimeRemaining: 300 // 5 minute warning
    },
    questionCount: 10,
    onSessionStart: (session) => {
      console.log('Assessment session started:', session);
      // Start monitoring when assessment begins
      if (assessmentLogger.isLogging && !assessmentLogger.isSessionActive) {
        const sessionId = assessmentLogger.startSession(
          `assessment_${session.id}`,
          `student_${Math.random().toString(36).substr(2, 8)}`
        );
        console.log('Assessment logging session started:', sessionId);
      }
    },
    onQuestionAnswer: (answer, progress) => {
      console.log('Question answered:', answer, 'Progress:', progress);
    },
    onSessionComplete: (result) => {
      console.log('Assessment completed:', result);
      setAssessmentResult(result);
      setCurrentPhase('results');
      
      // End monitoring session
      if (assessmentLogger.isSessionActive) {
        const finalLog = assessmentLogger.endSession();
        console.log('Assessment logging ended:', finalLog);
        
        // Add monitoring data to result
        if (finalLog) {
          const enhancedResult: AssessmentResult = {
            ...result,
            monitoringData: {
              flagged: finalLog.flagged,
              suspiciousActivity: finalLog.totalScore > 0,
              totalScore: finalLog.totalScore,
              events: finalLog.events.length
            }
          };
          setAssessmentResult(enhancedResult);
        }
      }
    },
    onTimeWarning: (timeRemaining) => {
      console.log('Time warning:', timeRemaining);
    },
    onTimeUp: () => {
      console.log('Time is up!');
    }
  });

  // Assessment logging system
  const assessmentLogger = useAssessmentLogger({
    autoStart: true,
    config: {
      enableRealTimeLogging: true,
      autoGenerateIds: true,
      validateJsonSchema: true,
      includeDetailedMetadata: true,
      compressOutput: false,
      maxEventHistory: 1000,
      eventDeduplication: true,
      timestampPrecision: 'milliseconds',
      includeSystemEvents: true,
      anonymizeData: false
    },
    onLogGenerated: (log) => {
      console.log('Assessment log generated:', log);
    },
    onError: (error) => {
      console.error('Assessment logger error:', error);
    }
  });

  const handlePermissionGranted = (stream: MediaStream) => {
    setCameraStream(stream);
    setCameraError(null);
    console.log('Camera permission granted:', stream);
    
    // Move to instructions phase when camera is ready
    setCurrentPhase('instructions');
  };

  const handlePermissionDenied = (error: CameraError) => {
    setCameraError(error);
    setCameraStream(null);
    console.error('Camera permission denied:', error);
  };

  const handleVideoStreamError = useCallback((errorMessage: string) => {
    console.error('Video stream error:', errorMessage);
  }, []);

  const handleToggleVideoVisibility = useCallback(() => {
    setIsVideoVisible(prev => !prev);
  }, []);

  const handleRecordingComplete = (blob: Blob, duration: number, mimeType: string) => {
    const file = fileManager.addFile(blob, duration, mimeType);
    console.log('Recording added to file manager:', file);
  };

  // Assessment workflow handlers
  const handleStartAssessment = useCallback(() => {
    console.log('Starting assessment...');
    setCurrentPhase('assessment');
    assessmentLogic.startAssessment(10); // Start with 10 questions
  }, [assessmentLogic]);

  const handleCancelAssessment = useCallback(() => {
    console.log('Assessment cancelled');
    setCurrentPhase('setup');
    assessmentLogic.resetAssessment();
  }, [assessmentLogic]);

  const handleRestartAssessment = useCallback(() => {
    console.log('Restarting assessment...');
    setAssessmentResult(null);
    setCurrentPhase('instructions');
    assessmentLogic.resetAssessment();
  }, [assessmentLogic]);

  const handleExitAssessment = useCallback(() => {
    console.log('Exiting to dashboard...');
    // Navigate to dashboard - for now just reset
    setCurrentPhase('setup');
    setAssessmentResult(null);
    assessmentLogic.resetAssessment();
  }, [assessmentLogic]);

  const handleDownloadReport = useCallback(() => {
    if (!assessmentResult) return;
    
    // Create comprehensive report
    const report = {
      assessment: assessmentResult,
      session: assessmentLogic.session,
      timestamp: new Date().toISOString(),
      monitoringLog: assessmentLogger.getCurrentLog()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Assessment report downloaded');
  }, [assessmentResult, assessmentLogic.session, assessmentLogger]);

  // Check if monitoring is ready
  useEffect(() => {
    const checkMonitoring = () => {
      const ready = cameraStream !== null && modelsReady && assessmentLogger.isLogging;
      setIsMonitoringReady(ready);
    };
    
    checkMonitoring();
    const interval = setInterval(checkMonitoring, 1000);
    
    return () => clearInterval(interval);
  }, [cameraStream, modelsReady, assessmentLogger.isLogging]);

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'setup':
        return (
          <div>
            <h1>Assessment Setup</h1>
            <p>Before starting the assessment, we need access to your camera for monitoring purposes.</p>
            <CameraPermission 
              onPermissionGranted={handlePermissionGranted}
              onPermissionDenied={handlePermissionDenied}
            />
          </div>
        );
        
      case 'instructions':
        return (
          <AssessmentInstructions
            onStart={handleStartAssessment}
            onCancel={handleCancelAssessment}
            config={assessmentLogic.config}
            isMonitoringReady={isMonitoringReady}
          />
        );
        
      case 'assessment':
        return (
          <div className="assessment-interface">
            <div className="assessment-header">
              <ProgressIndicator 
                progress={assessmentLogic.progress!}
                showTimeWarning={assessmentLogic.timeRemaining <= assessmentLogic.config.warningTimeRemaining}
              />
              
              <AssessmentTimer 
                timeRemaining={assessmentLogic.timeRemaining}
                totalTime={assessmentLogic.config.totalTimeLimit}
                isWarning={assessmentLogic.timeRemaining <= assessmentLogic.config.warningTimeRemaining}
                isPaused={assessmentLogic.isPaused}
                onTimeUp={() => {
                  console.log('Timer expired, completing assessment');
                  assessmentLogic.completeAssessment();
                }}
              />
            </div>
            
            {assessmentLogic.currentQuestion && (
              <QuestionDisplay 
                question={assessmentLogic.currentQuestion}
                questionNumber={assessmentLogic.progress!.currentQuestion}
                totalQuestions={assessmentLogic.progress!.totalQuestions}
                selectedAnswer={assessmentLogic.selectedAnswer}
                timeRemaining={Math.min(
                  assessmentLogic.timeRemaining,
                  assessmentLogic.currentQuestion.timeLimit || assessmentLogic.config.timePerQuestion
                )}
                onAnswerSelect={assessmentLogic.selectAnswer}
                onSubmit={assessmentLogic.submitAnswer}
                isLastQuestion={assessmentLogic.progress!.currentQuestion === assessmentLogic.progress!.totalQuestions}
                canSubmit={assessmentLogic.canSubmitAnswer}
              />
            )}
          </div>
        );
        
      case 'results':
        return assessmentResult ? (
          <AssessmentResults 
            result={assessmentResult}
            onRestart={handleRestartAssessment}
            onExit={handleExitAssessment}
            onDownloadReport={handleDownloadReport}
          />
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <div className="assessment">
      {renderCurrentPhase()}
      
      {/* Monitoring components - always present but hidden during setup/instructions */}
      {cameraStream && currentPhase !== 'setup' && (
        <div className={`monitoring-overlay ${currentPhase === 'assessment' ? 'compact' : 'hidden'}`}>
          <VideoPreview
            stream={cameraStream}
            isVisible={isVideoVisible && currentPhase === 'assessment'}
            onToggleVisibility={handleToggleVideoVisibility}
            onStreamError={handleVideoStreamError}
            enableFrameProcessing={currentPhase === 'assessment'}
          />
        </div>
      )}
    </div>
  );
};

export default Assessment;