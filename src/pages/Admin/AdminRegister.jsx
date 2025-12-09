import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import bentork_logo from "/Users/apple/Desktop/ev_charging_sys_frontend_web/Website/src/assets/images/bentork_logo.png";   // <-- Your logo image

export default function AdminRegister() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!fullName || !emailValue || !contactNo || !passwordValue || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }

    if (passwordValue !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: emailValue,
          mobile: contactNo,
          password: passwordValue,
        }),
      });

      const result = await response.text();

      if (!response.ok) {
        alert(result || "Registration failed");
        return;
      }

      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Something went wrong!");
    }
  };

  return (
    <>
      {/* INTERNAL CSS */}
      <style>{`
        .register-container {
          display: flex;
          height: 100vh;
          font-family: Inter, sans-serif;
        }

        /* LEFT PANEL */
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

        /* RIGHT PANEL */
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
      `}</style>

      {/* PAGE LAYOUT */}
      <div className="register-container">

        {/* LEFT SECTION */}
        <div className="left-panel">
          <img src={"https://raw.githubusercontent.com/bentork5151/assets/refs/heads/main/Logo/logo_inverted.png  "} alt="Bentork Logo" className="logo-img" />
      

          <h3 className="panel-heading">ADMIN PANEL</h3>
          <p className="panel-desc">
            Manage charging stations, users, and sessions all in one place.
          </p>
        </div>

        {/* RIGHT SECTION */}
        <div className="right-panel">
          <h2 className="title">Create Account</h2>
          <p className="subtitle">Fill in the details to get started</p>

          <form className="reg-form" onSubmit={handleRegister}>
            
            <input
              className="reg-input"
              type="text"
              placeholder="Your Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="reg-input"
              type="email"
              placeholder="Email ID"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
            />

            <input
              className="reg-input"
              type="tel"
              placeholder="Contact No."
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
            />

            <input
              className="reg-input"
              type="password"
              placeholder="Password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
            />

            <input
              className="reg-input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="login-text">
              Already have an Account?
              <span onClick={() => navigate("/login")}>Login</span>
            </div>

            <button className="reg-button" type="submit">
              Register
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
