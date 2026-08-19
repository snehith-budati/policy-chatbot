import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatApp from "./pages/ChatApp";
import Admin from "./pages/Admin";
import SystemOverview from "./pages/SystemOverview";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);

  // Show loading on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 750); // Increased duration to make the cinematic wipe clearly visible
    };

    // Listen for route changes
    const originalPushState = window.history.pushState;
    window.history.pushState = function () {
      originalPushState.apply(this, arguments);
      handleRouteChange();
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <Router>
      {/* Loading Overlay */}
      {loading && (
        <div className="page-loading-overlay">
          <div className="loading-spinner-large"></div>
          <div className="loading-text">Loading...</div>
        </div>
      )}

      {/* Background logo */}
      <div className="background-logo"></div>

      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/about" element={<SystemOverview />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;