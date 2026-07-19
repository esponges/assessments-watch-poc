import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Assessment from './pages/Assessment';
import AssessmentStart from './pages/AssessmentStart';
import AssessmentMinimal from './pages/AssessmentMinimal';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <h2 className="nav-title">Assessment Monitor</h2>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">Home</Link>
              </li>
              <li className="nav-item">
                <Link to="/assessment/start" className="nav-link">Start Assessment</Link>
              </li>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/assessment/start" element={<AssessmentStart />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/minimal" element={<AssessmentMinimal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
