import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Icons for Dashboard Cards
const TotalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const TodayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const ActiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const CancelledIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const AvailableIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const LoadingSkeleton = () => (
  <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
    {[...Array(5)].map((_, i) => (
      <div key={i} style={{ height: "60px", background: "#f3f4f6", borderRadius: "12px", animation: "pulse 1.5s infinite" }} />
    ))}
  </div>
);

export default function SlotBookings({ baseUrl }) {
  const navigate = useNavigate();
  
  // Data State
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [availableSlotsCount, setAvailableSlotsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStation, setFilterStation] = useState("ALL");
  const [filterCharger, setFilterCharger] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Parallel Fetching Logic
  useEffect(() => {
    const fetchGlobalData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }

      try {
        // 1. Fetch Stations
        const stRes = await fetch(`${baseUrl}/stations/all`, { headers: { Authorization: `Bearer ${token}` } });
        const stData = await stRes.json();
        const validStations = Array.isArray(stData) ? stData : [];
        setStations(validStations);

        // 2. Fetch Chargers
        const chRes = await fetch(`${baseUrl}/chargers/all`, { headers: { Authorization: `Bearer ${token}` } });
        const chData = await chRes.json();
        const validChargers = Array.isArray(chData) ? chData : [];
        setChargers(validChargers);

        // 3. Fetch Bookings dynamically across all stations using parallel Promise.all
        if (validStations.length > 0) {
          const bookingPromises = validStations.map(st =>
            fetch(`${baseUrl}/slot-bookings/station/${st.id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data : [])
              .catch(() => [])
          );
          
          const bookingsResults = await Promise.all(bookingPromises);
          
          let combinedBookings = [];
          bookingsResults.forEach(res => {
            combinedBookings = combinedBookings.concat(res);
          });
          
          // Sort newest first
          combinedBookings.sort((a, b) => (b.id || b._id) - (a.id || a._id));
          setAllBookings(combinedBookings);
        }

        // 4. Fetch Available Slots globally
        if (validChargers.length > 0) {
          const slotsPromises = validChargers.map(ch => 
            fetch(`${baseUrl}/slots/charger/${ch.id}/available`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data.length : 0)
              .catch(() => 0)
          );
          const slotsResults = await Promise.all(slotsPromises);
          const totalAvail = slotsResults.reduce((sum, count) => sum + count, 0);
          setAvailableSlotsCount(totalAvail);
        }

      } catch (err) {
        console.error("Error fetching global slot data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGlobalData();
  }, [baseUrl, navigate, refreshKey]);

  // Analytics Computation
  const stats = useMemo(() => {
    let todayCount = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    
    const todayStr = new Date().toISOString().split('T')[0];

    allBookings.forEach(b => {
      if (b.bookingDate === todayStr || (b.booking_time && b.booking_time.startsWith(todayStr))) {
        todayCount++;
      }
      const status = (b.status || "BOOKED").toUpperCase();
      if (status === "BOOKED") activeCount++;
      if (status === "CANCELLED") cancelledCount++;
    });

    return {
      total: allBookings.length,
      today: todayCount,
      active: activeCount,
      cancelled: cancelledCount,
      available: availableSlotsCount
    };
  }, [allBookings, availableSlotsCount]);

  // Filtering Logic
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      // Search by Booking ID or User ID
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const idMatch = (b.id || b._id || "").toString().includes(term);
        const userMatch = (b.user_id || b.userId || b.User_id || "").toString().toLowerCase().includes(term);
        if (!idMatch && !userMatch) return false;
      }

      // Station filter
      const stId = (b.station_id || b.stationId || "").toString();
      if (filterStation !== "ALL" && stId !== filterStation) return false;

      // Charger filter
      const chId = (b.charger_id || b.chargerId || "").toString();
      if (filterCharger !== "ALL" && chId !== filterCharger) return false;

      // Status filter
      const status = (b.status || "BOOKED").toUpperCase();
      if (filterStatus !== "ALL" && status !== filterStatus) return false;

      // Date filter
      if (filterDate) {
        const bDate = b.bookingDate || (b.booking_time ? b.booking_time.split(' ')[0] : "");
        if (bDate !== filterDate) return false;
      }

      return true;
    });
  }, [allBookings, searchTerm, filterStation, filterCharger, filterStatus, filterDate]);

  // Reset pagination when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStation, filterCharger, filterStatus, filterDate]);

  // Pagination Logic
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredBookings.length / rowsPerPage);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/slot-bookings/${bookingId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
        if (selectedBooking && (selectedBooking.id || selectedBooking._id) === bookingId) {
            setSelectedBooking(null); // close modal if cancelling the one currently viewing
        }
      } else {
        const err = await res.text();
        alert(`Failed to cancel booking: ${err}`);
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return { date: "—", time: "—", full: "—" };
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return { date: dtStr, time: "", full: dtStr };
      
      // Format date as DD/MM/YYYY
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dateFormatted = `${day}/${month}/${year}`;
      
      // Format time as HH:MM AM/PM
      const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      return { date: dateFormatted, time: timeFormatted, full: `${dateFormatted} ${timeFormatted}` };
    } catch {
      return { date: dtStr, time: "", full: dtStr };
    }
  };

  const formatSlotTiming = (b) => {
    const start = b.slotStartTime || b.slot_start_time;
    const end = b.slotEndTime || b.slot_end_time;
    
    if (start && end) {
      const startFmt = formatDateTime(start);
      const endFmt = formatDateTime(end);
      return {
        date: startFmt.date,
        time: startFmt.time,
        duration: `${startFmt.time} – ${endFmt.time}`
      };
    }
    
    // Fallback to bookingTime or bookingDate
    const bkTime = b.bookingTime || b.booking_time;
    if (bkTime) {
      const bkFmt = formatDateTime(bkTime);
      return {
        date: bkFmt.date,
        time: bkFmt.time,
        duration: bkFmt.time
      };
    }
    
    return { date: "—", time: "—", duration: "—" };
  };

  const getStationName = (id) => {
    const s = stations.find(st => st.id.toString() === id?.toString());
    return s ? s.name : "N/A";
  };

  const formatStatus = (status) => {
      const s = (status || "BOOKED").toUpperCase();
      if (s === "BOOKED") return { label: "Booked", class: "badge-booked" };
      if (s === "CANCELLED") return { label: "Cancelled", class: "badge-cancelled" };
      if (s === "COMPLETED") return { label: "Completed", class: "badge-completed" };
      return { label: s, class: "badge-default" };
  };

  return (
    <div className="slot-booking-container">
      <style>
        {`
          .slot-booking-container { padding: 24px; font-family: 'Lexend', sans-serif; background-color: #F8F9FA; min-height: 100vh; }
          .page-header { margin-bottom: 24px; }
          .page-title { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
          .page-subtitle { font-size: 14px; color: #6B7280; margin: 0; }

          /* Analytics Cards */
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
          .stat-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #E5E7EB; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; }
          .stat-info { display: flex; flex-direction: column; gap: 4px; }
          .stat-label { font-size: 13px; color: #6B7280; font-weight: 500; }
          .stat-value { font-size: 24px; font-weight: 700; color: #111827; }
          .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

          /* Filters Area */
          .controls-section { background: #fff; padding: 20px 24px; border-radius: 16px; border: 1px solid #E5E7EB; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
          .filter-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
          .filter-label { font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
          .filter-input, .filter-select { padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: #F9FAFB; }
          .filter-input:focus, .filter-select:focus { border-color: #4F46E5; background: #fff; }

          /* Table */
          .table-container { background: #fff; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow-x: auto; }
          .data-table { width: 100%; border-collapse: separate; border-spacing: 0; }
          .data-table th { text-align: left; padding: 16px 20px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E5E7EB; }
          .data-table td { padding: 16px 20px; font-size: 14px; color: #111827; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
          .data-table tr { transition: background 0.2s; }
          .data-table tr:hover td { background: #F9FAFB; }

          /* Badges */
          .badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
          .badge-booked { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
          .badge-cancelled { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
          .badge-completed { background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; }
          .badge-default { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }

          /* Actions */
          .btn-view { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; background: #fff; border: 1.5px solid #E5E7EB; color: #374151; cursor: pointer; transition: all 0.2s; }
          .btn-view:hover { border-color: #4F46E5; color: #4F46E5; }
          .btn-cancel { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; background: #FEF2F2; border: 1.5px solid #FECACA; color: #DC2626; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: #DC2626; color: #fff; }

          /* Pagination */
          .pagination-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid #E5E7EB; background: #fff; border-radius: 0 0 16px 16px; }
          .page-info { font-size: 13px; color: #6B7280; }
          .page-controls { display: flex; gap: 8px; align-items: center; }
          .page-btn { padding: 8px 12px; border: 1.5px solid #E5E7EB; border-radius: 8px; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; color: #374151; display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
          .page-btn:hover:not(:disabled) { background: #F3F4F6; }
          .page-btn.active { background: #111827; color: #fff; border-color: #111827; }
          .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          /* Modal */
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .modal-content { background: #fff; border-radius: 24px; width: 100%; max-width: 500px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
          .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 16px; }
          .modal-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
          .modal-close { background: none; border: none; font-size: 24px; color: #6B7280; cursor: pointer; padding: 0; }
          .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .modal-field { display: flex; flex-direction: column; gap: 4px; }
          .modal-label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; }
          .modal-value { font-size: 15px; font-weight: 500; color: #111827; }
          .modal-footer { display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #E5E7EB; padding-top: 24px; }
          
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        `}
      </style>

      <div className="page-header">
        <h2 className="page-title">Slot Booking Management</h2>
        <p className="page-subtitle">Dynamically monitor and manage user slot reservations across all stations.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-icon" style={{ background: '#EEF2FF' }}><TotalIcon /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Today's Bookings</span>
            <span className="stat-value">{stats.today}</span>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5' }}><TodayIcon /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Active Slots</span>
            <span className="stat-value">{stats.active}</span>
          </div>
          <div className="stat-icon" style={{ background: '#FFFBEB' }}><ActiveIcon /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Cancelled Bookings</span>
            <span className="stat-value">{stats.cancelled}</span>
          </div>
          <div className="stat-icon" style={{ background: '#FEF2F2' }}><CancelledIcon /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Available Slots</span>
            <span className="stat-value">{stats.available}</span>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF' }}><AvailableIcon /></div>
        </div>
      </div>

      <div className="controls-section">
        <div className="filter-group" style={{ flex: 1.5 }}>
          <label className="filter-label">Search Booking / User</label>
          <input 
            type="text" 
            className="filter-input" 
            placeholder="Search ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Date</label>
          <input 
            type="date" 
            className="filter-input" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Station</label>
          <select className="filter-select" value={filterStation} onChange={(e) => setFilterStation(e.target.value)}>
            <option value="ALL">All Stations</option>
            {stations.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <LoadingSkeleton />
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: "0 auto 16px", opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3 style={{ margin: "0 0 8px 0", color: "#374151" }}>No Bookings Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Station</th>
                  <th>Charger/Slot</th>
                  <th>Booking Date</th>
                  <th>Slot Time</th>
                  <th>Booking Duration</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.map(b => {
                  const statusInfo = formatStatus(b.status);
                  const stName = getStationName(b.station_id || b.stationId);
                  const timingInfo = formatSlotTiming(b);
                  
                  return (
                    <tr key={b.id || b._id}>
                      <td style={{ fontWeight: 600 }}>#{b.id || b._id}</td>
                      <td>{b.user_id || b.userId || b.User_id || "N/A"}</td>
                      <td>{stName}</td>
                      <td>
                        <div style={{ fontSize: '13px' }}>Chg: <strong style={{ color: '#4F46E5' }}>{b.charger_id || b.chargerId || "N/A"}</strong></div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Slot: {b.slot_id || b.slotId || "N/A"}</div>
                      </td>
                      <td>{timingInfo.date}</td>
                      <td>{timingInfo.time}</td>
                      <td>{timingInfo.duration}</td>
                      <td>
                        <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn-view" onClick={() => setSelectedBooking(b)}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination-wrapper">
                <div className="page-info">
                  Showing <strong>{indexOfFirst + 1}</strong> to <strong>{Math.min(indexOfLast, filteredBookings.length)}</strong> of <strong>{filteredBookings.length}</strong> bookings
                </div>
                <div className="page-controls">
                  <button className="page-btn" onClick={() => setCurrentPage(c => c - 1)} disabled={currentPage === 1}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Prev
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    if (i === 0 || i === totalPages - 1 || Math.abs(currentPage - 1 - i) <= 1) {
                      return (
                        <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>
                          {i + 1}
                        </button>
                      );
                    } else if (Math.abs(currentPage - 1 - i) === 2) {
                      return <span key={i} style={{ color: '#9CA3AF' }}>...</span>;
                    }
                    return null;
                  })}

                  <button className="page-btn" onClick={() => setCurrentPage(c => c + 1)} disabled={currentPage === totalPages}>
                    Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Booking Details #{selectedBooking.id || selectedBooking._id}</h3>
              <button className="modal-close" onClick={() => setSelectedBooking(null)}>&times;</button>
            </div>
            
            <div className="modal-grid">
              <div className="modal-field">
                <span className="modal-label">User ID</span>
                <span className="modal-value">{selectedBooking.user_id || selectedBooking.userId || selectedBooking.User_id || "N/A"}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Station Name</span>
                <span className="modal-value">{getStationName(selectedBooking.station_id || selectedBooking.stationId)}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Charger ID</span>
                <span className="modal-value">{selectedBooking.charger_id || selectedBooking.chargerId || "N/A"}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Slot ID</span>
                <span className="modal-value">{selectedBooking.slot_id || selectedBooking.slotId || "N/A"}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Booking Date</span>
                <span className="modal-value">{formatSlotTiming(selectedBooking).date}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Slot Time</span>
                <span className="modal-value">{formatSlotTiming(selectedBooking).time}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Booking Duration</span>
                <span className="modal-value">{formatSlotTiming(selectedBooking).duration}</span>
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <span className="modal-label">Created At</span>
                <span className="modal-value">
                  {formatDateTime(selectedBooking.bookingTime || selectedBooking.booking_time).full}
                </span>
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <span className="modal-label">Payment Status</span>
                <span className="modal-value" style={{ color: '#059669', fontWeight: 600 }}>Paid (Wallet)</span>
              </div>
            </div>

            <div className="modal-field" style={{ marginBottom: '24px', gridColumn: 'span 2' }}>
                <span className="modal-label">Current Status</span>
                <div style={{ marginTop: '8px' }}>
                    <span className={`badge ${formatStatus(selectedBooking.status).class}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
                        {formatStatus(selectedBooking.status).label}
                    </span>
                </div>
            </div>

            <div className="modal-footer">
              <button className="btn-view" onClick={() => setSelectedBooking(null)}>Close</button>
              {(selectedBooking.status || "BOOKED").toUpperCase() === "BOOKED" && (
                <button className="btn-cancel" onClick={() => handleCancelBooking(selectedBooking.id || selectedBooking._id)}>
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
