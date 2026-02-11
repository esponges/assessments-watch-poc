import React from 'react';
import type { ScoreChartProps } from '../types/dashboard';
import './ScoreChart.css';

const ScoreChart: React.FC<ScoreChartProps> = ({
  data,
  title,
  type = 'line',
  color = '#007bff',
  height = 200,
  showThreshold
}) => {
  // Generate mock data for demonstration
  const mockData = data.length > 0 ? data : Array.from({ length: 20 }, (_, i) => ({
    timestamp: Date.now() - (19 - i) * 60000, // Last 20 minutes
    value: Math.random() * 15,
    label: `Point ${i + 1}`
  }));

  const maxValue = Math.max(...mockData.map(d => d.value), showThreshold?.value || 0);
  const minValue = Math.min(...mockData.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const getYPosition = (value: number) => {
    return height - 40 - ((value - minValue) / range) * (height - 60);
  };

  const getXPosition = (index: number) => {
    const chartWidth = 400; // Fixed width for simplicity
    return 40 + (index / (mockData.length - 1)) * (chartWidth - 80);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: number) => {
    return Math.round(value * 10) / 10;
  };

  const createPath = () => {
    if (mockData.length === 0) return '';
    
    let path = `M ${getXPosition(0)} ${getYPosition(mockData[0].value)}`;
    for (let i = 1; i < mockData.length; i++) {
      path += ` L ${getXPosition(i)} ${getYPosition(mockData[i].value)}`;
    }
    return path;
  };

  return (
    <div className="score-chart">
      <div className="chart-header">
        <h4>{title}</h4>
        <div className="chart-legend">
          <div className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="legend-label">Score</span>
          </div>
          {showThreshold && (
            <div className="legend-item">
              <div 
                className="legend-color threshold" 
                style={{ backgroundColor: showThreshold.color }}
              ></div>
              <span className="legend-label">{showThreshold.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="chart-container">
        <svg width="400" height={height} className="chart-svg">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e9ecef" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis */}
          <line 
            x1="40" 
            y1="20" 
            x2="40" 
            y2={height - 20} 
            stroke="#666" 
            strokeWidth="1"
          />
          
          {/* X-axis */}
          <line 
            x1="40" 
            y1={height - 20} 
            x2="360" 
            y2={height - 20} 
            stroke="#666" 
            strokeWidth="1"
          />

          {/* Threshold line */}
          {showThreshold && (
            <>
              <line
                x1="40"
                y1={getYPosition(showThreshold.value)}
                x2="360"
                y2={getYPosition(showThreshold.value)}
                stroke={showThreshold.color}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x="365"
                y={getYPosition(showThreshold.value) + 4}
                fill={showThreshold.color}
                fontSize="12"
                fontWeight="600"
              >
                {showThreshold.value}
              </text>
            </>
          )}

          {/* Data visualization */}
          {type === 'line' && (
            <>
              {/* Line */}
              <path
                d={createPath()}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Points */}
              {mockData.map((point, index) => (
                <circle
                  key={index}
                  cx={getXPosition(index)}
                  cy={getYPosition(point.value)}
                  r="4"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                >
                  <title>
                    {formatTime(point.timestamp)}: {formatValue(point.value)}
                  </title>
                </circle>
              ))}
            </>
          )}

          {type === 'bar' && mockData.map((point, index) => (
            <rect
              key={index}
              x={getXPosition(index) - 8}
              y={getYPosition(point.value)}
              width="16"
              height={getYPosition(minValue) - getYPosition(point.value)}
              fill={color}
              opacity="0.8"
            >
              <title>
                {formatTime(point.timestamp)}: {formatValue(point.value)}
              </title>
            </rect>
          ))}

          {type === 'area' && (
            <path
              d={`${createPath()} L ${getXPosition(mockData.length - 1)} ${getYPosition(minValue)} L ${getXPosition(0)} ${getYPosition(minValue)} Z`}
              fill={color}
              fillOpacity="0.3"
              stroke={color}
              strokeWidth="2"
            />
          )}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = minValue + ratio * range;
            const y = getYPosition(value);
            return (
              <text
                key={ratio}
                x="35"
                y={y + 4}
                textAnchor="end"
                fill="#666"
                fontSize="10"
              >
                {formatValue(value)}
              </text>
            );
          })}

          {/* X-axis labels */}
          {mockData.filter((_, i) => i % 4 === 0).map((point, index) => (
            <text
              key={index}
              x={getXPosition(index * 4)}
              y={height - 5}
              textAnchor="middle"
              fill="#666"
              fontSize="10"
            >
              {formatTime(point.timestamp)}
            </text>
          ))}
        </svg>

        {mockData.length === 0 && (
          <div className="chart-no-data">
            <div className="no-data-icon">📊</div>
            <div className="no-data-text">No data available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreChart;