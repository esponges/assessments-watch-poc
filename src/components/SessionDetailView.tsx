import React from 'react';
import type { SessionDetailViewProps } from '../types/dashboard';
import './SessionDetailView.css';

const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  onClose,
  onExport,
  onFlag,
  onUnflag,
  loading
}) => {
  if (!session) return null;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US');
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="session-detail-view">
      <div className="detail-header">
        <div className="header-title">
          <h3>📋 Session Details</h3>
          <span className="session-id">ID: {session.id}</span>
        </div>
        <button onClick={onClose} className="close-btn" title="Close details">
          ✕
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h4>Session Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Student ID:</span>
              <span className="info-value">{session.studentId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Assessment ID:</span>
              <span className="info-value">{session.assessmentId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Start Time:</span>
              <span className="info-value">{formatDate(session.startTime)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{formatDuration(session.duration)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className={`info-value status-${session.status}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Score:</span>
              <span className="info-value">{session.score}%</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4>Monitoring Summary</h4>
          <div className="monitoring-summary">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-value">{session.totalScore}</div>
                <div className="summary-label">Total Score</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🔔</div>
              <div className="summary-content">
                <div className="summary-value">{session.eventCount}</div>
                <div className="summary-label">Events</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🚩</div>
              <div className="summary-content">
                <div className="summary-value">{session.flags.length}</div>
                <div className="summary-label">Flags</div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4>Questions ({session.questions.length})</h4>
          <div className="questions-list">
            {session.questions.map((question, index) => (
              <div key={question.id} className="question-item">
                <div className="question-header">
                  <span className="question-number">Q{index + 1}</span>
                  <span className={`question-status ${question.correct ? 'correct' : 'incorrect'}`}>
                    {question.correct ? '✅' : '❌'}
                  </span>
                  <span className="question-time">{Math.round(question.timeSpent)}s</span>
                </div>
                <div className="question-text">{question.question}</div>
              </div>
            ))}
          </div>
        </div>

        {session.events.length > 0 && (
          <div className="detail-section">
            <h4>Events ({session.events.length})</h4>
            <div className="events-list">
              {session.events.slice(0, 10).map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-time">
                    {formatDate(event.timestamp)}
                  </div>
                  <div className="event-type">{event.type}</div>
                  <div className="event-confidence">
                    {Math.round(event.confidence * 100)}%
                  </div>
                </div>
              ))}
              {session.events.length > 10 && (
                <div className="events-more">
                  +{session.events.length - 10} more events...
                </div>
              )}
            </div>
          </div>
        )}

        {session.flags.length > 0 && (
          <div className="detail-section">
            <h4>Flags ({session.flags.length})</h4>
            <div className="flags-list">
              {session.flags.map((flag, index) => (
                <div key={index} className={`flag-item ${flag.level}`}>
                  <div className="flag-header">
                    <span className="flag-level">{flag.level.toUpperCase()}</span>
                    <span className="flag-time">{formatDate(flag.timestamp)}</span>
                  </div>
                  <div className="flag-reason">{flag.reason}</div>
                  <div className="flag-score">Score: {flag.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-actions">
          <button onClick={onExport} className="action-btn export-btn">
            📊 Export Session
          </button>
          
          {session.flagged ? (
            <button onClick={onUnflag} className="action-btn unflag-btn">
              ✅ Remove Flag
            </button>
          ) : (
            <button 
              onClick={() => onFlag({ level: 'medium', reason: 'Manual review flag' })} 
              className="action-btn flag-btn"
            >
              🚩 Flag Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetailView;