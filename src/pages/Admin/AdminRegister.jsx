import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const { name, email, mobile, password, confirmPassword } = formData;

    if (!name || !email || !mobile || !password || !confirmPassword) {
      return alert("Please fill all fields.");
    }

    if (password !== confirmPassword) {
      return alert("Passwords do not match!");
    }



    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password, confirmPassword }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.text();

      if (!response.ok) {
        return alert(result || "Registration failed");
      }

      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      if (err.name === "AbortError") {
        alert("Server connection timed out. Please try again later.");
      } else {
        console.error(err);
        alert("Something went wrong!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <style>{`
        .register-container {
          display: flex;
          height: 100vh;
          font-family: Inter, sans-serif;
        }
        .left-panel {
          width: 50%;
          background: #1E1E1E;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .logo-img {
          width: 140px;
          margin-bottom: 10px;
        }
        .panel-heading {
          margin-top: 40px;
          font-size: 26px;
        }
        .panel-desc {
          font-size: 13px;
          opacity: 0.8;
          max-width: 260px;
          text-align: center;
        }
        .right-panel {
          width: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px 80px;
        }
        .title {
          font-size: 28px;
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 13px;
          margin-bottom: 30px;
          opacity: 0.7;
        }
        .reg-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .reg-input {
          padding: 12px;
          width: 100%;
          font-size: 14px;
          border: 1px solid #ccc;
          border-radius: 6px;
          outline: none;
        }
        .login-text {
          font-size: 13px;
          text-align: right;
          margin: 0 auto;
        }
        .login-text span {
          text-decoration: underline;
          cursor: pointer;
          font-weight: 600;
        }
        .reg-button {
          width: 120px;
          padding: 12px;
          background: #1E1E1E;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          margin: 0 auto;
          display: block;
        }
        .reg-button:disabled {
          background: #555;
          cursor: not-allowed;
        }
      `}</style>

      <div className="left-panel">
        <img
          src="https://raw.githubusercontent.com/bentork5151/assets/refs/heads/main/Logo/logo_inverted.png"
          alt="Bentork Logo"
          className="logo-img"
        />
        <h3 className="panel-heading">ADMIN PANEL</h3>
        <p className="panel-desc">
          Manage charging stations, users, and sessions all in one place.
        </p>
      </div>

      <div className="right-panel">
        <h2 className="title">Create Account</h2>
        <p className="subtitle">Fill in the details to get started</p>

        <form className="reg-form" onSubmit={handleRegister}>
          <input
            className="reg-input"
            type="text"
            name="name"
            placeholder="Your Full Name"
            value={formData.name}
            onChange={handleChange}
          />
          <input
            className="reg-input"
            type="email"
            name="email"
            placeholder="Email ID"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            className="reg-input"
            type="tel"
            name="mobile"
            placeholder="Contact No."
            value={formData.mobile}
            onChange={handleChange}
          />
          <input
            className="reg-input"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <input
            className="reg-input"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />

          <div className="login-text">
            Already have an Account?{" "}
            <span onClick={() => navigate("/login")}>Login</span>
          </div>

          <button className="reg-button" type="submit" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
