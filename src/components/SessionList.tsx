import React from 'react';
import type { SessionListProps } from '../types/dashboard';
import './SessionList.css';

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSession,
  onSessionSelect,
  onSessionDelete,
  onSessionExport,
  filters,
  onFilterChange,
  loading
}) => {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusBadge = (session: any) => {
    if (session.flagged) {
      return <span className="badge badge-danger">Flagged</span>;
    }
    switch (session.status) {
      case 'in_progress':
        return <span className="badge badge-info">In Progress</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'abandoned':
        return <span className="badge badge-warning">Abandoned</span>;
      default:
        return <span className="badge badge-light">{session.status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="session-list loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>📋 Session Review</h2>
        <div className="session-count">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="no-sessions">
          <div className="no-sessions-icon">📂</div>
          <h3>No Sessions Found</h3>
          <p>No sessions match your current filters.</p>
        </div>
      ) : (
        <div className="sessions-table">
          <div className="table-header">
            <div className="header-cell">Session</div>
            <div className="header-cell">Student</div>
            <div className="header-cell">Status</div>
            <div className="header-cell">Score</div>
            <div className="header-cell">Events</div>
            <div className="header-cell">Duration</div>
            <div className="header-cell">Actions</div>
          </div>
          
          {sessions.map(session => (
            <div
              key={session.id}
              className={`table-row ${selectedSession?.id === session.id ? 'selected' : ''}`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="table-cell session-info">
                <div className="session-id">{session.id.slice(-8)}</div>
                <div className="session-date">{formatDate(session.startTime)}</div>
              </div>
              
              <div className="table-cell">
                {session.studentId}
              </div>
              
              <div className="table-cell">
                {getStatusBadge(session)}
                {session.suspicious && (
                  <span className="suspicious-indicator" title="Suspicious activity detected">
                    ⚠️
                  </span>
                )}
              </div>
              
              <div className="table-cell">
                <div className="score-info">
                  <div className="assessment-score">{session.score}%</div>
                  {session.totalScore > 0 && (
                    <div className="monitoring-score">+{session.totalScore}</div>
                  )}
                </div>
              </div>
              
              <div className="table-cell">
                {session.eventCount}
              </div>
              
              <div className="table-cell">
                {formatDuration(session.duration)}
              </div>
              
              <div className="table-cell actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionExport(session.id);
                  }}
                  className="action-btn export-btn"
                  title="Export session"
                >
                  📊
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionDelete(session.id);
                  }}
                  className="action-btn delete-btn"
                  title="Delete session"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionList;