import React from 'react';
import type { DashboardAlert } from '../types/dashboard';
import './DashboardAlerts.css';

interface DashboardAlertsProps {
  alerts: DashboardAlert[];
  onDismiss: (alertId: string) => void;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = ({
  alerts,
  onDismiss
}) => {
  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: DashboardAlert['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="dashboard-alerts">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`alert alert-${alert.type} ${alert.dismissible ? 'dismissible' : ''}`}
        >
          <div className="alert-content">
            <div className="alert-icon">
              {getAlertIcon(alert.type)}
            </div>
            <div className="alert-message">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-text">{alert.message}</div>
            </div>
          </div>
          
          {alert.actions && alert.actions.length > 0 && (
            <div className="alert-actions">
              {alert.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="alert-action-btn"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          
          {alert.dismissible && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="alert-dismiss"
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardAlerts;