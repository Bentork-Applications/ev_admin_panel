import React from "react";
import { useNavigate } from "react-router-dom";

export default function MaintenanceDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .dashboard-container {
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
          background: #1e1e1e;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .card-box {
          flex: 1;
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #eee;
          height: 110px;
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
          padding: 14px;
          text-align: left;
          font-size: 14px;
        }

        .records-table thead {
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }

        .status-badge {
          background: #ffd6df;
          color: #d6002a;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }

        .detail-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background: #fff;
          cursor: pointer;
        }
      `}</style>

      <div className="dashboard-container">

        <div className="top-header">
          <h2 style={{ fontSize: "26px", fontWeight: "700" }}>
            Emergency & Maintenance
          </h2>

          <button
            className="maint-btn"
            onClick={() => navigate("/dashboard/maintenance")}
          >
            Maintenance
          </button>
        </div>

        {/* TOP CARDS */}
        <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          {[
            { title: "Active", value: 14 },
            { title: "Scheduled Today", value: 1 },
            { title: "In Progress", value: 1 },
            { title: "Completed This Week", value: 3 },
          ].map((card) => (
            <div key={card.title} className="card-box">
              <p style={{ fontSize: "14px", opacity: 0.7 }}>{card.title}</p>
              <h3 style={{ fontSize: "28px", marginTop: "10px" }}>
                {card.value}
              </h3>
            </div>
          ))}
        </div>

        {/* GRAPH SECTION */}
        <div
          style={{
            background: "#fff",
            height: "320px",
            borderRadius: "12px",
            marginTop: "20px",
            border: "1px solid #eee",
            padding: "20px",
          }}
        >
          <p style={{ fontSize: "14px", opacity: 0.7 }}>Graphical Overview</p>
          <p style={{ fontSize: "12px" }}>Real-time monitoring data</p>
        </div>

        {/* RECORDS */}
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "20px", fontSize: "18px" }}>Records</h3>

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
              {[1, 2, 3, 4].map((row) => (
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
    </>
  );
}
