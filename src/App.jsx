import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

// Lazy load pages
const AdminLogin = lazy(() => import("./pages/Admin/login"));
const AdminRegister = lazy(() => import("./pages/Admin/AdminRegister"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/AdminRegister" element={<AdminRegister />} />

          <Route
            path="/dashboard/*"
            // element={token ? <Dashboard /> : <Navigate to="/login" replace />}
            element={<Dashboard/>}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
