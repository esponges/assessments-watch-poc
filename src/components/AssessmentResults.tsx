import React from 'react';
import type { AssessmentResultsProps } from '../types/assessment';
import './AssessmentResults.css';

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  result,
  onRestart,
  onExit,
  onDownloadReport
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return '#28a745'; // Green
    if (percentage >= 60) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const scorePercentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const grade = getGrade(scorePercentage);
  const scoreColor = getScoreColor(scorePercentage);

  return (
    <div className="assessment-results">
      <div className="results-header">
        <h1>Assessment Complete!</h1>
        <p className="completion-message">
          Thank you for completing the assessment. Here are your results:
        </p>
      </div>

      <div className="results-content">
        <div className="score-summary">
          <div className="score-circle" style={{ borderColor: scoreColor }}>
            <div className="score-percentage" style={{ color: scoreColor }}>
              {scorePercentage}%
            </div>
            <div className="score-grade" style={{ color: scoreColor }}>
              Grade {grade}
            </div>
          </div>
          
          <div className="score-details">
            <div className="score-detail">
              <span className="detail-label">Correct Answers</span>
              <span className="detail-value">{result.correctAnswers} / {result.totalQuestions}</span>
            </div>
            <div className="score-detail">
              <span className="detail-label">Completion Rate</span>
              <span className="detail-value">{Math.round(result.completionRate)}%</span>
            </div>
            <div className="score-detail">
              <span className="detail-label">Time Spent</span>
              <span className="detail-value">{formatDuration(result.timeSpent)}</span>
            </div>
          </div>
        </div>

        {result.monitoringData && (
          <div className={`monitoring-results ${result.monitoringData.flagged ? 'flagged' : 'clean'}`}>
            <h3>📊 Monitoring Summary</h3>
            <div className="monitoring-status">
              <div className="status-indicator">
                {result.monitoringData.flagged ? '🚩' : '✅'}
              </div>
              <div className="status-text">
                {result.monitoringData.flagged 
                  ? 'Assessment flagged for review' 
                  : 'No suspicious activity detected'
                }
              </div>
            </div>
            
            <div className="monitoring-details">
              <div className="monitoring-detail">
                <span className="detail-label">Monitoring Events</span>
                <span className="detail-value">{result.monitoringData.events}</span>
              </div>
              <div className="monitoring-detail">
                <span className="detail-label">Suspicious Activity</span>
                <span className="detail-value">
                  {result.monitoringData.suspiciousActivity ? 'Detected' : 'None'}
                </span>
              </div>
              <div className="monitoring-detail">
                <span className="detail-label">Monitoring Score</span>
                <span className="detail-value">{result.monitoringData.totalScore} points</span>
              </div>
            </div>

            {result.monitoringData.flagged && (
              <div className="flag-notice">
                <p>
                  <strong>Notice:</strong> This assessment has been flagged for manual review due to 
                  detected suspicious activity. The monitoring data will be reviewed by an administrator.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="performance-insights">
          <h3>💡 Performance Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <div className="insight-title">Accuracy</div>
                <div className="insight-description">
                  {scorePercentage >= 80 
                    ? 'Excellent accuracy! You demonstrated strong understanding of the material.'
                    : scorePercentage >= 60 
                    ? 'Good accuracy. Consider reviewing areas where you had difficulty.'
                    : 'Focus on studying the material more thoroughly for better results.'
                  }
                </div>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">⏱️</div>
              <div className="insight-content">
                <div className="insight-title">Time Management</div>
                <div className="insight-description">
                  {result.completionRate >= 95 
                    ? 'Great time management! You completed the assessment efficiently.'
                    : 'Consider pacing yourself better to complete all questions.'
                  }
                </div>
              </div>
            </div>

            {result.monitoringData && (
              <div className="insight-card">
                <div className="insight-icon">👁️</div>
                <div className="insight-content">
                  <div className="insight-title">Focus & Integrity</div>
                  <div className="insight-description">
                    {!result.monitoringData.flagged 
                      ? 'Excellent focus maintained throughout the assessment.'
                      : 'Some distractions were detected. Try to maintain focus in future assessments.'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="results-actions">
        <button 
          onClick={onDownloadReport}
          className="download-btn"
        >
          📄 Download Report
        </button>
        
        <div className="action-buttons">
          <button 
            onClick={onRestart}
            className="restart-btn"
          >
            🔄 Retake Assessment
          </button>
          
          <button 
            onClick={onExit}
            className="exit-btn"
          >
            ✅ Exit to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResults;