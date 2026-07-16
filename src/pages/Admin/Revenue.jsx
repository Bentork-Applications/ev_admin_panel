import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StaffEditForm from "./form/staffedit";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import SessionTable from "../../components/admin/SessionTable";
import SearchBar from "../../components/admin/SearchBar";
import RevenueChart from "../../components/admin/RevenueChart";

const RevenueSkeleton = () => (
  <div className="revenue-container">
    <style>{`
      @keyframes rev-shimmer-anim {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .rev-skeleton-shimmer {
        background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
        background-size: 200% 100%;
        animation: rev-shimmer-anim 1.5s infinite linear;
        height: 16px;
        border-radius: 4px;
      }
      .revenue-container { width: 100%; min-height: 100vh; font-family: 'Lexend', sans-serif; background: #F9FAFB; }
      .revenue-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .cards-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px; }
      @media (max-width: 1024px) { .cards-container { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 600px) { .cards-container { grid-template-columns: 1fr; } }
      .card-box { background: white; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 140px; box-sizing: border-box; border: 1px solid #E5E7EB; }
      .controls-section { background: white; padding: 20px 24px; border-radius: 14px; border: 1px solid #e5e7eb; margin-bottom: 24px; }
    `}</style>
    <div className="revenue-content">
      <div style={{ marginBottom: "28px" }}>
        <div className="rev-skeleton-shimmer" style={{ width: "220px", height: "28px" }} />
        <div className="rev-skeleton-shimmer" style={{ width: "350px", height: "14px", marginTop: "8px" }} />
      </div>

      <div className="cards-container">
        {[...Array(4)].map((_, idx) => (
          <div className="card-box" key={idx}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <div className="rev-skeleton-shimmer" style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
              <div className="rev-skeleton-shimmer" style={{ width: "80px", height: "14px" }} />
            </div>
            <div className="rev-skeleton-shimmer" style={{ width: "120px", height: "24px", marginTop: "12px" }} />
          </div>
        ))}
      </div>

      <div className="controls-section" style={{ height: "88px" }}>
        <div style={{ display: "flex", gap: "20px" }}>
          <div className="rev-skeleton-shimmer" style={{ width: "180px", height: "40px", borderRadius: "8px" }} />
          <div className="rev-skeleton-shimmer" style={{ width: "180px", height: "40px", borderRadius: "8px" }} />
          <div className="rev-skeleton-shimmer" style={{ width: "180px", height: "40px", borderRadius: "8px" }} />
        </div>
      </div>

      <div className="revenue-chart-card" style={{ height: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="rev-skeleton-shimmer" style={{ width: "200px", height: "20px" }} />
          <div className="rev-skeleton-shimmer" style={{ width: "120px", height: "20px" }} />
        </div>
        <div className="rev-skeleton-shimmer" style={{ width: "100%", height: "200px" }} />
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-display" style={{ textAlign: "center", padding: "100px", color: "#ef4444", fontSize: "16px", fontFamily: "Lexend, sans-serif" }}>
    {message}
  </div>
);

const RevenuePage = ({ baseUrl, userRole }) => {
  const navigate = useNavigate();
  const isDealer = userRole === "DEALER";
  const [summaryStats, setSummaryStats] = useState({});
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(null);

  // Cascading Filter States
  const [dealers, setDealers] = useState([]);
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedDealer, setSelectedDealer] = useState("All");
  const [selectedStation, setSelectedStation] = useState("All");
  const [selectedCharger, setSelectedCharger] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const fetchData = async (endpoint) => {
        try {
          const res = await fetch(baseUrl + endpoint, { headers });
          if (!res.ok) return null;
          return await res.json();
        } catch (err) {
          console.error(`Fetch error for ${endpoint}:`, err);
          return null;
        }
      };

      try {
        if (isDealer) {
          const [totalRev, records, dealerStations, dealerChargers] = await Promise.all([
            fetchData("/dealer/revenue/total"),
            fetchData("/dealer/revenue"),
            fetchData("/dealer/stations"),
            fetchData("/dealer/chargers")
          ]);

          setSummaryStats({
            totalRevenue: totalRev || 0,
            pendingRevenue: 0,
            totalTransactions: Array.isArray(records) ? records.length : 0,
            successRate: 100
          });
          setRevenueRecords(Array.isArray(records) ? records : []);
          setStations(Array.isArray(dealerStations) ? dealerStations : []);
          setChargers(Array.isArray(dealerChargers) ? dealerChargers : []);
          setDealers([]); // Not needed for dealer
        } else {
          const [
            totalRev, pendingRev, transCount, sRate,
            records, allDealers, allStations, allChargers, allAssignments
          ] = await Promise.all([
            fetchData("/revenue/total"),
            fetchData("/revenue/pending"),
            fetchData("/revenue/transactions/total"),
            fetchData("/revenue/success-rate"),
            fetchData("/revenue/all"),
            fetchData("/admin/alladmin"),
            fetchData("/stations/all"),
            fetchData("/chargers/all"),
            fetchData("/dealer-stations")
          ]);

          setSummaryStats({
            totalRevenue: totalRev || 0,
            pendingRevenue: pendingRev || 0,
            totalTransactions: transCount || 0,
            successRate: sRate || 0
          });

          setRevenueRecords(Array.isArray(records) ? records : []);
          setDealers(Array.isArray(allDealers) ? allDealers.filter(d => d.role?.toUpperCase() === "DEALER") : []);
          setStations(Array.isArray(allStations) ? allStations : []);
          setChargers(Array.isArray(allChargers) ? allChargers : []);
          setAssignments(Array.isArray(allAssignments) ? allAssignments : []);
        }
      } catch (err) {
        console.error("Critical error in fetchAllData:", err);
        setError("Failed to load revenue data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [baseUrl, navigate, isDealer]);

  // Cascading Filter Options
  const stationOptions = useMemo(() => {
    if (selectedDealer === "All") return stations;
    const assignedIds = (assignments || [])
      .filter(a => a.dealerId?.toString() === selectedDealer.toString())
      .map(a => a.stationId);
    return (stations || []).filter(s => assignedIds.includes(s.id));
  }, [selectedDealer, stations, assignments]);

  const chargerOptions = useMemo(() => {
    if (!chargers) return [];

    if (selectedStation !== "All") {
      return chargers.filter(c => c.stationId?.toString() === selectedStation.toString());
    }

    if (selectedDealer !== "All") {
      const allowedStationIds = (stationOptions || []).map(s => s.id);
      return chargers.filter(c => allowedStationIds.includes(c.stationId));
    }

    return chargers;
  }, [selectedDealer, selectedStation, chargers, stationOptions]);

  // Revenue Filtering Logic
  const filteredRecords = useMemo(() => {
    const validStationIds = isDealer && stations ? stations.map(s => s.id?.toString()) : null;

    return (revenueRecords || []).filter(r => {
      // 0. Dealer's Assigned Station Filter
      if (isDealer && validStationIds && !validStationIds.includes(r.stationId?.toString())) {
        return false;
      }

      // 1. Charger Filter
      if (selectedCharger !== "All" && r.chargerId?.toString() !== selectedCharger.toString()) return false;

      // 2. Station Filter
      if (selectedStation !== "All" && r.stationId?.toString() !== selectedStation.toString()) return false;

      // 3. Dealer Filter
      if (!isDealer && selectedDealer !== "All") {
        const stationAssignment = (assignments || []).find(a => a.stationId === r.stationId);
        if (!stationAssignment || stationAssignment.dealerId?.toString() !== selectedDealer.toString()) return false;
      }

      return true;
    });
  }, [revenueRecords, selectedCharger, selectedStation, selectedDealer, assignments, isDealer, stations]);

  const calculatedStats = useMemo(() => {
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let successCount = 0;
    
    filteredRecords.forEach(r => {
      if (r.paymentStatus === 'success') {
        totalRevenue += (parseFloat(r.amount) || 0);
        successCount++;
      } else if (r.paymentStatus === 'pending') {
        pendingRevenue += (parseFloat(r.amount) || 0);
      }
    });

    const successRate = filteredRecords.length > 0 ? Math.round((successCount / filteredRecords.length) * 100) : 0;

    return {
      totalRevenue,
      pendingRevenue,
      totalTransactions: filteredRecords.length,
      successRate
    };
  }, [filteredRecords]);

  // Monthly Revenue for Chart
  const monthlyRevenue = useMemo(() => {
    return filteredRecords.reduce((acc, record) => {
      if (record.paymentStatus !== "success" || !record.createdAt) return acc;
      const date = new Date(record.createdAt);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[monthYear] = (acc[monthYear] || 0) + (parseFloat(record.amount) || 0);
      return acc;
    }, {});
  }, [filteredRecords]);

  // Final Table Data (filtered by selected month card)
  const displayRecords = useMemo(() => {
    let records = filteredRecords.filter(r => {
      if (!selectedMonth) return true;
      if (!r.createdAt) return false;
      const date = new Date(r.createdAt);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      return monthYear === selectedMonth;
    });

    return [...records].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });
  }, [filteredRecords, selectedMonth]);

  const exportToCSV = () => {
    const headers = ["Session ID,User ID,Charger ID,Station ID,Amount,Payment Method,Transaction ID,Status,Created At"];
    const rows = displayRecords.map(row =>
      `${row.sessionId},${row.userId},${row.chargerId},${row.stationId},${row.amount},${row.paymentMethod},${row.transactionId},${row.paymentStatus},${row.createdAt}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    let filename = `revenue_export_${selectedDealer}_${selectedStation}_${selectedCharger}`;
    link.setAttribute("download", `${filename.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cards = [
    {
      title: "Total Revenue",
      value: `₹${isDealer ? calculatedStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (summaryStats.totalRevenue?.toLocaleString('en-IN') || '0')}`,
      color: "#10b981",
      trend: "+18% growth",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      title: "Pending Revenue",
      value: `₹${isDealer ? calculatedStats.pendingRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (summaryStats.pendingRevenue?.toLocaleString('en-IN') || '0')}`,
      color: "#f59e0b",
      trend: "Awaiting settlement",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      title: "Total Transactions",
      value: isDealer ? calculatedStats.totalTransactions : (summaryStats.totalTransactions || '0'),
      color: "#3b82f6",
      trend: "Completed orders",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      title: "Success Rate",
      value: `${isDealer ? calculatedStats.successRate : (summaryStats.successRate || '0')}%`,
      color: "#8b5cf6",
      trend: "Payment success",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    },
  ];
  if (loading) return <RevenueSkeleton />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="revenue-container">
      <style>{`
        .revenue-container {
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          background-color: #F9FAFB;
          animation: revenue-fadeInPage 400ms ease-out forwards;
        }
        .revenue-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        .revenue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .revenue-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #111827;
        }
        .revenue-subtitle {
          font-size: 13px;
          color: #6B7280;
          margin: 4px 0 0 0;
        }
        
        .cards-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 28px;
        }
        @media (max-width: 1024px) {
          .cards-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .cards-container {
            grid-template-columns: 1fr;
          }
        }

        .card-box {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 140px;
          box-sizing: border-box;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .card-box:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #10b981;
        }
        .card-title {
          font-size: 13px;
          color: #6B7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .card-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .controls-section {
          background: white;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          margin-bottom: 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .filters-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        .filter-select {
          height: 40px;
          padding: 0 12px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          cursor: pointer;
          font-family: inherit;
          color: #374151;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .filter-select:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .export-btn {
          height: 40px;
          background: #111827;
          color: white;
          border: none;
          padding: 0 24px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: auto;
          align-self: flex-end;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .export-btn:hover {
          background: #374151;
          transform: translateY(-1px);
        }

        .monthly-summary {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 4px 4px 16px;
          margin-bottom: 8px;
        }
        .month-card {
          background: white;
          border: 1px solid #E5E7EB;
          padding: 16px 20px;
          border-radius: 12px;
          min-width: 170px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .month-card:hover {
          border-color: #10B981;
          background-color: #F0FDF4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .month-card.selected {
          border-color: #10B981;
          background-color: #ECFDF5;
        }
        .month-name {
          font-size: 11px;
          color: #6B7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .month-value {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        .month-card.selected .month-value {
          color: #059669;
        }

        .table-container {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-top: 24px;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        @keyframes revenue-fadeInPage {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Revenue Chart Card hover animation */
        .revenue-chart-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .revenue-chart-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
        }
      `}</style>

      <div className="revenue-content">
        <div className="revenue-header">
          <div>
            <h2 className="revenue-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>💰</span> Revenue Analytics
            </h2>
            <p className="revenue-subtitle">Monitor revenue performance, trends, and financial insights</p>
          </div>

          {/* Right Side UI Tabs */}
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: "8px", padding: "2px", gap: "2px" }}>
            {["Today", "This Week", "This Month", "This Year"].map((tab) => {
              const active = tab === "This Month";
              return (
                <button
                  key={tab}
                  style={{
                    border: "none",
                    background: active ? "#fff" : "transparent",
                    color: active ? "#111827" : "#6B7280",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="cards-container">
          {cards.map((card, index) => (
            <div className="card-box" key={index}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `${card.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="card-title">{card.title}</span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", fontWeight: 500 }}>{card.trend}</span>
                  </div>
                </div>
                <div style={{ color: "#9CA3AF", fontSize: "14px", fontWeight: "bold" }}>↗</div>
              </div>
              <span className="card-value" style={{ marginTop: "12px", paddingLeft: "4px", display: "block" }}>
                <AnimatedNumber value={card.value} />
              </span>
            </div>
          ))}
        </div>

        {/* Cascading Filters */}
        <div className="controls-section">
          <div className="filters-grid">
            {!isDealer && (
              <div className="filter-item">
                <span className="filter-label">Dealer</span>
                <select
                  className="filter-select"
                  value={selectedDealer}
                  onChange={(e) => {
                    setSelectedDealer(e.target.value);
                    setSelectedStation("All");
                    setSelectedCharger("All");
                    setSelectedMonth(null);
                  }}
                >
                  <option value="All">All Dealers</option>
                  {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            <div className="filter-item">
              <span className="filter-label">Station</span>
              <select
                className="filter-select"
                value={selectedStation}
                onChange={(e) => {
                  setSelectedStation(e.target.value);
                  setSelectedCharger("All");
                  setSelectedMonth(null);
                }}
              >
                <option value="All">All Stations</option>
                {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name || `Station ${s.id}`}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <span className="filter-label">Charger (OCPP ID)</span>
              <select
                className="filter-select"
                value={selectedCharger}
                onChange={(e) => {
                  setSelectedCharger(e.target.value);
                  setSelectedMonth(null);
                }}
              >
                <option value="All">
                  {selectedStation !== "All" && chargerOptions.length === 0
                    ? "No Chargers Found"
                    : "All Chargers"}
                </option>
                {chargerOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.ocppId}
                  </option>
                ))}
              </select>
            </div>

            <button className="export-btn" onClick={exportToCSV}>
              Export Data
            </button>
          </div>
        </div>

        {/* Monthly Breakdown */}
        {Object.keys(monthlyRevenue).length > 0 && (
          <div className="monthly-summary">
            {Object.entries(monthlyRevenue).map(([month, amount]) => (
              <div
                className={`month-card ${selectedMonth === month ? 'selected' : ''}`}
                key={month}
                onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
              >
                <span className="month-name">{month}</span>
                <span className="month-value">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}

        {/* Revenue Overview Chart */}
        <RevenueChart
          monthlyRevenue={monthlyRevenue}
          selectedMonth={selectedMonth}
          onMonthClick={(month) => setSelectedMonth(prev => prev === month ? null : month)}
        />

        {/* Transactions Table */}
        <div className="table-container">
          <SessionTable records={displayRecords} />
        </div>

        {isFormOpen && (
          <div className="modal-overlay">
            {isFormOpen === "add" ? (
              <div onClose={() => setIsFormOpen(null)}>Add Form Placeholder</div>
            ) : (
              <StaffEditForm onClose={() => setIsFormOpen(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Stat Card Number Count Up Animation ─────────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const numStr = value?.toString().replace(/[^\d]/g, "") || "0";
    const target = parseInt(numStr, 10) || 0;
    if (target === 0) {
      setCurrent(0);
      return;
    }
    let start = 0;
    const duration = 400; // ms
    const stepTime = Math.max(Math.floor(duration / target), 15);
    const timer = setInterval(() => {
      start += Math.ceil(target / 30);
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  if (value?.toString().includes("₹")) {
    return <>₹{current.toLocaleString("en-IN")}</>;
  }
  if (value?.toString().includes("%")) {
    return <>{current}%</>;
  }
  return <>{current.toLocaleString("en-IN")}</>;
};

export default RevenuePage;





