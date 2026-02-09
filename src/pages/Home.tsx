import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Anti-Cheating Assessment System</h1>
      <p>Welcome to the proof-of-concept anti-cheating monitoring system.</p>
      <div>
        <h2>Features:</h2>
        <ul>
          <li>Real-time face detection and counting</li>
          <li>Gaze direction analysis</li>
          <li>Behavioral pattern monitoring</li>
          <li>Automated scoring and flagging</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;