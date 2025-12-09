import React from "react";
import { useNavigate } from "react-router-dom";

export default function MaintenanceDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .dashboard-container {
          display: flex;
          width: 100%;
          background: #f5f5f5;
          min-height: 100vh;
          padding: 20px;
          box-sizing: border-box;
        }
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .maint-btn {
          padding: 8px 16px;
          background: #000000ff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .card-box {
          flex: 1;
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #eee;
        }
        .records-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .records-table th, 
        .records-table td {
          padding: 12px;
          text-align: left;
        }
        .records-table thead {
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }
        .status-badge {
          background: #ffd6df;
          color: #d6002a;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        .detail-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #ccc;
          background: #fff;
          cursor: pointer;
        }
      `}</style>

      <div className="dashboard-container">
        <div style={{ flex: 1 }}>

          <div className="top-header">
            <h2 style={{ fontSize: "22px", fontWeight: "600" }}>
              Emergency & Maintenance
            </h2>

            {/* OPEN MAINTENANCE PAGE */}
            <button
              className="maint-btn"
              onClick={() => navigate("/dashboard/maintenance")}
            >
              Maintenance
            </button>
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            {[
              { title: "Active Cases", value: 14 },
              { title: "Scheduled Today", value: 1 },
              { title: "In Progress", value: 1 },
              { title: "Completed This Week", value: 3 },
            ].map((card) => (
              <div key={card.title} className="card-box">
                <p style={{ fontSize: "14px", opacity: 0.7 }}>{card.title}</p>
                <h3 style={{ fontSize: "26px", marginTop: "10px" }}>
                  {card.value}
                </h3>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#fff",
              height: "300px",
              borderRadius: "12px",
              marginTop: "20px",
              border: "1px solid #eee",
              padding: "20px",
            }}
          >
            <p style={{ fontSize: "14px", opacity: 0.7 }}>Graphical Overview</p>
            <p style={{ fontSize: "12px" }}>Real-time monitoring data</p>
          </div>

          <div style={{ marginTop: "30px" }}>
            <h3 style={{ marginBottom: "20px" }}>Records</h3>

            <table className="records-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Station</th>
                  <th>Charger</th>
                  <th>Issue</th>
                  <th>Reported</th>
                  <th>Status</th>
                  <th>Responded By</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td>S-82037173</td>
                    <td>Highway Rest A</td>
                    <td>Charger #11</td>
                    <td>Power Surge</td>
                    <td>1 hrs ago</td>
                    <td>
                      <span className="status-badge">Error</span>
                    </td>
                    <td>Emergency Team A</td>
                    <td>
                      <button className="detail-btn">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      </div>
    </>
  );
}
