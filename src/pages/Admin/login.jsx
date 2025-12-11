import React, { useState } from "react";
import { useNavigate } from "react-router-dom";



export default function AdminLogin() {
  const navigate = useNavigate();

  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!emailValue || !passwordValue) {
      alert("Please enter email and password");
      return;
    }

    try {
      const response = await fetch("http://dev.bentork.com:8080/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrMobile: emailValue,
          password: passwordValue,
        }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (!response.ok) {
        alert(data.message || "Invalid login credentials");
        return;
      }

      localStorage.setItem("token", data.token);

      // alert("Login successful!");
      navigate("/dashboard", { replace: true });
      // navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong. Try again later.");
    }
  };

  // const handleDefaultLogin = async (e) => {
  //     if(emailValue === 'admin@gmail.com' || passwordValue === 'admin') {
  //       alert('Login Successfuly')
  //       navigate('/dashboard')
  //       return;
  //     }

  //     navigate('/login')
  //   };

  return (
    <>
      {/* INTERNAL CSS */}
      <style>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
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
          padding: 40px;
        }

        .logo-box {
     
          padding: 16px 28px;
          margin-bottom: 22px;
          text-align: center;
        }

        /* IMG STYLING */
        .logo-img {
          width: 180px;
          height: auto;
          object-fit: contain;
        }

        .panel-box {

          padding: 14px 26px;
          text-align: center;
        }

        .panel-title {
          margin: 0;
          font-size: 22px;
          letter-spacing: 1px;
        }

        .panel-desc {
          margin-top: 8px;
          font-size: 12px;
          color: #C0C0C0;
        }

        .right-panel {
          width: 50%;
          background: #FFFFFF;
          padding: 80px 100px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login-title {
          margin: 0;
          font-size: 26px;
          font-weight: 400;
           font-family: "Gabarito", sans-serif !important;
        }

        .login-sub {
          margin-top: 6px;
          margin-bottom: 30px;
          color: #444;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .input-box {
          width: 100%;
          height: 46px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #CFCFCF;
          outline: none;
          font-size: 15px;
        }

        .create-text {
          font-size: 12px;
        margin: 0 auto; 
        }

        .create-link {
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }

        .login-btn {
          background: #1E1E1E;
          color: white;
          border: none;
          height: 44px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 400;
          cursor: pointer;
          gap:"10px";
          width: 120px;
          margin: 0 auto; 
        }
      `}</style>

      {/* MAIN UI */}
      <div className="admin-container">

        {/* LEFT SIDE */}
        <div className="left-panel">

   
          <div className="logo-box">
            <img src={"https://raw.githubusercontent.com/bentork5151/assets/refs/heads/main/Logo/logo_inverted.png "} alt="Bentork Logo" className="logo-img" />
          </div>

          <div className="panel-box">
            <h2 className="panel-title">ADMIN PANEL</h2>
            <p className="panel-desc">
              Manage charging stations, users, and sessions all in one place.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="right-panel">
          <h2 className="login-title">Login</h2>
          <p className="login-sub">Enter your registered credentials to get started!</p>

          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Email ID or Mobile Number"
              className="input-box"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="input-box"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
            />

            <p className="create-text">
              Don’t have an Account?{" "}
              <span className="create-link" onClick={() => navigate("/AdminRegister")}>
                Create Account
              </span>
            </p>

            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>
    </>
  );
}
