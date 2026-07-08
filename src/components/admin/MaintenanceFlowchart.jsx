import React from "react";

const FlowCard = ({ title, status, icon: Icon, color = "#1a1a1a", isActive = false, step = null }) => {
  return (
    <div className={`flow-card ${isActive ? 'active' : ''}`} style={{ borderColor: isActive ? color : '#e5e7eb' }}>
      {step && <div className="step-badge">{step}</div>}
      <div className="card-icon" style={{ backgroundColor: isActive ? `${color}15` : '#f3f4f6' }}>
        <Icon size={20} color={isActive ? color : '#6b7280'} />
      </div>
      <div className="card-info">
        <h4 style={{ color: isActive ? '#111' : '#6b7280' }}>{title}</h4>
        <p style={{ color: isActive ? color : '#9ca3af' }}>{status}</p>
      </div>
    </div>
  );
};

const Arrow = ({ direction = "down", isActive = false, color = "#2563eb" }) => {
  return (
    <div className={`flow-arrow ${direction} ${isActive ? 'active' : ''}`}>
      <div className="arrow-line" style={{ backgroundColor: isActive ? color : '#e5e7eb' }}></div>
      <div className="arrow-head" style={{ borderTopColor: isActive ? color : '#e5e7eb' }}></div>
    </div>
  );
};

// SVG Icons
const Icons = {
  Admin: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  System: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  Charger: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  Booking: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Notification: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Station: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Success: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Check: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Info: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Blocked: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  Offline: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>
    </svg>
  ),
};

export default function MaintenanceFlowchart({ state = "OFF" }) {
  const isMaintenance = state === "ACTIVE";
  const isScheduled = state === "SCHEDULED";
  const isActive = isMaintenance || isScheduled;

  return (
    <div className="flowchart-wrapper">
      <style>{`
        .flowchart-wrapper {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          font-family: 'Lexend', sans-serif;
        }

        .flow-row {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 40px;
          width: 100%;
        }

        .flow-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .flow-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          width: 220px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .flow-card.active {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .step-badge {
          position: absolute;
          top: -10px;
          left: -10px;
          background: #374151;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-info h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .card-info p {
          margin: 4px 0 0;
          font-size: 12px;
          font-weight: 400;
        }

        .diamond-box {
          width: 120px;
          height: 120px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
          margin: 20px 0;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .diamond-box.active {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .diamond-content {
          transform: rotate(-45deg);
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .flow-arrow {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .arrow-line {
          width: 2px;
          background: #e5e7eb;
          transition: all 0.3s;
        }

        .arrow-head {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #e5e7eb;
          transition: all 0.3s;
        }

        .flow-arrow.down .arrow-line { height: 40px; }
        
        .branch-container {
          position: relative;
          width: 100%;
          height: 40px;
        }

        .branch-line {
          position: absolute;
          top: 0;
          height: 2px;
          background: #e5e7eb;
          transition: all 0.3s;
        }

        .status-bubble {
          background: #f0fdf4;
          border: 1px solid #bcf0da;
          color: #059669;
          padding: 10px 24px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
        }

        @media (max-width: 1024px) {
          .flow-row {
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .branch-container { display: none; }
        }
      `}</style>

      {/* Start Nodes */}
      <div className="flow-row" style={{ marginBottom: 0 }}>
        <div className="flow-column">
          <FlowCard 
            title="Admin Puts Station" 
            status="In Maintenance Mode" 
            icon={Icons.Admin} 
            color="#f59e0b" 
            isActive={isActive} 
          />
          <Arrow isActive={isActive} color="#f59e0b" />
        </div>

        <div style={{ width: 100 }}></div>

        <div className="flow-column">
          <FlowCard 
            title="Admin Disables" 
            status="Maintenance Mode" 
            icon={Icons.Admin} 
            color="#10b981" 
            isActive={!isActive} 
          />
          <Arrow isActive={!isActive} color="#10b981" />
          {!isActive && (
            <div className="status-bubble" style={{ background: '#f0fdf4', borderColor: '#bcf0da', color: '#059669' }}>
              <Icons.Success size={18} color="#059669" /> Everything Back to Normal
            </div>
          )}
        </div>
      </div>

      {/* Decision Diamond */}
      <div className={`diamond-box ${isActive ? 'active' : ''}`}>
        <div className="diamond-content">System<br/>Automatically:</div>
      </div>

      {/* Step Branches */}
      <div className="flow-row" style={{ marginTop: 20 }}>
        <div className="flow-column">
          <FlowCard 
            step="Step 1" 
            title="Closes All" 
            status="Chargers" 
            icon={Icons.Charger} 
            color="#ef4444" 
            isActive={isActive} 
          />
        </div>
        <div className="flow-column">
          <FlowCard 
            step="Step 2" 
            title="Cancels Future" 
            status="Bookings" 
            icon={Icons.Booking} 
            color="#ef4444" 
            isActive={isActive} 
          />
        </div>
        <div className="flow-column">
          <FlowCard 
            step="Step 3" 
            title="Sends" 
            status="Notifications" 
            icon={Icons.Notification} 
            color="#3b82f6" 
            isActive={isActive} 
          />
        </div>
      </div>

      <Arrow isActive={isActive} color="#10b981" />
      
      {/* Final Status Bubble */}
      <div className="status-bubble" style={{ 
        opacity: isActive ? 1 : 0.3,
        background: isActive ? '#f0fdf4' : '#f3f4f6',
        borderColor: isActive ? '#bcf0da' : '#e5e7eb',
        color: isActive ? '#059669' : '#9ca3af'
      }}>
        <Icons.Check size={18} color={isActive ? "#059669" : "#9ca3af"} /> Station Now Closed for Maintenance
      </div>

      <div className="flow-arrow down" style={{ borderLeft: '2px dashed #ddd', height: 40 }}></div>

      {/* What Happens Next Section */}
      <div className="flow-card" style={{ width: 280, justifyContent: 'center', borderColor: '#3b82f6' }}>
        <Icons.Info size={20} color="#3b82f6" />
        <div className="card-info" style={{ textAlign: 'center' }}>
          <h4 style={{ color: '#111' }}>What Happens Next?</h4>
        </div>
      </div>

      <div className="flow-row" style={{ marginTop: 24, gap: 20 }}>
        <div className="flow-column">
          <h5 style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Can users charge?</h5>
          <div className="flow-card active" style={{ width: 180, borderColor: '#fee2e2', background: '#fef2f2' }}>
            <Icons.Blocked size={18} color="#ef4444" />
            <div className="card-info"><h4 style={{ color: '#b91c1c' }}>NO - Blocked</h4></div>
          </div>
        </div>
        <div className="flow-column">
          <h5 style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Can users book slots?</h5>
          <div className="flow-card active" style={{ width: 180, borderColor: '#fee2e2', background: '#fef2f2' }}>
            <Icons.Blocked size={18} color="#ef4444" />
            <div className="card-info"><h4 style={{ color: '#b91c1c' }}>NO - Blocked</h4></div>
          </div>
        </div>
        <div className="flow-column">
          <h5 style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Charger sends status?</h5>
          <div className="flow-card active" style={{ width: 180, borderColor: '#f3f4f6', background: '#fff' }}>
            <Icons.Offline size={18} color="#6b7280" />
            <div className="card-info"><h4 style={{ color: '#111' }}>charger Offline</h4></div>
          </div>
        </div>
      </div>
    </div>
  );
}
