// File: src/App.jsx
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

// Import new management pages
import SchoolsManagement from './pages/schools/SchoolsManagement';
import StudentsManagement from './pages/students/StudentsManagement';

// Import new student reports components
import CreateStudentRecord from './pages/reports/CreateStudentRecord';
import StudentReports from './pages/reports/StudentReports';

// Import new integration component
import Integration from './pages/integration/Integration';

// Import integration components
import AI_Analysis from './pages/analysation/AI_Analysis';

// Import layout
import Layout from './components/layout/Layout';

//Import Rate Limit error handler

// Import CSS in correct order
import './index.css'; // Vite default styles (reset)
import './styles/components.css'; // Component styles
import './styles/dashboard.css'; // Dashboard specific styles
import './styles/forms.css'; // Form styles
import './styles/globals.css'; // Global variables and base styles
import './styles/integration.css'; // Integration page styles
import './styles/ai-analysis.css'; // AI Analysis styles
import './styles/layout.css'; // Layout and navigation
import './styles/management.css'; // Management pages styles
import './styles/rate-limit-error.css';
import './styles/reports.css'; // Student reports styles
import './styles/themes.css'; // Theme variables

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Temporarily redirect these to login until components are created */}
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

            {/* Schools Management - Replace placeholder */}
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

            {/* Individual School Routes (placeholders for future implementation) */}
            <Route
              path="/schools/:id"
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
                        🏫 學校詳情
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 查看學校詳細資料
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/schools/:id/edit"
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
                        ✏️ 編輯學校
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 編輯學校資料
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Students Management - Replace placeholder */}
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

            {/* Individual Student Routes (placeholders for future implementation) */}
            <Route
              path="/students/:id"
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
                        👨‍🎓 學生詳情
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 查看學生詳細資料
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* AI Analysis Route */}
            <Route path="/ai-analysis" element={
              <ProtectedRoute>
                <Layout>
                  <AI_Analysis />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route
              path="/students/:id/edit"
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
                        ✏️ 編輯學生
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        即將推出 - 編輯學生資料
                      </p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Student Reports System */}
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
              path="/reports/student/:studentId/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateStudentRecord />
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
