import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Rocket,
  Wifi,
  ShieldCheck,
  Sparkles,
  Bug,
  Download,
  CheckCircle2,
  Smartphone,
  Maximize2,
  RefreshCw,
  Clock,
  HardDrive
} from "lucide-react";

export default function AppUpdateScreen() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedMb, setDownloadedMb] = useState(0);
  const totalMb = 52.0;
  const [deviceFrame, setDeviceFrame] = useState(true);
  const canvasRef = useRef(null);

  // Particle background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particleCount = 45;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5,
        color: Math.random() > 0.4 ? "rgba(0, 229, 255, " : "rgba(0, 255, 198, ",
        alpha: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4 - 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.01;
        const clampedAlpha = Math.max(0.1, Math.min(0.8, p.alpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${clampedAlpha})`;
        ctx.shadowColor = "#00E5FF";
        ctx.shadowBlur = p.radius * 4;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [deviceFrame]);

  // Handle Update simulation
  useEffect(() => {
    let timer;
    if (isUpdating && progress < 100) {
      timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.floor(Math.random() * 3 + 1);
          if (next >= 100) {
            setDownloadedMb(totalMb);
            return 100;
          }
          setDownloadedMb(parseFloat(((next / 100) * totalMb).toFixed(1)));
          return next;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [isUpdating, progress]);

  const handleStartUpdate = () => {
    if (progress === 100) {
      setProgress(0);
      setDownloadedMb(0);
      setIsUpdating(false);
      return;
    }
    setIsUpdating(true);
  };

  const getRemainingTime = () => {
    if (progress >= 100) return "Download complete";
    if (progress === 0) return "Calculating time...";
    const remSeconds = Math.ceil(((100 - progress) / 100) * 120);
    const mins = Math.floor(remSeconds / 60);
    const secs = remSeconds % 60;
    if (mins > 0) return `${mins} min ${secs} sec remaining`;
    return `${secs} seconds remaining`;
  };

  return (
    <div style={containerStyle}>
      {/* Dynamic Embedded Keyframe Animations */}
      <style>{`
        @keyframes rotateClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes rotateCounterClockwise {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 35px rgba(0, 229, 255, 0.4), 0 0 70px rgba(0, 229, 255, 0.2);
            filter: drop-shadow(0 0 15px rgba(0, 229, 255, 0.6));
          }
          50% {
            box-shadow: 0 0 55px rgba(0, 255, 198, 0.7), 0 0 100px rgba(0, 229, 255, 0.4);
            filter: drop-shadow(0 0 25px rgba(0, 255, 198, 0.9));
          }
        }

        @keyframes floatOrbit {
          0% { transform: rotate(0deg) translateX(70px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
        }

        @keyframes breathingGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.08); }
        }

        @keyframes shimmerBtn {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .neon-ring-outer {
          animation: rotateClockwise 18s linear infinite;
        }

        .neon-ring-middle {
          animation: rotateCounterClockwise 12s linear infinite;
        }

        .neon-ring-inner {
          animation: rotateClockwise 8s linear infinite;
        }

        .bentork-logo-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .bg-radial-pulse {
          animation: breathingGlow 6s ease-in-out infinite;
        }

        .btn-update-gradient {
          background: linear-gradient(135deg, #00E5FF 0%, #00FFC6 50%, #00A3FF 100%);
          background-size: 200% 200%;
          animation: shimmerBtn 4s ease infinite;
          box-shadow: 0 0 30px rgba(0, 229, 255, 0.5), 0 10px 20px rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-update-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 45px rgba(0, 255, 198, 0.8), 0 15px 30px rgba(0, 0, 0, 0.5);
        }

        .btn-update-gradient:active {
          transform: translateY(1px);
        }

        .feature-card-item {
          transition: all 0.25s ease;
        }

        .feature-card-item:hover {
          background: rgba(0, 229, 255, 0.08);
          transform: translateX(4px);
          border-left-color: #00FFC6;
        }
      `}</style>

      {/* Top Preview Controls Bar */}
      <div style={topControlBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: "14px", letterSpacing: "0.5px" }}>
            BENTORK EV
          </span>
          <span style={{ background: "rgba(0, 229, 255, 0.15)", color: "#00E5FF", border: "1px solid rgba(0, 229, 255, 0.3)", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
            App Update UI Preview
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setDeviceFrame(!deviceFrame)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: deviceFrame ? "linear-gradient(135deg, #00E5FF, #00FFC6)" : "rgba(255, 255, 255, 0.1)",
              color: deviceFrame ? "#06111D" : "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {deviceFrame ? <Smartphone size={14} /> : <Maximize2 size={14} />}
            {deviceFrame ? "Mobile Frame" : "Full Screen"}
          </button>
        </div>
      </div>

      {/* Screen Wrapper */}
      <div style={deviceFrame ? phoneWrapperStyle : fullscreenWrapperStyle}>
        {deviceFrame && (
          <div style={phoneHeaderNotchStyle}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff" }}>9:41</div>
            <div style={{ width: "90px", height: "18px", background: "#000", borderRadius: "10px", margin: "0 auto" }} />
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <Wifi size={12} color="#fff" />
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#fff" }}>5G</div>
            </div>
          </div>
        )}

        <div style={screenInnerStyle}>
          {/* Animated Canvas Particle Background */}
          <canvas ref={canvasRef} style={canvasStyle} />

          {/* Radial Ambient Glow */}
          <div className="bg-radial-pulse" style={ambientGlowStyle} />

          {/* Scrollable Content Container */}
          <div style={scrollContentStyle}>

            {/* Header Section */}
            <div style={headerContainerStyle}>
              <div style={versionBadgeStyle}>
                <Sparkles size={12} color="#00FFC6" />
                <span>VERSION 3.4.0 AVAILABLE</span>
              </div>
              <h1 style={titleStyle}>Update Available</h1>
              <p style={subtitleStyle}>
                A newer version of Bentork is available with performance improvements, enhanced security, bug fixes, and exciting new features.
              </p>
            </div>

            {/* Center Bentork Logo & Rotating Neon Rings */}
            <div style={centerSectionStyle}>
              {/* Outer Neon Ring */}
              <div className="neon-ring-outer" style={outerRingStyle} />

              {/* Middle Neon Ring */}
              <div className="neon-ring-middle" style={middleRingStyle} />

              {/* Inner Concentric Ring */}
              <div className="neon-ring-inner" style={innerRingStyle} />

              {/* Orbiting Particles */}
              <div style={orbitParticle1Style} />
              <div style={orbitParticle2Style} />

              {/* Center Bentork Logo Box */}
              <div className="bentork-logo-glow" style={logoContainerStyle}>
                <img
                  src="https://github.com/Bentork-Applications/assets/blob/main/img/logo_slogan.png?raw=true"
                  alt="Bentork EV Logo"
                  style={{ width: "160px", height: "auto", filter: "brightness(1.15) contrast(1.1)" }}
                />
              </div>
            </div>

            {/* Feature Card (Glassmorphism) */}
            <div style={glassCardStyle}>
              <div style={cardHeaderStyle}>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#FFF", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#00E5FF" /> What's New
                </span>
                <span style={{ fontSize: "11px", color: "#00FFC6", fontWeight: "600", background: "rgba(0, 255, 198, 0.12)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(0, 255, 198, 0.3)" }}>
                  v3.4.0
                </span>
              </div>

              <div style={featureGridStyle}>
                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><Zap size={15} color="#00E5FF" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>Improved charging performance</div>
                    <div style={featureSubStyle}>Optimized charging speeds & thermal response</div>
                  </div>
                </div>

                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><Rocket size={15} color="#00FFC6" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>Faster app startup</div>
                    <div style={featureSubStyle}>Instant launch & quick navigation</div>
                  </div>
                </div>

                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><Wifi size={15} color="#00E5FF" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>Better station connectivity</div>
                    <div style={featureSubStyle}>Auto-reconnect with smart EV chargers</div>
                  </div>
                </div>

                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><ShieldCheck size={15} color="#00FFC6" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>Enhanced security</div>
                    <div style={featureSubStyle}>End-to-end encrypted sessions & payments</div>
                  </div>
                </div>

                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><Sparkles size={15} color="#00E5FF" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>UI improvements</div>
                    <div style={featureSubStyle}>Sleek cyber-tech dark theme polish</div>
                  </div>
                </div>

                <div className="feature-card-item" style={featureItemStyle}>
                  <div style={iconBadgeStyle}><Bug size={15} color="#00FFC6" /></div>
                  <div style={featureTextStyle}>
                    <div style={featureTitleStyle}>Bug fixes</div>
                    <div style={featureSubStyle}>Stability enhancements & minor bug fixes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            {(isUpdating || progress > 0) && (
              <div style={progressSectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#B7D8E8", display: "flex", alignItems: "center", gap: "6px" }}>
                    <RefreshCw size={14} className={progress < 100 ? "neon-ring-inner" : ""} color="#00E5FF" />
                    {progress === 100 ? "Update Completed!" : "Updating..."}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: "#00FFC6", fontFamily: "monospace" }}>
                    {progress}%
                  </span>
                </div>

                {/* Progress Bar Container */}
                <div style={progressBarBgStyle}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "6px",
                      background: "linear-gradient(90deg, #00E5FF 0%, #00FFC6 100%)",
                      boxShadow: "0 0 15px rgba(0, 229, 255, 0.8)",
                      transition: "width 0.2s ease"
                    }}
                  />
                </div>

                {/* Metrics Breakdown */}
                <div style={metricsRowStyle}>
                  <span style={metricLabelStyle}>
                    <HardDrive size={12} color="#00E5FF" />
                    Downloading {downloadedMb} MB / {totalMb} MB
                  </span>
                  <span style={metricLabelStyle}>
                    <Clock size={12} color="#00FFC6" />
                    {getRemainingTime()}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Buttons Container */}
            <div style={buttonContainerStyle}>
              <button
                type="button"
                className="btn-update-gradient"
                onClick={handleStartUpdate}
                style={primaryButtonStyle}
              >
                {progress === 100 ? (
                  <>
                    <CheckCircle2 size={18} color="#06111D" /> Restart & Enjoy Update
                  </>
                ) : isUpdating && progress < 100 ? (
                  <>
                    <RefreshCw size={18} className="neon-ring-inner" color="#06111D" /> Updating... {progress}%
                  </>
                ) : (
                  <>
                    <Download size={18} color="#06111D" /> Update Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isUpdating) {
                    setIsUpdating(false);
                  } else {
                    alert("Update postponed. You can update anytime from Settings.");
                  }
                }}
                style={secondaryButtonStyle}
              >
                {isUpdating ? "Cancel Download" : "Later"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// STYLES
const containerStyle = {
  minHeight: "100vh",
  background: "#040910",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 10px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  boxSizing: "border-box"
};

const topControlBarStyle = {
  width: "100%",
  maxWidth: "460px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  padding: "0 8px"
};

const phoneWrapperStyle = {
  width: "100%",
  maxWidth: "420px",
  height: "850px",
  maxHeight: "92vh",
  background: "#06111D",
  borderRadius: "44px",
  border: "3px solid rgba(0, 229, 255, 0.3)",
  boxShadow: "0 0 50px rgba(0, 229, 255, 0.2), 0 30px 60px rgba(0, 0, 0, 0.8)",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  flexDirection: "column"
};

const fullscreenWrapperStyle = {
  width: "100%",
  maxWidth: "600px",
  minHeight: "90vh",
  background: "#06111D",
  borderRadius: "24px",
  border: "1px solid rgba(0, 229, 255, 0.25)",
  boxShadow: "0 0 60px rgba(0, 229, 255, 0.15)",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  flexDirection: "column"
};

const phoneHeaderNotchStyle = {
  height: "44px",
  background: "rgba(6, 17, 29, 0.85)",
  backdropFilter: "blur(10px)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 22px",
  zIndex: 10,
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
};

const screenInnerStyle = {
  flex: 1,
  position: "relative",
  background: "linear-gradient(180deg, #06111D 0%, #0B1F35 60%, #040A12 100%)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};

const canvasStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 1
};

const ambientGlowStyle = {
  position: "absolute",
  top: "15%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, rgba(0, 255, 198, 0.08) 50%, transparent 75%)",
  filter: "blur(35px)",
  pointerEvents: "none",
  zIndex: 2
};

const scrollContentStyle = {
  position: "relative",
  zIndex: 5,
  flex: 1,
  overflowY: "auto",
  padding: "24px 20px 32px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "22px"
};

const headerContainerStyle = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const versionBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "rgba(0, 229, 255, 0.1)",
  border: "1px solid rgba(0, 229, 255, 0.3)",
  color: "#00E5FF",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1px",
  marginBottom: "10px"
};

const titleStyle = {
  fontSize: "26px",
  fontWeight: "800",
  color: "#FFFFFF",
  margin: "0 0 8px 0",
  letterSpacing: "-0.5px",
  textShadow: "0 0 20px rgba(255, 255, 255, 0.3)"
};

const subtitleStyle = {
  fontSize: "13px",
  color: "#B7D8E8",
  lineHeight: "1.55",
  margin: 0,
  maxWidth: "340px"
};

const centerSectionStyle = {
  position: "relative",
  width: "220px",
  height: "220px",
  margin: "4px auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const outerRingStyle = {
  position: "absolute",
  width: "210px",
  height: "210px",
  borderRadius: "50%",
  border: "2px dashed rgba(0, 229, 255, 0.5)",
  boxShadow: "0 0 20px rgba(0, 229, 255, 0.2)"
};

const middleRingStyle = {
  position: "absolute",
  width: "180px",
  height: "180px",
  borderRadius: "50%",
  border: "2px solid transparent",
  borderTopColor: "#00FFC6",
  borderBottomColor: "#00E5FF",
  boxShadow: "0 0 25px rgba(0, 255, 198, 0.3)"
};

const innerRingStyle = {
  position: "absolute",
  width: "150px",
  height: "150px",
  borderRadius: "50%",
  border: "1px solid rgba(0, 229, 255, 0.4)"
};

const orbitParticle1Style = {
  position: "absolute",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#00E5FF",
  boxShadow: "0 0 10px #00E5FF",
  animation: "floatOrbit 6s linear infinite"
};

const orbitParticle2Style = {
  position: "absolute",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#00FFC6",
  boxShadow: "0 0 10px #00FFC6",
  animation: "floatOrbit 9s linear infinite reverse"
};

const logoContainerStyle = {
  width: "135px",
  height: "135px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(11, 31, 53, 0.95) 0%, rgba(6, 17, 29, 0.9) 100%)",
  border: "2px solid rgba(0, 229, 255, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 3
};

const glassCardStyle = {
  background: "rgba(11, 31, 53, 0.55)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0, 229, 255, 0.3)",
  borderRadius: "24px",
  padding: "18px 16px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(0, 229, 255, 0.05)"
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "14px",
  paddingBottom: "10px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
};

const featureGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const featureItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "8px 10px",
  borderRadius: "12px",
  borderLeft: "2px solid rgba(0, 229, 255, 0.4)",
  background: "rgba(6, 17, 29, 0.4)"
};

const iconBadgeStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "rgba(0, 229, 255, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const featureTextStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2px"
};

const featureTitleStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#FFFFFF"
};

const featureSubStyle = {
  fontSize: "11px",
  color: "#8EAEC2",
  lineHeight: "1.3"
};

const progressSectionStyle = {
  background: "rgba(6, 17, 29, 0.7)",
  border: "1px solid rgba(0, 229, 255, 0.3)",
  borderRadius: "16px",
  padding: "14px 16px",
  boxShadow: "0 0 20px rgba(0, 229, 255, 0.1)"
};

const progressBarBgStyle = {
  width: "100%",
  height: "10px",
  borderRadius: "6px",
  background: "rgba(255, 255, 255, 0.08)",
  overflow: "hidden",
  marginBottom: "10px"
};

const metricsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const metricLabelStyle = {
  fontSize: "11px",
  color: "#B7D8E8",
  display: "flex",
  alignItems: "center",
  gap: "5px"
};

const buttonContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginTop: "auto",
  paddingTop: "6px"
};

const primaryButtonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "30px",
  border: "none",
  color: "#06111D",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  letterSpacing: "0.5px"
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "30px",
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  color: "#B7D8E8",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.2s ease"
};
