import React from 'react';
import type { ProgressIndicatorProps } from '../types/assessment';
import './ProgressIndicator.css';

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  showTimeWarning
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const progressPercentage = Math.round(progress.percentComplete);
  const timePercentage = Math.round((progress.timeSpent / (progress.timeSpent + progress.timeRemaining)) * 100);

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3 className="progress-title">Assessment Progress</h3>
        <div className={`time-remaining ${showTimeWarning ? 'warning' : ''}`}>
          <span className="time-icon">⏰</span>
          <span className="time-text">{formatTime(progress.timeRemaining)} remaining</span>
        </div>
      </div>

      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-label">Questions</span>
          <span className="stat-value">
            {progress.currentQuestion} / {progress.totalQuestions}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Answered</span>
          <span className="stat-value">
            {progress.answeredQuestions} / {progress.totalQuestions}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Time Spent</span>
          <span className="stat-value">
            {formatDuration(progress.timeSpent)}
          </span>
        </div>
      </div>

      <div className="progress-bars">
        <div className="progress-bar-container">
          <div className="progress-bar-label">
            <span>Questions Progress</span>
            <span className="progress-percentage">{progressPercentage}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill questions"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-label">
            <span>Time Progress</span>
            <span className="progress-percentage">{timePercentage}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill time ${showTimeWarning ? 'warning' : ''}`}
              style={{ width: `${timePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {showTimeWarning && (
        <div className="time-warning-banner">
          ⚠️ Less than 5 minutes remaining!
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;