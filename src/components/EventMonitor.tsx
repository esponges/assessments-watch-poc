import { useState, useEffect, useRef } from 'react';
import type { 
  MonitoringEvent, 
  EventStatistics,
  EventExportOptions 
} from '../types/events';
import './EventMonitor.css';

interface EventMonitorProps {
  recentEvents: MonitoringEvent[];
  statistics: EventStatistics | null;
  eventCount: number;
  sessionId: string;
  onExportEvents: (options: EventExportOptions) => void;
  isVisible: boolean;
  compact?: boolean;
}

interface EventFilter {
  eventTypes: Set<MonitoringEvent['type']>;
  minConfidence: number;
  timeRange: 'all' | 'last1min' | 'last5min' | 'last15min';
}

const EventMonitor: React.FC<EventMonitorProps> = ({
  recentEvents,
  statistics,
  eventCount,
  sessionId,
  onExportEvents,
  isVisible,
  compact = false
}) => {
  const [filter, setFilter] = useState<EventFilter>({
    eventTypes: new Set(),
    minConfidence: 0,
    timeRange: 'all'
  });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const eventListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventListRef.current) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
    }
  }, [recentEvents]);

  const getEventTypeColor = (eventType: MonitoringEvent['type']): string => {
    if (eventType.includes('multiple_faces')) return '#dc3545'; // Red
    if (eventType.includes('looking_away')) return '#fd7e14'; // Orange
    if (eventType.includes('face_count')) return '#007bff'; // Blue
    if (eventType.includes('system') || eventType.includes('error')) return '#6c757d'; // Gray
    if (eventType.includes('session')) return '#28a745'; // Green
    return '#6f42c1'; // Purple for other events
  };

  const getEventIcon = (eventType: MonitoringEvent['type']): string => {
    if (eventType.includes('multiple_faces')) return '👥';
    if (eventType.includes('single_face')) return '👤';
    if (eventType.includes('no_faces')) return '❌';
    if (eventType.includes('looking_away')) return '👁️';
    if (eventType.includes('system')) return '⚙️';
    if (eventType.includes('session')) return '🎯';
    if (eventType.includes('error')) return '⚠️';
    return '📊';
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getFilteredEvents = (): MonitoringEvent[] => {
    return recentEvents.filter(event => {
      // Filter by event type
      if (filter.eventTypes.size > 0 && !filter.eventTypes.has(event.type)) {
        return false;
      }

      // Filter by confidence
      if (event.confidence < filter.minConfidence) {
        return false;
      }

      // Filter by time range
      const now = Date.now();
      const eventAge = now - event.timestamp;
      
      switch (filter.timeRange) {
        case 'last1min':
          return eventAge <= 60000;
        case 'last5min':
          return eventAge <= 300000;
        case 'last15min':
          return eventAge <= 900000;
        default:
          return true;
      }
    });
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleEventTypeFilter = (eventType: MonitoringEvent['type']) => {
    setFilter(prev => {
      const newTypes = new Set(prev.eventTypes);
      if (newTypes.has(eventType)) {
        newTypes.delete(eventType);
      } else {
        newTypes.add(eventType);
      }
      return { ...prev, eventTypes: newTypes };
    });
  };

  const exportEvents = (format: 'json' | 'csv') => {
    onExportEvents({
      format,
      includeMetadata: true,
      eventTypes: filter.eventTypes.size > 0 ? Array.from(filter.eventTypes) : undefined
    });
  };

  const filteredEvents = getFilteredEvents();
  const uniqueEventTypes = [...new Set(recentEvents.map(e => e.type))];

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`event-monitor ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="event-monitor-header">
        <div className="header-info">
          <h3>Event Monitor</h3>
          <div className="session-info">
            <span className="session-id">Session: {sessionId.slice(-8)}</span>
            <span className="event-count">{eventCount} events</span>
          </div>
        </div>
        
        {!compact && (
          <div className="header-controls">
            <button 
              onClick={() => exportEvents('json')}
              className="export-btn"
              title="Export as JSON"
            >
              📄 JSON
            </button>
            <button 
              onClick={() => exportEvents('csv')}
              className="export-btn"
              title="Export as CSV"
            >
              📊 CSV
            </button>
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      {!compact && statistics && (
        <div className="statistics-summary">
          <div className="stat-item">
            <span className="stat-label">Score:</span>
            <span className={`stat-value ${statistics.summary.suspiciousActivityScore > 8 ? 'high' : statistics.summary.suspiciousActivityScore > 4 ? 'medium' : 'low'}`}>
              {statistics.summary.suspiciousActivityScore}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Confidence:</span>
            <span className="stat-value">
              {(statistics.summary.averageConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Flagged:</span>
            <span className="stat-value">{statistics.summary.flaggedEventsCount}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="event-filters">
          <div className="filter-section">
            <label>Event Types:</label>
            <div className="event-type-filters">
              {uniqueEventTypes.map(eventType => (
                <button
                  key={eventType}
                  className={`event-type-filter ${filter.eventTypes.has(eventType) ? 'active' : ''}`}
                  onClick={() => handleEventTypeFilter(eventType)}
                  style={{ 
                    borderColor: getEventTypeColor(eventType),
                    backgroundColor: filter.eventTypes.has(eventType) ? getEventTypeColor(eventType) : 'transparent',
                    color: filter.eventTypes.has(eventType) ? 'white' : getEventTypeColor(eventType)
                  }}
                >
                  {getEventIcon(eventType)} {formatEventType(eventType)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-controls">
            <div className="filter-control">
              <label>Min Confidence:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filter.minConfidence * 100}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  minConfidence: parseInt(e.target.value) / 100 
                }))}
              />
              <span>{(filter.minConfidence * 100).toFixed(0)}%</span>
            </div>

            <div className="filter-control">
              <label>Time Range:</label>
              <select
                value={filter.timeRange}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  timeRange: e.target.value as EventFilter['timeRange']
                }))}
              >
                <option value="all">All Time</option>
                <option value="last1min">Last 1 Min</option>
                <option value="last5min">Last 5 Min</option>
                <option value="last15min">Last 15 Min</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="event-list" ref={eventListRef}>
        {filteredEvents.length === 0 ? (
          <div className="no-events">
            {recentEvents.length === 0 ? 'No events yet' : 'No events match current filters'}
          </div>
        ) : (
          filteredEvents.map(event => (
            <div 
              key={event.id}
              className={`event-item ${expandedEvents.has(event.id) ? 'expanded' : ''}`}
              onClick={() => !compact && toggleEventExpansion(event.id)}
              style={{ borderLeftColor: getEventTypeColor(event.type) }}
            >
              <div className="event-header">
                <div className="event-icon">
                  {getEventIcon(event.type)}
                </div>
                <div className="event-main">
                  <div className="event-type">
                    {formatEventType(event.type)}
                  </div>
                  <div className="event-meta">
                    <span className="event-time">{formatTimestamp(event.timestamp)}</span>
                    <span 
                      className={`event-confidence ${event.confidence > 0.8 ? 'high' : event.confidence > 0.5 ? 'medium' : 'low'}`}
                    >
                      {(event.confidence * 100).toFixed(0)}%
                    </span>
                    {event.duration && (
                      <span className="event-duration">
                        {(event.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!compact && expandedEvents.has(event.id) && (
                <div className="event-details">
                  <div className="event-id">ID: {event.id}</div>
                  
                  {/* Event-specific details */}
                  {event.type === 'face_count_change' && (
                    <div className="face-count-details">
                      <span>Count: {'previousCount' in event ? event.previousCount : 'N/A'} → {'currentCount' in event ? event.currentCount : 'N/A'}</span>
                    </div>
                  )}
                  
                  {event.type === 'multiple_faces_detected' && (
                    <div className="multiple-faces-details">
                      <span>Face Count: {'faceCount' in event ? event.faceCount : 'N/A'}</span>
                      {'sustainedDuration' in event && event.sustainedDuration && (
                        <span>Sustained: {(event.sustainedDuration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  )}

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="event-metadata">
                      <strong>Metadata:</strong>
                      <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventMonitor;