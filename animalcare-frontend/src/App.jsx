// App.jsx - ALTERNATIEF (beter)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';      
import RegisterPage from './pages/RegisterPage'; 

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-vh-100 d-flex flex-column">
          <Navbar />
          <Container className="py-4 flex-grow-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes - aparte dashboard route */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute>
                    <TasksPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect / to dashboard if logged in, else home */}
              <Route path="/home" element={<HomePage />} />
            </Routes>
          </Container>
          <footer className="bg-dark text-white text-center py-3 mt-4">
            <div className="container">
              <p className="mb-0">AnimalCare &copy; {new Date().getFullYear()}</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;