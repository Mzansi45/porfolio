import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Terminal';
import ResumeView from './pages/resumeView';
import Portfolio from './pages/Portfolio';
import AdminUpload from './pages/AdminUpload';
import { logVisit } from './hooks/firebase_commands';

function App() {
  useEffect(() => { logVisit(); }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resume" element={<ResumeView />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/admin" element={<AdminUpload />} />
      </Routes>
    </Router>
  );
}

export default App;