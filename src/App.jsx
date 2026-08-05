import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

// Lazy load pages
const AdminLogin = lazy(() => import("./pages/Admin/login"));
const AdminRegister = lazy(() => import("./pages/Admin/AdminRegister"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));

export default function App() {
  const [, setToken] = useState(localStorage.getItem("token"));

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
            element={<Dashboard />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
