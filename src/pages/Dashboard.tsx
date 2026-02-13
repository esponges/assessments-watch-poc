import React, { useState, useEffect, useCallback } from 'react';
import type {
  DashboardMode,
  SessionSummary,
  SessionDetail,
  DashboardStats,
  DashboardAlert
} from '../types/dashboard';
import DashboardNavigation from '../components/DashboardNavigation';
import RealTimeMonitoring from '../components/RealTimeMonitoring';
import SessionList from '../components/SessionList';
import SessionDetailView from '../components/SessionDetailView';
import DashboardAlerts from '../components/DashboardAlerts';
import { useDashboardData } from '../utils/useDashboardData';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<DashboardMode>(() => ({
    view: 'realtime',
    timeRange: {
      start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      end: Date.now()
    },
    filters: {}
  }));
  
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  
  // Dashboard data hook
  const {
    sessions,
    activeSessions,
    stats,
    loading,
    error,
    refreshData,
    getSessionDetail,
    exportSession,
    exportAllSessions,
    deleteSession,
    flagSession,
    unflagSession
  } = useDashboardData(mode);
  
  // Handle mode changes
  const handleModeChange = useCallback((newMode: Partial<DashboardMode>) => {
    setMode(prev => ({ ...prev, ...newMode }));
    setSelectedSession(null); // Clear selection when changing modes
  }, []);
  
  // Alert management
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);
  
  const addAlert = useCallback((alert: Omit<DashboardAlert, 'id' | 'timestamp'>) => {
    const newAlert: DashboardAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    setAlerts(prev => [...prev, newAlert]);
    
    // Auto-dismiss after 5 seconds if dismissible
    if (alert.dismissible) {
      const timeoutId = setTimeout(() => {
        dismissAlert(newAlert.id);
      }, 5000);
      
      // Note: In a full implementation, we should store timeouts for cleanup
      // but since this is in a callback, not an effect, it's less critical
      return timeoutId;
    }
  }, [dismissAlert]);

  // Handle session selection
  const handleSessionSelect = useCallback(async (session: SessionSummary) => {
    try {
      const detail = await getSessionDetail(session.id);
      setSelectedSession(detail);
    } catch (err) {
      console.error('Failed to load session detail:', err);
      addAlert({
        type: 'error',
        title: 'Failed to load session',
        message: 'Could not load session details. Please try again.',
        dismissible: true
      });
    }
  }, [getSessionDetail, addAlert]);
  
  // Handle session actions
  const handleSessionExport = useCallback(async (sessionId: string) => {
    try {
      await exportSession(sessionId);
      addAlert({
        type: 'success',
        title: 'Export completed',
        message: 'Session data has been exported successfully.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to export session:', err);
      addAlert({
        type: 'error',
        title: 'Export failed',
        message: 'Could not export session data. Please try again.',
        dismissible: true
      });
    }
  }, [exportSession, addAlert]);
  
  const handleSessionDelete = useCallback(async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteSession(sessionId);
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(null);
      }
      addAlert({
        type: 'success',
        title: 'Session deleted',
        message: 'Session has been deleted successfully.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to delete session:', err);
      addAlert({
        type: 'error',
        title: 'Delete failed',
        message: 'Could not delete session. Please try again.',
        dismissible: true
      });
    }
  }, [deleteSession, selectedSession, addAlert]);
  
  const handleSessionFlag = useCallback(async (flag: any) => {
    if (!selectedSession) return;
    
    try {
      await flagSession(selectedSession.id, flag);
      // Refresh session detail
      const updatedDetail = await getSessionDetail(selectedSession.id);
      setSelectedSession(updatedDetail);
      addAlert({
        type: 'success',
        title: 'Session flagged',
        message: 'Session has been flagged for review.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to flag session:', err);
      addAlert({
        type: 'error',
        title: 'Flag failed',
        message: 'Could not flag session. Please try again.',
        dismissible: true
      });
    }
  }, [selectedSession, flagSession, getSessionDetail, addAlert]);
  
  const handleSessionUnflag = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      await unflagSession(selectedSession.id);
      // Refresh session detail
      const updatedDetail = await getSessionDetail(selectedSession.id);
      setSelectedSession(updatedDetail);
      addAlert({
        type: 'success',
        title: 'Flag removed',
        message: 'Session flag has been removed.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to unflag session:', err);
      addAlert({
        type: 'error',
        title: 'Unflag failed',
        message: 'Could not remove flag. Please try again.',
        dismissible: true
      });
    }
  }, [selectedSession, unflagSession, getSessionDetail, addAlert]);
  
  // Handle export all
  const handleExportAll = useCallback(async () => {
    try {
      await exportAllSessions(mode.filters);
      addAlert({
        type: 'success',
        title: 'Export completed',
        message: 'All sessions have been exported successfully.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to export all sessions:', err);
      addAlert({
        type: 'error',
        title: 'Export failed',
        message: 'Could not export sessions. Please try again.',
        dismissible: true
      });
    }
  }, [exportAllSessions, mode.filters, addAlert]);
  
  // Handle clear data
  const handleClearData = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all dashboard data? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Implementation would depend on data storage
      localStorage.removeItem('dashboard_sessions');
      localStorage.removeItem('dashboard_stats');
      refreshData();
      setSelectedSession(null);
      addAlert({
        type: 'success',
        title: 'Data cleared',
        message: 'All dashboard data has been cleared.',
        dismissible: true
      });
    } catch (err) {
      console.error('Failed to clear data:', err);
      addAlert({
        type: 'error',
        title: 'Clear failed',
        message: 'Could not clear data. Please try again.',
        dismissible: true
      });
    }
  }, [refreshData, addAlert]);
  
  // Auto-refresh for real-time mode
  useEffect(() => {
    if (mode.view === 'realtime') {
      const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [mode.view, refreshData]);
  
  // Show loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="dashboard dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="dashboard dashboard-error">
        <div className="error-content">
          <h2>Dashboard Error</h2>
          <p>{error}</p>
          <button onClick={refreshData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <DashboardAlerts 
        alerts={alerts}
        onDismiss={dismissAlert}
      />
      
      <DashboardNavigation 
        mode={mode}
        onModeChange={handleModeChange}
        onExportAll={handleExportAll}
        onClearData={handleClearData}
        onRefresh={refreshData}
        stats={stats}
      />
      
      <div className="dashboard-content">
        {mode.view === 'realtime' ? (
          <RealTimeMonitoring 
            activeSessions={activeSessions}
            selectedSession={sessions.find(s => s.id === selectedSession?.id)}
            onSessionSelect={handleSessionSelect}
            onSessionRefresh={refreshData}
            stats={stats}
          />
        ) : (
          <SessionList 
            sessions={sessions}
            selectedSession={sessions.find(s => s.id === selectedSession?.id)}
            onSessionSelect={handleSessionSelect}
            onSessionDelete={handleSessionDelete}
            onSessionExport={handleSessionExport}
            filters={mode.filters}
            onFilterChange={(filters) => handleModeChange({ filters })}
            loading={loading}
          />
        )}
        
        {selectedSession && (
          <SessionDetailView 
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onExport={() => handleSessionExport(selectedSession.id)}
            onFlag={handleSessionFlag}
            onUnflag={handleSessionUnflag}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;