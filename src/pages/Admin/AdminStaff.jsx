import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StaffSummaryCards from "../../components/card/StaffSummaryCards";
import plusIcon from "../../assets/icons/stafficon/plus.svg";
import editIcon from "../../assets/icons/stafficon/edit.svg";
import deleteIcon from "../../assets/icons/stafficon/delete.png";
import AddStaffForm from "./form/AddStaffForm"; 
import StaffEditForm from "./form/staffedit"; // ✅ Import StaffEditForm

const LoadingSpinner = () => 
  <div style={{ textAlign: 'center', padding: '50px' }}>
    Loading...
  </div>;

const ErrorDisplay = ({ message }) => 
  <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
    {message}
  </div>;

const roleStyles = {
  Admin: { background: "#FECACA", color: "#B91C1C" },
  Manager: { background: "#BFDBFE", color: "#1D4ED8" },
  Staff: { background: "#E5E7EB", color: "#374151" },
  DEFAULT: { background: "#F3F4F6", color: "#4B5563" },
};

function AdminStaff({ baseUrl }) {
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    const fetchAllStaffData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
        const endpoints = {
          totalAdmin: "/admin/total",
          totalDealer: "/dealer/total",
          recrds: "/admin/alladmin",
        };

        const [
          adminRes, dealerRes, recoardsRes
        ] = await Promise.all([
          fetch(baseUrl + endpoints.totalAdmin, { headers }),
          fetch(baseUrl + endpoints.totalDealer, { headers }),
          fetch(baseUrl + endpoints.recrds, { headers }),
        ]);

        for (const res of [adminRes, dealerRes, recoardsRes]) {
            if (!res.ok) {
              throw new Error(`Network request failed: ${res.statusText}`);
            }
        }

        const cardsData = {
          totalAdmin : await adminRes.json(),
          totalDealer : await dealerRes.json(),
        };
        const records = await recoardsRes.json();
        
        setSummaryStats(cardsData);
        setStaffData(records);

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

    fetchAllStaffData();
  }, [baseUrl, navigate]);


  // ✅ Delete function
  const handleDelete = async (staffId) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) {
      return;
    }
    
    const deleteEndpoint = `${baseUrl}/user/delete/${staffId}`;
    const token = localStorage.getItem("token");
    
    try {
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete staff member.");
      }
      
      setStaffData((prev) => prev.filter((staff) => staff.id !== staffId));
      alert("Staff member deleted successfully.");

    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message);
    }
  };

  const openEditForm = (staff) => {
    setEditingStaff(staff);
    setIsFormOpen('edit');
  };

  const closeForm = () => {
    setIsFormOpen(null);
    setEditingStaff(null);
  };

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
            Staff Management
          </h2>

          {/* ✅ Add Staff Button */}
          <button
            style={{
              width: "154px",
              height: "48px",
              borderRadius: "18px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "#1E1E1E", // Black
              color: "#fff",
              fontFamily: "Roboto, sans-serif",
              fontWeight: 600,
              fontSize: "12px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setIsFormOpen("add")}
          >
            <img
              src={plusIcon}
              alt="Add"
              style={{ width: "24px", height: "24px" }}
            />
            <span>Add Staff</span>
          </button>
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#4B5563",
            marginBottom: "32px",
          }}
        >
          Manage staff & their roles
        </p>

        {/* ✅ Cards Section */}
        <StaffSummaryCards stats={{admins: summaryStats.totalAdmin, managers: summaryStats.totalDealer}} />

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
          <h3 style={{ marginBottom: "16px", fontWeight: "bold" }}>
            Staff Directory
          </h3>
          <p
            style={{
              marginBottom: "16px",
              color: "#6B7280",
              fontSize: "14px",
            }}
          >
            View and manage staff members and their permissions
          </p>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search"
            style={{
              width: "95%",
              padding: "12px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              marginBottom: "16px",
              outline: "none",
              fontFamily: "Inter, sans-serif", // ✅ Inner Inter
            }}
          />

          {/* Table */}
          {loading ? <LoadingSpinner /> : error ? <ErrorDisplay message={error} /> 
          : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead style={{ fontFamily: "Inter, sans-serif" }}>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                <th style={{ padding: "12px" }}>Name</th>
                <th style={{ padding: "12px" }}>Role</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px" }}>Last Login</th>
                <th style={{ padding: "12px" }}>Action</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: "Inter, sans-serif" }}>
              {staffData.map((staff) => {

                const style = roleStyles[staff.role] || roleStyles.DEFAULT;
                return(
                <tr
                  key={staff.id}
                  style={{ borderBottom: "1px solid #F3F4F6" }}
                >
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <span style={{ fontWeight: 500 }}>{staff.name}</span>
                      <span
                        style={{ fontSize: "12px", color: "#6B7280" }}
                      >
                        {staff.email}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background: style.background,
                        color: style.color,
                        padding: "7px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {staff.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{staff.status}</td>
                  <td style={{ padding: "12px" }}>{staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : 'N/A'}</td>
                  <td
                    style={{
                      padding: "12px",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      onClick={() => setIsFormOpen(staff)} // ✅ Edit opens StaffEditForm
                    >
                      <img
                        src={editIcon}
                        alt="Edit"
                        style={{
                          width: "20px",
                          height: "20px",
                        }}
                      />
                    </button>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      onClick={() => handleDelete(staff.id)} // ✅ Delete action
                    >
                      <img
                        src={deleteIcon}
                        alt="Delete"
                        style={{ width: "20px", height: "20px" }}
                      />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          )}
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
            {isFormOpen === "add" && <AddStaffForm onClose={closeForm} />}
            {isFormOpen === "edit" && <StaffEditForm staff={editingStaff} onClose={closeForm} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStaff;
