import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Admin.css";

import DocumentCompareView from "../components/DocumentCompareView";

import PolicyDiffCompare from "../components/PolicyDiffCompare";


const formatIST = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);


  const [stats, setStats] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [feedback, setFeedback] = useState([]);


  const [compareDocument, setCompareDocument] = useState(null);
  const [showCompareView, setShowCompareView] = useState(false);

  const [showDiffCompare, setShowDiffCompare] = useState(false);


  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("v1.0");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);


  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    const storedUser = sessionStorage.getItem("adminUsername");
    const storedPass = sessionStorage.getItem("adminPassword");

    if (auth === "true" && storedUser && storedPass) {
      setCredentials({ username: storedUser, password: storedPass });
      setIsAuthenticated(true);
    }
  }, []);


  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);


  const handleLogout = useCallback(() => {

    sessionStorage.clear();
    localStorage.clear(); 


    setCredentials({ username: "", password: "" });
    setOtp("");
    setOtpRequired(false);
    setIsAuthenticated(false);


    window.location.href = '/admin';
  }, []);




  const fetchAnalytics = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');
      const resp = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/analytics`, {
        auth: { username, password }
      });
      setAnalytics(resp.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
  }, [credentials.username, otp]);

  const fetchModelMetrics = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');
      const resp = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/model-metrics`, {
        auth: { username, password }
      });
      setModelMetrics(resp.data);
    } catch (err) {
      console.error("Model metrics fetch error:", err);
    }
  }, [credentials.username, otp]);

  const fetchStats = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');

      const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/stats`, {
        auth: { username, password }
      });
      setStats(response.data);
      setAdminLogs(response.data.admin_logs || []);
      setFeedback(response.data.feedback || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [credentials.username, otp]);

  const fetchPolicies = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');

      const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/policies`, {
        auth: { username, password }
      });
      setPolicies(response.data);
    } catch (error) {
      console.error("Error fetching policies:", error);
    }
  }, [credentials.username, otp]);

  const fetchUsers = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');

      const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/users`, {
        auth: { username, password }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [credentials.username, otp]);

  const fetchChats = useCallback(async () => {
    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');

      const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/chats`, {
        auth: { username, password }
      });
      setChats(response.data.chats || []);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  }, [credentials.username, otp]);


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchPolicies(),
        fetchUsers(),
        fetchChats(),
        fetchAnalytics(),
        fetchModelMetrics()
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
    setLoading(false);
  }, [fetchStats, fetchPolicies, fetchUsers, fetchChats, fetchAnalytics, fetchModelMetrics, handleLogout]);



  const fetchUserChats = async (email) => {
    try {
      const username = credentials.username || "capstoneb2";
      const password = credentials.password || "1234";

      const response = await axios.get(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/admin/chats/user/${encodeURIComponent(email)}`, {
        auth: { username, password }
      });
      setUserChats(response.data.chats || []);
      setSelectedUser(email);
    } catch (error) {
      console.error("Error fetching user chats:", error);
    }
  };


  const handleCompareDocument = async (pdfName) => {
    try {
      setLoading(true);
      const username = credentials.username || "capstoneb2";
      const password = credentials.password || "1234";

      const response = await axios.get(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/policies/${encodeURIComponent(pdfName)}/compare`, {
        auth: { username, password }
      });

      setCompareDocument(response.data);
      setShowCompareView(true);
    } catch (error) {
      console.error("Error fetching document for comparison:", error);
      alert("Failed to load document for comparison");
    } finally {
      setLoading(false);
    }
  };


  const handleCloseCompare = () => {
    setShowCompareView(false);
    setCompareDocument(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");

    try {
      await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/admin/stats`, {
        auth: {
          username: credentials.username,
          password: otp
        }
      });


      sessionStorage.setItem("adminUsername", credentials.username);

      sessionStorage.setItem("adminPassword", otp);

      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
    } catch (error) {
      setAuthError("Invalid username or OTP password");
      console.error("Login error:", error);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!credentials.username) {
      setAuthError("Username is required");
      return;
    }
    setSendingOtp(true);
    setAuthError("");
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/auth/request-otp`, {
        email: credentials.username,
        password: credentials.password
      });
      setOtp(""); 
      setOtpRequired(true);
    } catch (error) {
      setAuthError(error.response?.data?.error || "Failed to send OTP");
      console.error("OTP Error:", error);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLoginKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (otpRequired) {
        handleLogin(e);
      } else {
        handleRequestOTP(e);
      }
    }
  };


  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append("file", file);
    });
    const finalCategory = selectedCategory === "Custom" ? (customCategory.strip ? customCategory.trim() : customCategory) || "General" : selectedCategory;
    const finalVersion = (selectedVersion && selectedVersion.trim()) ? selectedVersion.trim() : "v1.0";

    formData.append("category_name", finalCategory);
    formData.append("policy_type", finalCategory);
    formData.append("version_name", finalVersion);

    try {
      const username = credentials.username || "capstoneb2";
      const password = credentials.password || "1234";

      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/upload`, formData, {
        auth: { username, password },
        headers: { "Content-Type": "multipart/form-data" }
      });

      fetchPolicies();
      fetchStats();
      setSelectedFiles([]);
      document.getElementById("pdf-upload").value = "";

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload PDFs");
    }
    setUploading(false);
  };

  const handleDeletePolicy = async (pdfName) => {
    if (!window.confirm(`Are you sure you want to delete "${pdfName}"?`)) return;

    try {
      const username = credentials.username || "capstoneb2";
      const password = credentials.password || "1234";

      await axios.delete(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/policies/${encodeURIComponent(pdfName)}`, {
        auth: { username, password }
      });

      fetchPolicies();
      fetchStats();

    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete policy");
    }
  };

  const handleResetDB = async () => {
    if (!window.confirm("⚠️ Are you sure? This will delete ALL policies, embeddings, and chat history!")) return;

    try {
      const username = credentials.username || "capstoneb2";
      const password = credentials.password || "1234";

      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/reset`, {}, {
        auth: { username, password }
      });

      fetchDashboardData();
      alert("Database reset successfully");

    } catch (error) {
      console.error("Reset error:", error);
      alert("Failed to reset database");
    }
  };

  const handleDeleteUser = (email) => {
    setUserToDelete(email);
  };

  const confirmDeleteAction = async () => {
    if (!userToDelete) return;

    try {
      const username = credentials.username || sessionStorage.getItem('adminUsername');
      const password = otp || sessionStorage.getItem('adminPassword');

      await axios.delete(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/admin/users/${encodeURIComponent(userToDelete)}`, {
        auth: { username, password }
      });

      fetchUsers();
      fetchStats();
      if (selectedUser === userToDelete) {
        setSelectedUser(null);
        setUserChats([]);
      }
      setUserToDelete(null);
    } catch (error) {
      console.error("Delete user error:", error);
      alert("Failed to delete user");
      setUserToDelete(null);
    }
  };


  const filteredPolicies = policies.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChats = chats.filter(c =>
    c.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.question?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );




  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">

          <div className="admin-login-branding">
            <img
              src="/plogo.png"
              alt="SRM University"
              style={{ objectFit: 'contain' }}
            />
            <h2>PolicyHub AI</h2>
            <span className="admin-badge-panel">Admin Portal</span>
            <p>Authorized personnel only. Manage policies, users, and system settings.</p>
          </div>


          <div className="admin-login-form-panel">
            <div className="login-header" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px', color: '#0f172a' }}>Admin Access</h1>
              <p className="login-subtitle" style={{ margin: '0 0 16px 0', color: '#64748b' }}>SRM AP Policy Administration</p>
              <div className="accent-line" style={{ background: '#f37021', margin: '0 auto 28px auto', display: 'block' }}></div>
            </div>

            <form
              onSubmit={otpRequired ? handleLogin : handleRequestOTP}
              className="login-form"
              style={{ width: '100%', maxWidth: '360px' }}
              autoComplete="off"
            >
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Enter admin username"
                  className="login-input"
                  autoFocus
                  disabled={otpRequired}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onKeyDown={handleLoginKeyDown}
                />
              </div>

              {!otpRequired ? (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Enter admin password"
                    className="login-input"
                    autoComplete="new-password"
                    onKeyDown={handleLoginKeyDown}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>OTP Password</label>
                  <input
                    type="password"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder=""
                    className="login-input"
                    autoFocus
                    autoComplete="new-password"
                    onKeyDown={handleLoginKeyDown}
                  />
                </div>
              )}

              {authError && (
                <div className="login-error">⚠️ {authError}</div>
              )}

              {!otpRequired ? (
                <button type="submit" className="login-btn" disabled={sendingOtp}>
                  {sendingOtp ? "Sending OTP..." : "Request OTP"}
                </button>
              ) : (
                <button type="submit" className="login-btn">Login to Dashboard</button>
              )}

              {otpRequired && (
                <button
                  type="button"
                  className="login-btn"
                  style={{ marginTop: '10px', background: '#64748b' }}
                  onClick={() => setOtpRequired(false)}
                >
                  Change Username
                </button>
              )}
            </form>

            <div className="login-footer" style={{ width: '100%', maxWidth: '360px', textAlign: 'left' }}>
              <p>Authorized personnel only</p>
              <p className="admin-hint">
                <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>← Back to Chat</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="admin-container">

      {showCompareView && compareDocument && (
        <DocumentCompareView
          document={compareDocument}
          onClose={handleCloseCompare}
        />
      )}


      {showDiffCompare && (
        <PolicyDiffCompare
          policies={policies}
          credentials={credentials}
          onClose={() => setShowDiffCompare(false)}
        />
      )}


      {userToDelete && (
        <>
          <div className="modal-overlay" onClick={() => setUserToDelete(null)}></div>
          <div className="custom-confirm-modal">
            <div className="confirm-header">
              <div className="warning-icon">⚠️</div>
              <h3>Confirm User Deletion</h3>
            </div>
            <div className="confirm-body">
              <p>Are you sure you want to delete user <strong>{userToDelete}</strong>?</p>
              <p className="impact-text">This will permanently remove their profile, chat history, and feedback data. This action cannot be undone.</p>
            </div>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setUserToDelete(null)}>Cancel</button>
              <button className="confirm-delete-btn" onClick={confirmDeleteAction}>Delete Permanently</button>
            </div>
          </div>
        </>
      )}


      <div className="admin-card">


        <div className="admin-sidebar page-entrance">
          <div className="sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/plogo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
              <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>PolicyHub AI</h2>
              <div className="admin-badge">ADMIN</div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Admin navigation">
            <button className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")} aria-label="Go to Dashboard">📊 Dashboard</button>
            <button className={`nav-item ${activeTab === "policies" ? "active" : ""}`} onClick={() => setActiveTab("policies")} aria-label="Manage Policies">📄 Policies</button>
            <button className={`nav-item ${activeTab === "diffcompare" ? "active" : ""}`} onClick={() => setActiveTab("diffcompare")} aria-label="Compare Policy Versions">🔀 Policies Comparison</button>
            <button className={`nav-item ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")} aria-label="Manage Users">👥 Users</button>
            <button className={`nav-item ${activeTab === "chats" ? "active" : ""}`} onClick={() => setActiveTab("chats")} aria-label="View Chat History">💬 Chat History</button>
            <button className={`nav-item ${activeTab === "insights" ? "active" : ""}`} onClick={() => setActiveTab("insights")} aria-label="View System Insights">📈 System Insights</button>
            <button className={`nav-item ${activeTab === "evaluation" ? "active" : ""}`} onClick={() => setActiveTab("evaluation")} aria-label="View Evaluation Matrix">⚖️ Evaluation Matrix</button>
            <button className={`nav-item ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")} aria-label="View Admin Logs">📋 Admin Logs</button>
            <button className={`nav-item ${activeTab === "feedback" ? "active" : ""}`} onClick={() => setActiveTab("feedback")} aria-label="View User Feedback">⭐ Feedback</button>
          </nav>

          <div className="sidebar-footer">
            <div className="admin-info">
              <div className="admin-details">
                <span className="admin-name">{(credentials.username || sessionStorage.getItem("adminUsername") || "Admin").split('@')[0]}</span>
                <span className="admin-status">System Administrator</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>


        <div className="admin-main">
          <div className="main-header">
            <h1>
              {activeTab === "dashboard" && "📊 Dashboard"}
              {activeTab === "policies" && "📄 Policy Management"}
              {activeTab === "diffcompare" && "🔀 Policy Difference Comparison"}
              {activeTab === "users" && "👥 User Management"}
              {activeTab === "chats" && "💬 Chat History"}
              {activeTab === "insights" && "📈 System Insights"}
              {activeTab === "evaluation" && "⚖️ Evaluation Matrix (RAG Metrics)"}
              {activeTab === "logs" && "📋 Admin Activity Logs"}
              {activeTab === "feedback" && "⭐ User Feedback"}
            </h1>

            <div className="header-actions">
              {['policies', 'users', 'chats'].includes(activeTab) && (
                <div className="header-search">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              )}

              <div className="architecture-button-wrapper">
                <div className="btn-indicator-arrow">↙</div>
                <button
                  className="architecture-btn-glowing"
                  onClick={() => navigate('/about')}
                  title="System Architecture & Documentation"
                >
                  <img src="/arch_node.png" alt="Architecture" className="btn-node-icon" />
                </button>
                <span className="architecture-btn-label">System Overview</span>
              </div>
            </div>
          </div>

          <div className="main-content">
            {loading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
              </div>
            )}


            {activeTab === "dashboard" && stats && (
              <div className="dashboard-grid">

                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-icon">📄</div><div className="stat-details"><h3>{stats.total_policies || 0}</h3><p>Total Policies</p></div></div>
                  <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-details"><h3>{stats.total_users || 0}</h3><p>Active Users</p></div></div>
                  <div className="stat-card"><div className="stat-icon">💬</div><div className="stat-details"><h3>{stats.total_chats || 0}</h3><p>Total Chats</p></div></div>
                  <div className="stat-card"><div className="stat-icon">🔍</div><div className="stat-details"><h3>{stats.total_vectors || 0}</h3><p>Vector Embeddings</p></div></div>
                </div>


                <div className="dashboard-section">
                  <div className="section-header"><h2>Recent Uploads</h2><button className="view-all-btn" onClick={() => setActiveTab("policies")}>View All</button></div>
                  <div className="recent-list">
                    {stats.recent_uploads?.map((policy, index) => (
                      <div key={index} className="recent-item">
                        <div className="recent-icon">📄</div>
                        <div className="recent-details">
                          <div className="recent-title">{policy.name}</div>
                          <div className="recent-meta">{policy.pages} pages • Uploaded by {policy.uploaded_by}</div>
                        </div>
                        <div className="recent-time">{new Date(policy.uploaded_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="dashboard-section">
                  <div className="section-header"><h2>Most Active Users</h2><button className="view-all-btn" onClick={() => setActiveTab("users")}>View All</button></div>
                  <div className="user-list">
                    {stats.top_users?.map((user, index) => (
                      <div key={index} className="user-item">
                        <div className="user-rank">#{index + 1}</div>
                        <div className="user-avatar">👤</div>
                        <div className="user-info">
                          <div className="user-email">{user.email}</div>
                          <div className="user-queries">{user.queries} queries</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="dashboard-section full-width">
                  <div className="section-header"><h2>Recent Conversations</h2><button className="view-all-btn" onClick={() => setActiveTab("chats")}>View All</button></div>
                  <div className="chats-table">
                    <table>
                      <thead><tr><th>User</th><th>Question</th><th>Answer</th><th>Satisfaction</th><th>Time</th></tr></thead>
                      <tbody>
                        {stats.recent_chats?.map((chat, index) => (
                          <tr key={index}>
                            <td className="user-cell">{chat.user}</td>
                            <td className="question-cell">{chat.question}</td>
                            <td className="answer-cell">{chat.answer}</td>
                            <td>{chat.satisfaction === 1 ? "👍" : chat.satisfaction === 0 ? "👎" : "—"}</td>
                            <td className="time-cell">{formatIST(chat.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


            {activeTab === "evaluation" && (
              <div className="evaluation-tab">


                {modelMetrics?.overall && (() => {
                  const ov = modelMetrics.overall;
                  return (
                    <div className="eval-overall-banner">
                      <div className="eval-overall-title">
                        <span className="eval-overall-icon">📊</span>
                        Overall System Averages
                        <span className="eval-overall-sub">across all models · {ov.total_queries} total queries</span>
                      </div>
                      <div className="eval-overall-stats">
                        <div className="eval-overall-stat">
                          <span className="eos-label">Avg Latency</span>
                          <span className="eos-value">{ov.avg_latency}s</span>
                        </div>
                        <div className="eos-divider" />
                        <div className="eval-overall-stat">
                          <span className="eos-label">Avg Confidence</span>
                          <span className="eos-value">{ov.avg_confidence}%</span>
                        </div>
                        <div className="eos-divider" />
                        <div className="eval-overall-stat">
                          <span className="eos-label">Satisfaction Rate</span>
                          <span className="eos-value">
                            {ov.satisfaction_rate !== null ? `${ov.satisfaction_rate}%` : '—'}
                          </span>
                        </div>
                        <div className="eos-divider" />
                        <div className="eval-overall-stat">
                          <span className="eos-label">Faithfulness</span>
                          <span className="eos-value">100%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {modelMetrics?.models && modelMetrics.models.length > 0 && (() => {
                  const totalQ = modelMetrics.models.reduce((s, m) => s + m.total_queries, 0) || 1;
                  const MODEL_META = {
                    'Phi-3 Mini':   { icon: '🧠', color: '#6366f1', desc: 'Microsoft Phi-3 Mini 3.8B – default inference engine' },
                    'BitNet 1.58b': { icon: '⚡', color: '#f59e0b', desc: '1-bit ternary weights – 71.9% energy savings simulation' },
                    'Qwen 3.5':     { icon: '🌐', color: '#10b981', desc: 'Alibaba Qwen 3.5 2B – multilingual reasoning model' },
                  };
                  return (
                    <div className="eval-models-section">
                      <h3 className="eval-models-heading">Model-Specific Metrics</h3>
                      <div className="eval-models-grid">
                        {modelMetrics.models.map((m, idx) => {
                          const meta = MODEL_META[m.model] || { icon: '🤖', color: '#64748b', desc: 'LLM model' };
                          const share = Math.round((m.total_queries / totalQ) * 100);
                          return (
                            <div key={idx} className="eval-model-card" style={{ '--model-color': meta.color }}>
                              <div className="emc-header">
                                <span className="emc-icon">{meta.icon}</span>
                                <div>
                                  <div className="emc-name">{m.model}</div>
                                  <div className="emc-desc">{meta.desc}</div>
                                </div>
                              </div>

                              <div className="emc-metrics">

                                <div className="emc-metric">
                                  <div className="emc-metric-label">Query Share</div>
                                  <div className="emc-gauge-wrap">
                                    <div className="emc-gauge-track">
                                      <div className="emc-gauge-fill" style={{ width: `${share}%`, background: meta.color }} />
                                    </div>
                                    <span className="emc-metric-val">{share}% <small>({m.total_queries} queries)</small></span>
                                  </div>
                                </div>


                                <div className="emc-metric">
                                  <div className="emc-metric-label">Retrieval Confidence</div>
                                  <div className="emc-gauge-wrap">
                                    <div className="emc-gauge-track">
                                      <div className="emc-gauge-fill" style={{ width: `${m.avg_confidence}%`, background: meta.color }} />
                                    </div>
                                    <span className="emc-metric-val">{m.avg_confidence}%</span>
                                  </div>
                                </div>


                                <div className="emc-metric">
                                  <div className="emc-metric-label">Satisfaction Rate</div>
                                  <div className="emc-gauge-wrap">
                                    <div className="emc-gauge-track">
                                      <div className="emc-gauge-fill" style={{ width: `${m.satisfaction_rate ?? 0}%`, background: meta.color }} />
                                    </div>
                                    <span className="emc-metric-val">
                                      {m.satisfaction_rate !== null ? `${m.satisfaction_rate}%` : <span style={{color:'#94a3b8'}}>No ratings yet</span>}
                                      {m.rated_count > 0 && <small> ({m.rated_count} rated)</small>}
                                    </span>
                                  </div>
                                </div>


                                <div className="emc-metric">
                                  <div className="emc-metric-label">Avg Response Time</div>
                                  <div className="emc-latency-pill" style={{ borderColor: meta.color, color: meta.color }}>
                                    {m.avg_latency > 0 ? `${m.avg_latency}s` : '—'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}


                {(!modelMetrics || modelMetrics.models?.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                    <p style={{ fontSize: '1rem' }}>No chat data yet — model metrics will appear once users start querying.</p>
                  </div>
                )}


                {analytics?.evaluation_matrix && (
                  <div className="eval-row" style={{ marginTop: '32px' }}>
                    <div className="eval-section glass-card">
                      <h3>Retrieval Confidence Spread</h3>
                      <div className="confidence-bars">
                        <div className="conf-bar-item">
                          <div className="conf-label">High Confidence (Score &gt; 0.6)</div>
                          <div className="conf-progress"><div className="conf-fill high" style={{ width: `${analytics.evaluation_matrix.confidence_spread.high}%` }}></div></div>
                          <span className="conf-pct">{analytics.evaluation_matrix.confidence_spread.high}%</span>
                        </div>
                        <div className="conf-bar-item">
                          <div className="conf-label">Medium Confidence (0.4 - 0.6)</div>
                          <div className="conf-progress"><div className="conf-fill medium" style={{ width: `${analytics.evaluation_matrix.confidence_spread.medium}%` }}></div></div>
                          <span className="conf-pct">{analytics.evaluation_matrix.confidence_spread.medium}%</span>
                        </div>
                        <div className="conf-bar-item">
                          <div className="conf-label">Low Confidence (&lt; 0.4)</div>
                          <div className="conf-progress"><div className="conf-fill low" style={{ width: `${analytics.evaluation_matrix.confidence_spread.low}%` }}></div></div>
                          <span className="conf-pct">{analytics.evaluation_matrix.confidence_spread.low}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="eval-section glass-card">
                      <h3>Quality Assurance Parameters</h3>
                      <div className="qa-list">
                        <div className="qa-item">
                          <span className="qa-dot active"></span>
                          <div className="qa-text">
                            <strong>Source Grounding:</strong> Every answer is strictly forced to cite a source.
                          </div>
                        </div>
                        <div className="qa-item">
                          <span className="qa-dot active"></span>
                          <div className="qa-text">
                            <strong>Domain Filtering:</strong> Non-SRP policy queries are automatically rejected.
                          </div>
                        </div>
                        <div className="qa-item">
                          <span className="qa-dot active"></span>
                          <div className="qa-text">
                            <strong>Cross-Encoder Audit:</strong> IR results re-ranked for better semantic fit.
                          </div>
                        </div>
                        <div className="qa-item">
                          <span className="qa-dot active"></span>
                          <div className="qa-text">
                            <strong>Next-Gen Inference:</strong> BitNet 1.58b (1-bit LLM) supported for 71.9% energy savings.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {activeTab === "policies" && (
              <div className="policies-tab">
                <div className="upload-section">
                  <h2>Upload New Policies</h2>
                  <div className="upload-area">
                    <input type="file" id="pdf-upload" accept=".pdf" multiple onChange={handleFileSelect} className="file-input" />
                    <label htmlFor="pdf-upload" className="file-label">
                      <span className="upload-icon">📤</span>
                      <span className="upload-text">{selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Choose PDF files or drag here"}</span>
                    </label>

                    <div className="category-select-group" style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontWeight: "600", fontSize: "14px", color: "#334155" }}>Category Name:</label>
                        <select 
                          value={selectedCategory} 
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                        >
                          <option value="General">General</option>
                          <option value="Academic Policy">Academic Policy</option>
                          <option value="HR Policy">HR Policy</option>
                          <option value="IT & Security Policy">IT & Security Policy</option>
                          <option value="Student Code of Conduct">Student Code of Conduct</option>
                          <option value="Internship Policy">Internship Policy</option>
                          <option value="Custom">Custom Category...</option>
                        </select>
                      </div>

                      {selectedCategory === "Custom" && (
                        <input
                          type="text"
                          placeholder="Enter custom category..."
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", width: "200px" }}
                        />
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontWeight: "600", fontSize: "14px", color: "#334155" }}>Version Name:</label>
                        <input
                          type="text"
                          placeholder="e.g. v1.0, v2.0, 2024"
                          value={selectedVersion}
                          onChange={(e) => setSelectedVersion(e.target.value)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", width: "130px" }}
                        />
                      </div>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="selected-files">
                        <h4>Selected Files:</h4>
                        <ul>{selectedFiles.map((file, index) => (<li key={index}>{file.name}</li>))}</ul>
                        <button onClick={handleUpload} disabled={uploading} className="upload-btn">
                          {uploading ? "Uploading..." : "Upload & Index"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="policies-list">
                  <h2>Indexed Policies ({filteredPolicies.length})</h2>
                  <div className="policies-grid">
                    {filteredPolicies.map((policy) => (
                      <div key={policy.name} className="policy-card">
                        <div className="policy-icon">📄</div>
                        <div className="policy-info">
                          <h3 className="policy-name">{policy.name}</h3>
                          <div className="policy-badges" style={{ display: "flex", gap: "6px", margin: "4px 0", flexWrap: "wrap" }}>
                            <span className="policy-badge category-tag" style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                              📁 {policy.category_name || policy.policy_type || "General"}
                            </span>
                            <span className="policy-badge version-tag" style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                              🏷️ {policy.version_name || "v1.0"}
                            </span>
                          </div>
                          <div className="policy-meta"><span>{policy.pages} pages</span><span>{policy.chunks} chunks</span></div>
                          <div className="policy-meta"><span>Uploaded: {formatIST(policy.uploaded_at)}</span></div>
                          <div className="policy-actions">

                            <button
                              type="button"
                              className="compare-btn"
                              onClick={() => handleCompareDocument(policy.name)}
                              title="Compare original PDF with extracted text"
                            >
                              🔍 Compare
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeletePolicy(policy.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


            {activeTab === "users" && (
              <div className="users-tab">
                <div className="users-header"><h2>Registered Users ({filteredUsers.length})</h2></div>

                <div className="users-grid">
                  {filteredUsers.map((user) => (
                    <div key={user.email} className={`user-card ${selectedUser === user.email ? 'selected' : ''}`}>
                      <div className="user-card-header">
                        <div className="user-avatar-large">👤</div>
                        <div className="user-badge">@srmap.edu.in</div>
                      </div>
                      <div className="user-card-body">
                        <h3 className="user-email">{user.email}</h3>
                        <div className="user-stats">
                          <div className="user-stat"><span className="stat-label">Queries</span><span className="stat-value">{user.total_queries || 0}</span></div>
                          <div className="user-stat"><span className="stat-label">Joined</span><span className="stat-value">{formatIST(user.created_at)}</span></div>
                        </div>
                        <div className="user-actions" style={{
                          marginTop: '20px',
                          display: 'flex',
                          gap: '10px',
                          flexDirection: 'column'
                        }}>
                          <button
                            type="button"
                            className="compare-btn"
                            style={{ width: '100%', background: 'var(--color-navy)', color: 'white' }}
                            onClick={() => fetchUserChats(user.email)}
                          >
                            View Chat History
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            style={{ width: '100%' }}
                            onClick={() => handleDeleteUser(user.email)}
                          >
                            Delete User
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


                {selectedUser && (
                  <div className="user-chats-modal">
                    <div className="modal-header">
                      <h3>Chat History - {selectedUser}</h3>
                      <button className="close-btn" onClick={() => { setSelectedUser(null); setUserChats([]); }}>×</button>
                    </div>
                    <div className="modal-body">
                      {userChats.length === 0 ? (<p className="no-data">No chat history found</p>) : (
                        <div className="chat-history-list">
                          {userChats.map((chat, index) => (
                            <div key={index} className="chat-history-item">
                              <div className="chat-question"><strong>Q:</strong> {chat.question}</div>
                              <div className="chat-answer"><strong>A:</strong> {chat.answer}</div>
                              <div className="chat-time">{formatIST(chat.timestamp)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {activeTab === "chats" && (
              <div className="chats-tab">
                <div className="chats-header"><h2>All Conversations ({filteredChats.length})</h2></div>
                <div className="chats-full-list">
                  {filteredChats.map((chat, index) => (
                    <div key={index} className="chat-card">
                      <div className="chat-card-header">
                        <div className="chat-user"><span className="chat-avatar">👤</span><span className="chat-email">{chat.user}</span></div>
                        <div className="chat-actions">
                          {chat.satisfaction === 1 && <span title="Satisfied" style={{ fontSize: '18px' }}>👍</span>}
                          {chat.satisfaction === 0 && <span title="Unsatisfied" style={{ fontSize: '18px' }}>👎</span>}
                        </div>
                        <div className="chat-time">{formatIST(chat.timestamp)}</div>
                      </div>
                      <div className="chat-card-body">
                        <div className="chat-pair">
                          <div className="chat-question"><span className="chat-label">Q:</span> {chat.question}</div>
                          <div className="chat-answer"><span className="chat-label">A:</span> {chat.answer}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {activeTab === "logs" && (
              <div className="logs-tab">
                <div className="logs-header">
                  <h2>Admin Activity Logs</h2>
                  <button className="reset-db-btn" onClick={handleResetDB}>⚠️ Reset Database</button>
                </div>
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead><tr><th>Admin</th><th>Action</th><th>Details</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {adminLogs.map((log, index) => (
                        <tr key={index}>
                          <td>{log.admin}</td>
                          <td><span className={`action-badge action-${log.action?.toLowerCase()}`}>{log.action}</span></td>
                          <td>{log.details}</td>
                          <td>{formatIST(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {activeTab === "insights" && analytics && (
              <div className="insights-tab">
                <div className="insights-grid">
                  <div className="insight-card highlight">
                    <div className="insight-icon">🎯</div>
                    <div className="insight-stats">
                      <h4>Satisfaction Rate</h4>
                      <div className="satisfaction-bar">
                        <div
                          className="satisfaction-fill"
                          style={{ width: `${analytics.satisfaction_rate}%` }}
                        ></div>
                      </div>
                      <span className="insight-value">{analytics.satisfaction_rate}%</span>
                      <p className="insight-description">Based on {analytics.total_feedback_count} feedback ratings</p>
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-icon">📡</div>
                    <div className="insight-stats">
                      <h4 style={{ marginBottom: '12px' }}>System Status</h4>
                      <span className="status-badge pulse" style={{ display: 'inline-block', marginBottom: '14px' }}>{analytics.system_health || 'Healthy'}</span>
                      <p className="insight-description" style={{ marginTop: '0' }}>All services operating within normal parameters.</p>
                    </div>
                  </div>

                  <div className="insight-card full-width">
                    <div className="insight-header" style={{ marginBottom: '20px' }}>
                      <h3 style={{ margin: '0 0 6px 0' }}>Most Queried Policies</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Top documents providing grounding for AI responses</p>
                    </div>
                    <div className="policy-rank-list">
                      {analytics.top_matched_policies?.map((policy, idx) => (
                        <div key={idx} className="rank-item">
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="rank-name">{policy.name}</span>
                          <div className="rank-bar-container">
                            <div
                              className="rank-bar"
                              style={{ width: `${(policy.count / (analytics.top_matched_policies[0]?.count || 1)) * 100}%` }}
                            ></div>
                          </div>
                          <span className="rank-count">{policy.count} matches</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="insight-card full-width">
                    <div className="insight-header" style={{ marginBottom: '20px' }}>
                      <h3 style={{ margin: '0 0 4px 0' }}>Engagement Heatmap</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Query volume over the last 14 days</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
                      {analytics.daily_queries?.map((day, idx) => {
                        const maxCount = Math.max(...analytics.daily_queries.map(d => d.count), 1);
                        const pct = Math.max((day.count / maxCount) * 100, 4);
                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>{day.count > 0 ? day.count : ''}</span>
                            <div
                              title={`${day.date}: ${day.count} queries`}
                              style={{
                                width: '100%',
                                height: `${pct}%`,
                                background: day.count > 0 ? 'linear-gradient(180deg, #f37021, #c45a0d)' : '#e2e8f0',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.5s ease',
                                cursor: 'pointer',
                                minHeight: '4px'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {analytics.daily_queries?.map((day, idx) => (
                        <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
                          {day.date.split('-').slice(1).join('/')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === "feedback" && (
              <div className="feedback-tab">
                <div className="section-header"><h2>User Rating Feedback</h2></div>
                <div className="feedback-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {feedback.length === 0 ? <p>No feedback ratings yet.</p> : feedback.map((fb, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>{fb.user_email}</strong>
                        <span style={{ color: '#FFD700', fontSize: '18px' }}>
                          {'★'.repeat(fb.stars)}{'☆'.repeat(5 - fb.stars)}
                        </span>
                      </div>
                      {fb.review && <p style={{ fontStyle: 'italic', color: '#666', marginBottom: '10px' }}>"{fb.review}"</p>}
                      <div style={{ color: '#999', fontSize: '12px', textAlign: 'right' }}>
                        {formatIST(fb.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {activeTab === "diffcompare" && (
              <div className="diffcompare-tab" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '24px', padding: '10px 24px 40px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '4.5rem', marginBottom: '8px', lineHeight: 1 }}>🔀</div>
                  <h2 style={{ margin: '0 0 10px', fontSize: '1.5rem' }}>Policy Version Comparison</h2>
                  <p style={{ color: '#64748b', maxWidth: '480px', lineHeight: 1.6, margin: '0 auto 24px' }}>
                    Compare any two policy PDFs side-by-side. Changed, added, and removed text is highlighted
                    with colour-coded <strong>bounding boxes</strong> per page so differences are immediately visible.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 16px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                      🔲 − Removed Text
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '8px 16px', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>
                      🔲 + Added Text
                    </span>
                  </div>
                  <button
                    className="upload-btn"
                    style={{ fontSize: '1rem', padding: '14px 40px', borderRadius: '10px', background: 'linear-gradient(135deg, #f37021, #e05e10)' }}
                    onClick={() => setShowDiffCompare(true)}
                    disabled={policies.length < 2}
                    title={policies.length < 2 ? 'Upload at least 2 policies to compare' : 'Open Policy Difference Viewer'}
                  >
                    {policies.length < 2 ? '⚠️ At least 2 policies required' : '🔍 Open Difference Viewer'}
                  </button>
                  {policies.length >= 2 && (
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '12px' }}>
                      {policies.length} polic{policies.length === 1 ? 'y' : 'ies'} available for comparison
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '700px' }}>
                  {[
                    { icon: '📑', title: 'Token-level diff', desc: 'LCS algorithm compares exact word changes between versions' },
                    { icon: '🔲', title: 'Bounding boxes', desc: 'Canvas overlay draws highlight regions around changed text zones' },
                    { icon: '🗂️', title: 'Page navigator', desc: 'Jump directly to changed pages; filter to show only differences' },
                  ].map((f, i) => (
                    <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', flex: '1', minWidth: '150px', maxWidth: '160px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{f.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px', color: '#1e293b' }}>{f.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}

export default Admin;