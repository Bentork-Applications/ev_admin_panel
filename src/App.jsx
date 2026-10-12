import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import SplashScreen from "./components/common/SplashScreen";

// Lazy load pages
const AdminLogin = lazy(() => import("./pages/Admin/login"));
const AdminRegister = lazy(() => import("./pages/Admin/AdminRegister"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));

export default function App() {
  const [, setToken] = useState(localStorage.getItem("token"));
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <BrowserRouter>
        <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0B0F14" }} />}>
          <Routes>
            <Route path="/" element={<AdminLogin />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/AdminRegister" element={<AdminRegister />} />

            <Route
              path="/dashboard/*"
              element={<Dashboard />}
            />
            <Route
              path="/crm/*"
              element={<Dashboard />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

