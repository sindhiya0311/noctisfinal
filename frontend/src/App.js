import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import FamilyDashboard from "./pages/FamilyDashboard";

function ProtectedRoute({ children }) {
  const userData = sessionStorage.getItem("user");
  if (!userData) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const userData = sessionStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  return (
    <Router>
      <div className="bg-[#020617] min-h-screen text-white">
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" replace /> : <AuthPage />
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <FamilyDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
