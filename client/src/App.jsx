import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  FiMonitor,
  FiFileText,
  FiCheckSquare,
  FiActivity,
  FiFolder,
  FiAlertTriangle,
  FiTool,
  FiUsers,
  FiTruck,
  FiAlertCircle,
  FiGitPullRequest,
  FiThermometer,
  FiCpu,
  FiGrid,
  FiLogOut,
  FiShield,
  FiRadio,
} from 'react-icons/fi';
import { login as loginApi, getMe } from './services/api';

// Lazy-load page components
import Dashboard from './pages/Dashboard';
import DevicesPage from './pages/DevicesPage';
import StandardsPage from './pages/StandardsPage';
import ChecklistsPage from './pages/ChecklistsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DocumentsPage from './pages/DocumentsPage';
import RiskAssessmentsPage from './pages/RiskAssessmentsPage';
import CapaPage from './pages/CapaPage';
import TrainingPage from './pages/TrainingPage';
import SuppliersPage from './pages/SuppliersPage';
import NonconformancePage from './pages/NonConformancePage';
import ChangeControlsPage from './pages/ChangeControlsPage';
import CalibrationPage from './pages/CalibrationPage';
import AIToolsPage from './pages/AIToolsPage';
import UdiRecallTracePage from './pages/UdiRecallTracePage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

// ─── Login Page ──────────────────────────────────────────────────────────────

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      localStorage.setItem('token', data.token);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    setEmail(import.meta.env.VITE_DEMO_EMAIL || '');
    setPassword(import.meta.env.VITE_DEMO_PASSWORD || '');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <FiShield />
          </div>
          <h1>MedDevice Compliance</h1>
          <p>AI-Powered Medical Device Compliance Manager</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" className="auto-fill-btn" onClick={handleAutoFill}>
          Demo Login (Auto-fill Credentials)
        </button>
      </div>
    </div>
  );
}

// ─── Navigation Items ────────────────────────────────────────────────────────

const navSections = [
  {
    title: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: FiGrid },
    ],
  },
  {
    title: 'Device Management',
    items: [
      { path: '/devices', label: 'Devices', icon: FiMonitor },
      { path: '/standards', label: 'Standards', icon: FiFileText },
      { path: '/checklists', label: 'Checklists', icon: FiCheckSquare },
    ],
  },
  {
    title: 'Quality & Compliance',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: FiActivity },
      { path: '/documents', label: 'Documents', icon: FiFolder },
      { path: '/risk-assessments', label: 'Risk Assessments', icon: FiAlertTriangle },
      { path: '/capa', label: 'CAPA', icon: FiTool },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/training', label: 'Training', icon: FiUsers },
      { path: '/suppliers', label: 'Suppliers', icon: FiTruck },
      { path: '/nonconformance', label: 'Non-Conformance', icon: FiAlertCircle },
      { path: '/change-controls', label: 'Change Controls', icon: FiGitPullRequest },
      { path: '/calibration', label: 'Calibration', icon: FiThermometer },
      { path: '/udi-recall-trace', label: 'UDI Recall Trace', icon: FiRadio },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [
      { path: '/ai-tools', label: 'All AI Tools (30)', icon: FiCpu },
      { path: '/ai-tools?cat=device', label: 'AI Device Analysis', icon: FiMonitor },
      { path: '/ai-tools?cat=standards', label: 'AI Standards', icon: FiFileText },
      { path: '/ai-tools?cat=documents', label: 'AI Documents', icon: FiFolder },
      { path: '/ai-tools?cat=risk', label: 'AI Risk Mgmt', icon: FiAlertTriangle },
      { path: '/ai-tools?cat=capa', label: 'AI CAPA', icon: FiTool },
      { path: '/ai-tools?cat=training', label: 'AI Training', icon: FiUsers },
      { path: '/ai-tools?cat=suppliers', label: 'AI Suppliers', icon: FiTruck },
      { path: '/ai-tools?cat=ncr', label: 'AI NCR', icon: FiAlertCircle },
      { path: '/ai-tools?cat=change', label: 'AI Change Control', icon: FiGitPullRequest },
      { path: '/ai-tools?cat=calibration', label: 'AI Calibration', icon: FiThermometer },
      { path: '/ai-tools?cat=audit', label: 'AI Audit', icon: FiActivity },
    ],
  },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <FiShield />
        </div>
        <div className="sidebar-brand-text">
          MedDevice
          <span>Compliance Manager</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <item.icon className="sidebar-link-icon" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-title">
        <FiShield className="header-title-icon" />
        AI Medical Device Compliance Manager
      </div>
      <div className="header-actions">
        {user && (
          <span className="header-user">
            {user.name || user.email}
          </span>
        )}
        <button className="header-logout-btn" onClick={onLogout}>
          <FiLogOut style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Logout
        </button>
      </div>
    </header>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((data) => {
          setUser(data.data || data.user || data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header user={user} onLogout={handleLogout} />
        <div className="page-content">
          <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/standards" element={<StandardsPage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/risk-assessments" element={<RiskAssessmentsPage />} />
            <Route path="/capa" element={<CapaPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/nonconformance" element={<NonconformancePage />} />
            <Route path="/change-controls" element={<ChangeControlsPage />} />
            <Route path="/calibration" element={<CalibrationPage />} />
            <Route path="/udi-recall-trace" element={<UdiRecallTracePage />} />
            <Route path="/ai-tools" element={<AIToolsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
