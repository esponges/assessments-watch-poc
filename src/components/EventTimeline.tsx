import React from 'react';
import type { EventTimelineProps, EventTimelineData } from '../types/dashboard';
import './EventTimeline.css';

const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  timeRange,
  height = 300
}) => {
  // Generate mock events for demonstration
  const mockEvents: EventTimelineData[] = events.length > 0 ? events : [
    {
      timestamp: timeRange.start + 60000,
      type: 'face_detection_started',
      description: 'Face detection system activated',
      severity: 'low',
      confidence: 0.95
    },
    {
      timestamp: timeRange.start + 180000,
      type: 'multiple_faces_detected',
      description: 'Multiple people detected in frame',
      severity: 'high',
      confidence: 0.87
    },
    {
      timestamp: timeRange.start + 240000,
      type: 'single_face_restored',
      description: 'Single person restored in frame',
      severity: 'medium',
      confidence: 0.92
    },
    {
      timestamp: timeRange.start + 420000,
      type: 'looking_away_extended',
      description: 'Student looking away for extended period',
      severity: 'medium',
      confidence: 0.78
    },
    {
      timestamp: timeRange.start + 480000,
      type: 'gaze_direction_restored',
      description: 'Gaze direction returned to screen',
      severity: 'low',
      confidence: 0.85
    },
    {
      timestamp: timeRange.start + 600000,
      type: 'suspicious_movement',
      description: 'Unusual head movement detected',
      severity: 'medium',
      confidence: 0.73
    }
  ];

  const duration = timeRange.end - timeRange.start;
  const timelineWidth = 600; // Fixed width for simplicity
  
  const getEventPosition = (timestamp: number) => {
    const relativeTime = timestamp - timeRange.start;
    const position = (relativeTime / duration) * timelineWidth;
    return Math.max(0, Math.min(timelineWidth, position));
  };

  const getSeverityColor = (severity: EventTimelineData['severity']) => {
    switch (severity) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#fd7e14';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getSeverityIcon = (severity: EventTimelineData['severity']) => {
    switch (severity) {
      case 'low': return 'ℹ️';
      case 'medium': return '⚠️';
      case 'high': return '🔶';
      case 'critical': return '🚨';
      default: return '📍';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="event-timeline">
      <div className="timeline-header">
        <h4>📅 Event Timeline</h4>
        <div className="timeline-info">
          <span className="event-count">{mockEvents.length} events</span>
          <span className="timeline-duration">
            {formatDuration(timeRange.start, timeRange.end)}
          </span>
        </div>
      </div>

      <div className="timeline-container" style={{ height }}>
        <div className="timeline-axis">
          <div className="axis-line"></div>
          
          {/* Time markers */}
          {Array.from({ length: 6 }, (_, i) => {
            const time = timeRange.start + (i / 5) * duration;
            const position = getEventPosition(time);
            
            return (
              <div
                key={i}
                className="time-marker"
                style={{ left: position }}
              >
                <div className="marker-line"></div>
                <div className="marker-label">{formatTime(time)}</div>
              </div>
            );
          })}
          
          {/* Events */}
          {mockEvents.map((event, index) => {
            const position = getEventPosition(event.timestamp);
            const isSelected = selectedEvent?.timestamp === event.timestamp;
            
            return (
              <div
                key={index}
                className={`event-marker ${event.severity} ${isSelected ? 'selected' : ''}`}
                style={{ left: position }}
                onClick={() => onEventSelect?.(event)}
              >
                <div 
                  className="event-dot"
                  style={{ backgroundColor: getSeverityColor(event.severity) }}
                >
                  <span className="event-icon">{getSeverityIcon(event.severity)}</span>
                </div>
                
                <div className="event-popup">
                  <div className="popup-header">
                    <div className="popup-time">{formatTime(event.timestamp)}</div>
                    <div className="popup-type">{event.type}</div>
                  </div>
                  <div className="popup-description">{event.description}</div>
                  <div className="popup-confidence">
                    Confidence: {Math.round(event.confidence * 100)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {mockEvents.length === 0 && (
          <div className="timeline-no-data">
            <div className="no-data-icon">📅</div>
            <div className="no-data-text">No events in this time range</div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="event-details">
          <div className="details-header">
            <span className="details-icon">{getSeverityIcon(selectedEvent.severity)}</span>
            <span className="details-title">{selectedEvent.type}</span>
            <span className="details-time">{formatTime(selectedEvent.timestamp)}</span>
          </div>
          <div className="details-description">{selectedEvent.description}</div>
          <div className="details-metadata">
            <span>Severity: {selectedEvent.severity.toUpperCase()}</span>
            <span>Confidence: {Math.round(selectedEvent.confidence * 100)}%</span>
          </div>
        </div>
      )}

      <div className="timeline-legend">
        <div className="legend-title">Event Severity:</div>
        <div className="legend-items">
          {(['low', 'medium', 'high', 'critical'] as const).map(severity => (
            <div key={severity} className="legend-item">
              <div 
                className="legend-dot"
                style={{ backgroundColor: getSeverityColor(severity) }}
              ></div>
              <span className="legend-text">{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventTimeline;