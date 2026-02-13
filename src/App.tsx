import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AIProvider from './contexts/AIProvider';
import Home from './pages/Home';
import Assessment from './pages/Assessment';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <AIProvider autoInitialize={true}>
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
                  <Link to="/assessment" className="nav-link">Assessment</Link>
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
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AIProvider>
  );
}

export default App;
