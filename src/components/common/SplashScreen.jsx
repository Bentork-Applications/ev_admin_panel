import React, { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";

export default function SplashScreen({ onFinish }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef(null);

  // 4-second loading percentage simulation & smooth transition
  useEffect(() => {
    const startTime = Date.now();
    const duration = 3800; // 3.8s progress duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
        }, 200);

        setTimeout(() => {
          if (onFinish) onFinish();
        }, 750);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onFinish]);

  // Particle & Circuit Grid Background Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles = [];
    const particleCount = 55;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.6,
        color: Math.random() > 0.5 ? "rgba(0, 212, 255, " : "rgba(54, 243, 179, ",
        alpha: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5 - 0.2,
        pulse: Math.random() * 0.02 + 0.005
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle Background Grid Lines
      ctx.strokeStyle = "rgba(0, 212, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Floating Particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        p.alpha += Math.sin(Date.now() * p.pulse) * 0.008;
        const clampedAlpha = Math.max(0.1, Math.min(0.75, p.alpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${clampedAlpha})`;
        ctx.shadowColor = "#00D4FF";
        ctx.shadowBlur = p.radius * 5;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`cyber-splash-overlay ${isFadingOut ? "fade-out" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');

        .cyber-splash-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background: radial-gradient(circle at center, #0A1E2E 0%, #06131D 70%, #030A10 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          opacity: 1;
          transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cyber-splash-overlay.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        /* Dark Vignette Overlay */
        .splash-vignette {
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.85);
          pointer-events: none;
          z-index: 2;
        }

        /* Particle Canvas */
        .splash-particle-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        /* Dynamic Light Streaks */
        .splash-light-streak {
          position: absolute;
          width: 600px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.65), rgba(54, 243, 179, 0.65), transparent);
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          filter: blur(1px);
          opacity: 0.7;
          pointer-events: none;
          z-index: 2;
          animation: streakPulse 4s infinite ease-in-out alternate;
        }

        @keyframes streakPulse {
          0% { opacity: 0.3; transform: translate(-50%, -50%) scaleX(0.8); }
          100% { opacity: 0.85; transform: translate(-50%, -50%) scaleX(1.2); }
        }

        .splash-ambient-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.22) 0%, rgba(54, 243, 179, 0.08) 40%, transparent 70%);
          filter: blur(40px);
          pointer-events: none;
          z-index: 2;
          animation: glowBreathing 5s infinite ease-in-out alternate;
        }

        @keyframes glowBreathing {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 0.9; }
        }

        /* Main Content Box */
        .splash-main-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 20px;
        }

        /* HUD Radar Rings Wrapper */
        .hud-rings-wrapper {
          position: relative;
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .hud-ring-outer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px dashed rgba(0, 212, 255, 0.45);
          animation: rotateClockwise 20s linear infinite;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
        }

        .hud-ring-middle {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #36F3B3;
          border-bottom-color: #00D4FF;
          animation: rotateCounterClockwise 12s linear infinite;
          box-shadow: 0 0 25px rgba(54, 243, 179, 0.25);
        }

        .hud-ring-inner {
          position: absolute;
          inset: 36px;
          border-radius: 50%;
          border: 1px solid rgba(0, 212, 255, 0.35);
        }

        @keyframes rotateClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes rotateCounterClockwise {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        /* Glassmorphism Logo Card */
        .logo-glass-card {
          position: relative;
          width: 145px;
          height: 145px;
          border-radius: 36px;
          background: rgba(10, 30, 46, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(0, 212, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 0 35px rgba(0, 212, 255, 0.35),
            0 15px 35px rgba(0, 0, 0, 0.6),
            inset 0 0 20px rgba(54, 243, 179, 0.2);
          animation: logoGlassPulse 3.5s ease-in-out infinite alternate;
          z-index: 5;
        }

        @keyframes logoGlassPulse {
          0% {
            transform: scale(1);
            border-color: rgba(0, 212, 255, 0.5);
            box-shadow: 0 0 35px rgba(0, 212, 255, 0.35), 0 15px 35px rgba(0, 0, 0, 0.6);
          }
          100% {
            transform: scale(1.03);
            border-color: rgba(54, 243, 179, 0.8);
            box-shadow: 0 0 50px rgba(54, 243, 179, 0.6), 0 20px 40px rgba(0, 0, 0, 0.7);
          }
        }

        .logo-img-styled {
          width: 480px;
          max-width: 90vw;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 25px rgba(0, 212, 255, 0.6));
        }

        /* Branding Text Group */
        .branding-text-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 28px;
        }

        .title-brand {
          font-family: 'Gabarito', 'Inter', sans-serif;
          font-size: 42px;
          font-weight: 900;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: 2px;
          line-height: 1.1;
          text-shadow: 0 0 25px rgba(255, 255, 255, 0.4);
        }

        .subtitle-admin {
          font-size: 14px;
          font-weight: 700;
          color: #00D4FF;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-top: 2px;
          text-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
        }

        .tagline-text {
          font-size: 14px;
          font-weight: 400;
          color: #B8C2CC;
          margin-top: 8px;
          letter-spacing: 0.5px;
        }

        /* Circular Energy Loader & Progress */
        .loader-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
        }

        .energy-ring-container {
          position: relative;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .energy-ring-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          animation: rotateClockwise 3s linear infinite;
        }

        .lightning-icon-box {
          position: relative;
          z-index: 2;
          color: #36F3B3;
          filter: drop-shadow(0 0 10px #36F3B3);
          animation: pulseIcon 1.5s ease-in-out infinite alternate;
        }

        @keyframes pulseIcon {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 16px #00D4FF); }
        }

        /* Neon Progress Bar */
        .progress-bar-outer {
          width: 220px;
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.8);
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00D4FF 0%, #36F3B3 100%);
          border-radius: 10px;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.9);
          transition: width 0.08s ease-out;
        }

        /* Percentage & Loading Text */
        .progress-label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #B8C2CC;
          font-family: monospace;
        }

        .progress-pct {
          color: #36F3B3;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(54, 243, 179, 0.6);
        }

        .loading-text-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .dot-anim {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #00D4FF;
          animation: dotFade 1.2s infinite ease-in-out;
        }

        .dot-anim:nth-child(1) { animation-delay: 0s; }
        .dot-anim:nth-child(2) { animation-delay: 0.2s; }
        .dot-anim:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotFade {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.3); }
        }

        @media (max-width: 768px) {
          .title-brand { font-size: 32px; }
          .subtitle-admin { font-size: 12px; letter-spacing: 3px; }
          .tagline-text { font-size: 12px; }
          .logo-img-styled { width: 220px; }
          .hud-rings-wrapper { width: 200px; height: 200px; }
          .logo-glass-card { width: 120px; height: 120px; border-radius: 28px; }
        }
      `}</style>

      {/* Vignette & Canvas background particles */}
      <div className="splash-vignette" />
      <canvas ref={canvasRef} className="splash-particle-canvas" />

      {/* Light streak and ambient radial glow */}
      <div className="splash-light-streak" />
      <div className="splash-ambient-glow" />

      {/* Main Content */}
      <div className="splash-main-content">
        
        {/* HUD Radar Rings with Glass Logo Container */}
        <div className="hud-rings-wrapper">
          <div className="hud-ring-outer" />
          <div className="hud-ring-middle" />
          <div className="hud-ring-inner" />

          <div className="logo-glass-card">
            <img
              src="https://github.com/Bentork-Applications/assets/blob/main/img/logo_slogan.png?raw=true"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://github.com/Bentork-Applications/assets/blob/main/img/logo_slogan.png?raw=true";
              }}
              alt="Bentork Logo"
              className="logo-img-styled"
            />
          </div>
        </div>

        {/* Title & Subtitle Branding */}
        <div className="branding-text-group">
          <h1 className="title-brand">BENTORK</h1>
          <div className="subtitle-admin">ADMIN PANEL</div>
          <p className="tagline-text">Powering the Future of EV Charging</p>
        </div>

        {/* Circular Energy Loading & Progress Bar */}
        <div className="loader-section">
          <div className="energy-ring-container">
            <svg className="energy-ring-svg" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(0, 212, 255, 0.15)" strokeWidth="3" />
              <circle
                cx="30"
                cy="30"
                r="25"
                fill="none"
                stroke="url(#cyanTealGrad)"
                strokeWidth="3.5"
                strokeDasharray="120 40"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="cyanTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4FF" />
                  <stop offset="100%" stopColor="#36F3B3" />
                </linearGradient>
              </defs>
            </svg>
            <div className="lightning-icon-box">
              <Zap size={22} fill="#36F3B3" color="#00D4FF" />
            </div>
          </div>

          <div className="progress-bar-outer">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="progress-label-row">
            <span className="progress-pct">{progress}%</span>
            <span>Loading</span>
            <div className="loading-text-dots">
              <div className="dot-anim" />
              <div className="dot-anim" />
              <div className="dot-anim" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
