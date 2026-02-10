import React from 'react';
import type { AssessmentInstructionsProps } from '../types/assessment';
import './AssessmentInstructions.css';

const AssessmentInstructions: React.FC<AssessmentInstructionsProps> = ({
  onStart,
  onCancel,
  config,
  isMonitoringReady
}) => {
  const [consentGiven, setConsentGiven] = React.useState(false);
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
    }
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="assessment-instructions">
      <div className="instructions-header">
        <h1>Assessment Instructions</h1>
        <p className="subtitle">Please read all instructions carefully before starting</p>
      </div>

      <div className="instructions-content">
        <div className="instruction-section">
          <h3>📋 Assessment Overview</h3>
          <ul>
            <li><strong>Total Questions:</strong> 10 questions</li>
            <li><strong>Time Limit:</strong> {formatTime(config.totalTimeLimit)}</li>
            <li><strong>Time per Question:</strong> Approximately {Math.floor(config.timePerQuestion / 60)} minute{Math.floor(config.timePerQuestion / 60) !== 1 ? 's' : ''}</li>
            <li><strong>Question Types:</strong> Multiple choice with single correct answer</li>
          </ul>
        </div>

        <div className="instruction-section">
          <h3>🎯 Assessment Rules</h3>
          <ul>
            <li>You must answer each question before proceeding to the next</li>
            <li>{config.allowReview ? 'You can review and change answers before submitting' : 'You cannot go back to previous questions'}</li>
            <li>{config.autoSubmit ? 'The assessment will auto-submit when time expires' : 'You must manually submit the assessment'}</li>
            <li>Your answers are automatically saved as you progress</li>
          </ul>
        </div>

        <div className="instruction-section monitoring-section">
          <h3>👁️ Anti-Cheating Monitoring</h3>
          <div className={`monitoring-status ${isMonitoringReady ? 'ready' : 'not-ready'}`}>
            <div className="status-indicator">
              {isMonitoringReady ? '✅' : '⏳'}
            </div>
            <div className="status-text">
              {isMonitoringReady ? 'Monitoring system is ready' : 'Setting up monitoring system...'}
            </div>
          </div>
          <ul>
            <li><strong>Camera Monitoring:</strong> Your camera will monitor for multiple people in the frame</li>
            <li><strong>Gaze Tracking:</strong> Looking away from the screen for extended periods will be detected</li>
            <li><strong>Automatic Flagging:</strong> Suspicious behavior will be automatically flagged for review</li>
            <li><strong>Data Recording:</strong> All monitoring data will be recorded for assessment integrity</li>
          </ul>
          <div className="privacy-note">
            <p><strong>Privacy Note:</strong> Video recording is used solely for anti-cheating purposes and will be handled according to our privacy policy.</p>
          </div>
        </div>

        <div className="instruction-section">
          <h3>💡 Tips for Success</h3>
          <ul>
            <li>Ensure you're in a well-lit environment with your face clearly visible</li>
            <li>Sit directly in front of your camera and maintain focus on the screen</li>
            <li>Have a stable internet connection throughout the assessment</li>
            <li>Close other applications to avoid distractions</li>
            <li>Read each question carefully before selecting your answer</li>
          </ul>
        </div>

        <div className="instruction-section technical-requirements">
          <h3>🔧 Technical Requirements</h3>
          <ul>
            <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
            <li>Working camera and microphone permissions</li>
            <li>Stable internet connection</li>
            <li>JavaScript enabled</li>
          </ul>
        </div>
      </div>

      <div className="instructions-footer">
        <div className="consent-section">
          <label className="consent-checkbox">
            <input 
              type="checkbox" 
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              required 
            />
            <span className="checkmark"></span>
            <span className="consent-text">
              I understand and agree to the assessment rules and monitoring procedures. 
              I consent to video monitoring for the duration of this assessment.
            </span>
          </label>
        </div>

        <div className="action-buttons">
          <button 
            onClick={onCancel}
            className="cancel-btn"
          >
            Cancel Assessment
          </button>
          <button 
            onClick={onStart}
            className={`start-btn ${isMonitoringReady && consentGiven ? 'ready' : 'disabled'}`}
            disabled={!isMonitoringReady || !consentGiven}
          >
            {!consentGiven ? 'Please give consent first' : 
             !isMonitoringReady ? 'Preparing...' : 
             'Start Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentInstructions;