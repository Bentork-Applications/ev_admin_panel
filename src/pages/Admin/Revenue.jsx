import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StaffEditForm from "./form/staffedit"; // ✅ Import StaffEditForm
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import SessionTable from "../../components/admin/SessionTable";
import SearchBar from "../../components/admin/SearchBar";

const LoadingSpinner = () => 
  <div style={{ textAlign: 'center', padding: '50px' }}>
    Loading...
  </div>;

const ErrorDisplay = ({ message }) => 
  <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
    {message}
  </div>;

const Users = ({ baseUrl }) => {
  const navigate = useNavigate();
  const [summaryStats, setSummaryStats] = useState({});
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(null); // ✅ can be "add" or "edit"

useEffect(() => {
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No token found, redirecting to login.");
        navigate("/");
        return;
    }

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

      try {
        const endpoints = {
          total: "/revenue/total",
          pending: "/revenue/pending",
          transactions: "/revenue/transactions/total",
          rate: "/revenue/success-rate",
          allRecords: "/revenue/all",
        };

        const [
          totalRes, pendingRes, transRes, rateRes, recordsRes
        ] = await Promise.all([
          fetch(baseUrl + endpoints.total, { headers }),
          fetch(baseUrl + endpoints.pending, { headers }),
          fetch(baseUrl + endpoints.transactions, { headers }),
          fetch(baseUrl + endpoints.rate, { headers }),
          fetch(baseUrl + endpoints.allRecords, { headers }),
        ]);

        for (const res of [totalRes, pendingRes, transRes, rateRes, recordsRes]) {
            if (!res.ok) {
              throw new Error(`Network request failed: ${res.statusText}`);
            }
        }

        const totalRevenue = await totalRes.json();
        const pendingRevenue = await pendingRes.json();
        const totalTransactions = await transRes.json();
        const successRate = await rateRes.json();
        const allRecords = await recordsRes.json();

        setSummaryStats({ totalRevenue, pendingRevenue, totalTransactions, successRate });
        setRevenueRecords(allRecords);

        } catch (err) {
          console.error("Error fetching Revenue data:", err);
          setError(err.message);
          if (err.message.includes('Authentication failed')) {
              localStorage.removeItem("token");
              navigate("/");
              return;
          }
      } finally {
        setLoading(false);
      }
  };
    fetchAllData();
}, [baseUrl, navigate]);

const cards = [
    { title: "Total Revenue", value: `₹${summaryStats.totalRevenue?.toLocaleString('en-IN') || '...'}` },
    { title: "Pending Revenue", value: `₹${summaryStats.pendingRevenue?.toLocaleString('en-IN') || '...'}` },
    { title: "Total Transactions", value: summaryStats.totalTransactions || '...' },
    { title: "Success Rate", value: `${summaryStats.successRate || '...'}%` },
  ];

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        fontFamily: "Roboto, sans-serif",
        background: "var(--Default-Background, #F1F1F1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        {/* ✅ Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              fontFamily: "Lexend, sans-serif",
              margin: 0,
            }}
          >
            Revenue & Transactions
          </h2>
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#4B5563",
            marginBottom: "32px",
          }}
        >
          Manage and monitor all revenue transactions
        </p>

            {/* ✅ Cards Section */}
<>
      <style>
        {`
          .cards-container {
            width: 100%;
            display: flex;
            justify-content: space-between; /* ✅ spread across full width */
            gap: 15px;
          }

          .card-box {
            flex: 1; /* ✅ each card grows equally */
            max-width: 230px; /* prevent too wide */
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 14px;
            
            padding: 12px 20px;
            background-color: white;
            border: 0.2px solid #ddd;
            height: 90px;
            font-family: Roboto, sans-serif;
          }

          .card-title {
            font-size: 19px;
            line-height: 160%;
            font-weight: 400;
          }

          .card-value {
            font-size: 24px;
            line-height: 160%;
            font-weight: 600;
          }
.card-value1 {
            font-size: 13px;
            line-height: 50%;
          padding: 12px 20px;
            
            font-weight: 200;
          }
          .card-icon {
            width: 22px;
            height: 22px;
          }
        `}
      </style>

      <div className="cards-container">
        {cards.map((card, index) => (
          <div className="card-box" key={index}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="card-title">{card.title}</span>
              <span className="card-value">{card.value}</span>
              {/* <span className="card-value1">{card.value1}</span> */}
            </div>
            <img
              src={VectorIcon}
              alt={`${card.title} icon`}
              className="card-icon"
            />
          </div>
        ))}
      </div>
    </>
      {/* Search Bar */}
          
         <br /><br />
          
          <div>
            <SearchBar />
          
          </div>


        {/* ✅ Staff Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            marginTop: "32px",
            padding: "24px",
            fontFamily: "Lexend, sans-serif", // ✅ Outer Lexend
          }}
        >
          {/* <h3 style={{ marginBottom: "16px", fontWeight: "bold" }}>
             Directory
          </h3> */}
          <p
            style={{
              marginBottom: "16px",
              color: "#6B7280",
              fontSize: "14px",
            }}
          >
            {/* View and manage staff members and their permissions */}
          </p>

        

          {/* Table */}
           <SessionTable records={revenueRecords} />
         
        </div>

        {/* ✅ Modal */}
        {isFormOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            {isFormOpen === "add" ? (
              <AddStaffForm onClose={() => setIsFormOpen(null)} />
            ) : (
              <StaffEditForm onClose={() => setIsFormOpen(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
