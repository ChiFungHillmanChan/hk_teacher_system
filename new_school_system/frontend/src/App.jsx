// File: src/App.jsx - Updated with new routes
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Import existing pages
import Home from './pages/Home';
import ForgotPassword from './pages/auth/ForgotPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';

// Import form components
import CreateSchool from './components/forms/CreateSchool';
import CreateStudent from './components/forms/CreateStudent';

// Import management pages
import SchoolsManagement from './pages/schools/SchoolsManagement';
import StudentsManagement from './pages/students/StudentsManagement';

// Import new detail pages
import SchoolDetail from './pages/schools/SchoolDetail';
import StudentDetail from './pages/students/StudentDetail';
import YearSummary from './pages/year-summary/YearSummary';

// Import student reports components
import CreateStudentRecord from './pages/reports/CreateStudentRecord';
import StudentReports from './pages/reports/StudentReports';

// Import integration component
import Integration from './pages/integration/Integration';
import AI_Analysis from './pages/analysation/AI_Analysis';

// Import layout
import Layout from './components/layout/Layout';

// Import CSS in correct order
import './index.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/forms.css';
import './styles/globals.css';
import './styles/integration.css';
import './styles/ai-analysis.css';
import './styles/layout.css';
import './styles/management.css';
import './styles/rate-limit-error.css';
import './styles/reports.css';
import './styles/themes.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes with Layout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Create Forms */}
            <Route
              path="/schools/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateSchool />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateStudent />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Schools Management */}
            <Route
              path="/schools"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SchoolsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Individual School Detail */}
            <Route
              path="/schools/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SchoolDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Students Management */}
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Individual Student Detail */}
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Year Summary - 年度整理 */}
            <Route
              path="/year-summary"
              element={
                <ProtectedRoute>
                  <Layout>
                    <YearSummary />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Student Reports */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentReports />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateStudentRecord />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Individual Record Management (placeholders for future implementation) */}
            <Route
              path="/reports/record/:recordId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--color-background-light)',
                        borderRadius: 'var(--border-radius-lg)',
                        margin: '2rem',
                      }}
                    >
                      <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                        📋 記錄詳情
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 查看詳細記錄內容
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/record/:recordId/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--color-background-light)',
                        borderRadius: 'var(--border-radius-lg)',
                        margin: '2rem',
                      }}
                    >
                      <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                        ✏️ 編輯記錄
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 編輯現有記錄
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Integration/Monthly Reports System */}
            <Route
              path="/integration"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Integration />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* AI Analysis */}
            <Route
              path="/ai-analysis"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AI_Analysis />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Analytics and other placeholders */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--color-background-light)',
                        borderRadius: 'var(--border-radius-lg)',
                        margin: '2rem',
                      }}
                    >
                      <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                        📊 數據分析
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 詳細的數據分析和圖表
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--color-background-light)',
                        borderRadius: 'var(--border-radius-lg)',
                        margin: '2rem',
                      }}
                    >
                      <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                        📈 活動記錄
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 完整的系統活動記錄
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;