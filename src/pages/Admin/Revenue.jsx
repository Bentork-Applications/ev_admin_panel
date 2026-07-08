import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StaffEditForm from "./form/staffedit";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import SessionTable from "../../components/admin/SessionTable";
import SearchBar from "../../components/admin/SearchBar";
import RevenueChart from "../../components/admin/RevenueChart";

const LoadingSpinner = () => (
  <div className="loading-spinner">
    Loading...
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-display">
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
    { title: "Total Revenue", value: `₹${isDealer ? calculatedStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (summaryStats.totalRevenue?.toLocaleString('en-IN') || '0')}` },
    { title: "Pending Revenue", value: `₹${isDealer ? calculatedStats.pendingRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (summaryStats.pendingRevenue?.toLocaleString('en-IN') || '0')}` },
    { title: "Total Transactions", value: isDealer ? calculatedStats.totalTransactions : (summaryStats.totalTransactions || '0') },
    { title: "Success Rate", value: `${isDealer ? calculatedStats.successRate : (summaryStats.successRate || '0')}%` },
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="revenue-container">
      <style>{`
        .loading-spinner { text-align: center; padding: 100px; font-size: 18px; color: #666; }
        .error-display { text-align: center; padding: 100px; color: #ef4444; font-size: 16px; }
        .revenue-container { width: 100%; min-height: 100vh; font-family: 'Lexend', sans-serif; background: #F1F1F1; }
        .revenue-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .revenue-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .revenue-title { font-size: 32px; font-weight: bold; margin: 0; }
        .revenue-subtitle { font-size: 14px; color: #4B5563; margin-bottom: 32px; }
        .cards-container { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .card-box { flex: 1; min-width: 240px; display: flex; align-items: center; justify-content: space-between; border-radius: 14px; padding: 16px 24px; background: white; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card-title { font-size: 14px; color: #6B7280; font-weight: 500; }
        .card-value { font-size: 24px; font-weight: 700; color: #111827; }
        .card-icon { width: 24px; height: 24px; opacity: 0.8; }
        
        .controls-section { background: white; padding: 20px 24px; border-radius: 14px; border: 1px solid #e5e7eb; margin-bottom: 24px; }
        .filters-grid { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
        .filter-item { display: flex; flex-direction: column; gap: 6px; }
        .filter-label { font-size: 13px; font-weight: 600; color: #374151; }
        .filter-select { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; min-width: 180px; outline: none; background: #fff; cursor: pointer; font-family: inherit; }
        .filter-select:focus { border-color: #6366f1; }
        
        .export-btn { background: #111827; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-left: auto; align-self: flex-end; }
        .export-btn:hover { background: #374151; }
        
        .monthly-summary { display: flex; gap: 16px; overflow-x: auto; padding: 4px 4px 16px; margin-bottom: 8px; }
        .month-card { background: white; border: 1px solid #e5e7eb; padding: 16px 20px; border-radius: 12px; min-width: 170px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s; }
        .month-card:hover { border-color: #6366f1; }
        .month-card.selected { border-color: #6366f1; background-color: #f5f3ff; }
        .month-name { font-size: 12px; color: #6B7280; font-weight: 600; text-transform: uppercase; }
        .month-value { font-size: 20px; font-weight: 700; color: #111827; }
        .month-card.selected .month-value { color: #4f46e5; }

        .table-container { background: #fff; border-radius: 14px; padding: 24px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
      `}</style>

      <div className="revenue-content">
        <div className="revenue-header">
          <h2 className="revenue-title">Revenue Analytics</h2>
        </div>
        <p className="revenue-subtitle">Track and analyze charging station performance</p>

        {/* Overview Cards */}
        <div className="cards-container">
          {cards.map((card, index) => (
            <div className="card-box" key={index}>
              <div className="card-content">
                <span className="card-title">{card.title}</span>
                <span className="card-value">{card.value}</span>
              </div>
              <img src={VectorIcon} alt="" className="card-icon" />
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

export default RevenuePage;





