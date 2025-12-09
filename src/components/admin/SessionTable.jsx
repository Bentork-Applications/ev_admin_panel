import React from "react";

export default function SessionTable({ records = [] }) {

   if (records.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
        No transaction records found.
      </p>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        margin: "20px auto",
        width: "100%",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "14px",
          color: "#111827",
        }}
      >
        <thead style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
          <tr>
            <th style={thStyle}>Session ID</th>
            <th style={thStyle}>User ID</th>
            <th style={thStyle}>Charger ID</th>
            <th style={thStyle}>Station ID</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Payment Method</th>
            <th style={thStyle}>Transaction ID</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created at</th>
          </tr>
        </thead>
        <tbody>
            {records.map((row) => {
            // NEW: Dynamic styling for the status badge
            const isCompleted = row.paymentStatus === "success";
            const isError = row.paymentStatus === "failed";
            // const statusStyle = {
            //   display: "inline-block",
            //   padding: "4px 12px",
            //   borderRadius: "9999px",
            //   fontWeight: 500,
            //   fontSize: "13px",
            //   backgroundColor: isCompleted ? "#BBDEFB" : isError ? "#fee2e2" : "#F3F4F6", // Blue, Red, or Gray
            //   color: isCompleted ? "#1976D2" : isError ? "#b91c1c" : "#333",
            // };

            return(
            <tr key={row.id}>
              <td style={tdStyle}>{row.sessionId}</td>
              <td style={tdStyle}>{row.userId}</td>
              <td style={tdStyle}>{row.chargerId}</td>
              <td style={tdStyle}>{row.stationId}</td>
              <td style={tdStyle}>{row.amount}</td>
              <td style={tdStyle}>{row.paymentMethod}</td>
              <td style={tdStyle}>{row.transactionId}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    fontWeight: 500,
                    fontSize: "13px",
                    backgroundColor: isCompleted ? "#BBDEFB" : isError ? "#fee2e2" : "#F3F4F6", // Blue, Red, or Gray
                    color: isCompleted ? "#1976D2" : isError ? "#b91c1c" : "#333",
                  }}
                >
                  {row.paymentStatus}
                </span>
              </td>
              <td style={tdStyle}>{row.createdAt ? `${new Date(row.createdAt).toLocaleDateString()}` : 'N/A'}</td>
            </tr>
            );
            })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "14px 16px",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #f3f4f6",
};
