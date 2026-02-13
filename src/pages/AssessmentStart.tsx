import { useState, useCallback, useEffect } from 'react';
import QuestionDisplay from '../components/QuestionDisplay';
import ProgressIndicator from '../components/ProgressIndicator';
import AssessmentTimer from '../components/AssessmentTimer';
import AssessmentResults from '../components/AssessmentResults';
import { useAssessmentLogic } from '../utils/useAssessmentLogic';
import { useAssessmentLogger } from '../utils/useAssessmentLogger';
import { DEFAULT_ASSESSMENT_CONFIG } from '../data/questionBank';
import type { AssessmentResult } from '../types/assessment';
import './Assessment.css';

type AssessmentPhase = 'assessment' | 'results';

const AssessmentStart: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('assessment');
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

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
    },
    onQuestionAnswer: (answer, progress) => {
      console.log('Question answered:', answer, 'Progress:', progress);
    },
    onSessionComplete: (result) => {
      console.log('Assessment completed:', result);
      setAssessmentResult(result);
      setCurrentPhase('results');
    },
    onTimeWarning: (timeRemaining) => {
      console.log('Time warning:', timeRemaining);
    },
    onTimeUp: () => {
      console.log('Time is up!');
    }
  });


  const handleRestartAssessment = useCallback(() => {
    console.log('Restarting assessment...');
    setAssessmentResult(null);
    setCurrentPhase('assessment');
    assessmentLogic.resetAssessment();
  }, [assessmentLogic]);

  const handleExitAssessment = useCallback(() => {
    console.log('Exiting to dashboard...');
    setCurrentPhase('assessment');
    setAssessmentResult(null);
    assessmentLogic.resetAssessment();
  }, [assessmentLogic]);

  const handleDownloadReport = useCallback(() => {
    if (!assessmentResult) return;
    
    const report = {
      assessment: assessmentResult,
      session: assessmentLogic.session,
      timestamp: new Date().toISOString()
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
  }, [assessmentResult, assessmentLogic.session]);

  // Auto-start the assessment when component mounts
  useEffect(() => {
    assessmentLogic.startAssessment(10);
  }, [assessmentLogic]);

  const renderCurrentPhase = () => {
    switch (currentPhase) {
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
    </div>
  );
};

export default AssessmentStart;