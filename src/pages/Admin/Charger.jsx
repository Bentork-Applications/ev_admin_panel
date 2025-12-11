import React, { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import StaffSummaryCards from "../../components/card/StaffSummaryCards";
import plusIcon from "../../assets/icons/stafficon/plus.svg";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import SessionTable from "../../components/admin/SessionTable";
// import AddCharger from "./form/AddCharger"; // ✅ Correct import (not SessionPage)
// import DirectoryTable from "../../components/admin/DirectoryTable";
import ChargerSearchBar from "../../components/admin/ChargerSearchBar";

const AddCharger = lazy(() => import('./form/AddCharger'));

const LoadingSpinner = () => {
  return (
    <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#555" }}>
      Loading data...
    </div>
  );
}

const Model = ({children, onClose}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
};

function Charger({baseUrl}) {
  const navigate = useNavigate();
  const [chargerData, setChargerData] = useState({
    totalData:"",
    availableData:"",
    acChargerData:"",
    dcChargerData:""
  });
  const [chargerRecoards, setChargerRecoards] = useState({});
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [loading , setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setChargerData({
        totalData:'...',
        availableData:'...',
        acChargerData:'...',
        dcChargerData:'...'
      });
      setChargerRecoards([]);

      const token = localStorage.getItem('token')
      if(!token){
        console.error('Token not found, redirecting to login')
        navigate('/')
        return;
      }

      const headers = {
        'Authorization' : `Bearer ${token}`,
        'Content-Type' : 'application/json'
      }

      try {

        const endpoints = {
          total: '/chargers/total',
          available: '/chargers/available',
          acCharger: '/chargers/ac',
          dcCharger: '/chargers/dc',
          allRecoards: '/chargers/all'
        }

        const [totalRes, availableRes, acChargerRes, dcChargerRes, allRecordsRes] = await Promise.all([
          fetch(baseUrl + endpoints.total, {headers}),
          fetch(baseUrl + endpoints.available, {headers}),
          fetch(baseUrl + endpoints.acCharger, {headers}),
          fetch(baseUrl + endpoints.dcCharger, {headers}),
          fetch(baseUrl + endpoints.allRecoards, {headers})
        ]);

        for(const res of [totalRes, availableRes, acChargerRes, dcChargerRes]){
          if(res.status === 401 || res.status === 403){
            throw new Error('Authentication Failed, Please login again')
          }
          if(!res.ok){
            throw new Error('Network request failed',res.statusText)
          }
        }

        const [totalData, availableData, acChargerData, dcChargerData, allRecordsData] = await Promise.all([
          totalRes.text(),
          availableRes.text(),
          acChargerRes.text(),
          dcChargerRes.text(),
          allRecordsRes.json()
        ]);

        setChargerData({totalData, availableData, acChargerData, dcChargerData});
        setChargerRecoards(allRecordsData);

      } catch (error) {
        console.error('Failed to fetch charger data',error)

        if(error.message.includes('Authentication failed')){
          console.error('Authentication error, navigating to login',error)
          localStorage.removeItem('token');
          navigate('/')
          return;
        }

        setChargerData({
        totalData:'Error',
        availableData:'Error',
        acChargerData:'Error',
        dcChargerData:'Error'
      });
      setChargerRecoards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [baseUrl, navigate, refreshKey]);

  const handleChargerAdded = () => {
    setIsModelOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
  }

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if(!token){
        console.error('Token not found, redirecting to login')
        navigate('/')
        return;
      }

      const headers = {
        'Authorization' : `Bearer ${token}`,
        'Content-Type' : 'application/json'
      }

      try {

        const endpoints = {
          total: '/chargers/total',
          available: '/chargers/available',
          acCharger: '/chargers/ac',
          dcCharger: '/chargers/dc',
          allRecoards: '/chargers/all'
        }

        const [totalRes, availableRes, acChargerRes, dcChargerRes] = await Promise.all([
          fetch(baseUrl + endpoints.total, {headers}),
          fetch(baseUrl + endpoints.available, {headers}),
          fetch(baseUrl + endpoints.acCharger, {headers}),
          fetch(baseUrl + endpoints.dcCharger, {headers}),
          fetch(baseUrl + endpoints.allRecoards, {headers})
        ]);

        for(const res of [totalRes, availableRes, acChargerRes, dcChargerRes]){
          if(!res.ok){
            throw new Error('Network request failed',res.statusText)
          }
        }

        const totalData = totalRes.json()
        const availableData = availableRes.json()
        const acChargerData = acChargerRes.json()
        const dcChargerData = dcChargerRes.json()
        const allRecoardsData = allRecoards.json()

        setChargerData({totalData, availableData, acChargerData, dcChargerData});
        setChargerRecoards(allRecoardsData);

      } catch (error) {
        console.error('Failed to fetch charger data',error)
        if(error.message.includes('Authentication failed')){
          console.error('Authentication error, navigating to login',error)
          navigate('/')
          return;
        }
      }
    };

    fetchData();
  }, [baseUrl, navigate]);

  const cards = [
    { title: "Total Chargers", value: chargerData.totalData, value1: "+317 from last month", icon: VectorIcon },
    { title: "Available Chargers", value: chargerData.availableData, value1: "+23 from last month", icon: VectorIcon },
    { title: "AC Chargers", value: chargerData.acChargerData, value1: "+23 from last month", icon: VectorIcon },
    { title: "DC Chargers", value: chargerData.dcChargerData, value1: "+23 from last month", icon: VectorIcon },
  ];

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        fontFamily: "Roboto, sans-serif",
        background: "#F1F1F1",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              fontFamily: "Lexend, sans-serif",
              margin: 0,
              flexGrow: 1,
            }}
          >
            Charger Management
          </h2>

          {/* Add Charger Button */}
          <button
            style={{
              height: "48px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1E1E1E",
              color: "#fff",
              fontWeight: 600,
              fontSize: "12px",
              border: "none",
              cursor: "pointer",
              padding: "0 16px",
            }}
            onClick={() => setIsModelOpen(true)} // ✅ opens form
          >
            <img src={plusIcon} alt="Add" style={{ width: "24px", height: "24px", marginRight: "6px" }} />
            Add Charger
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "32px" }}>
          Manage charging stations and chargers across cities
        </p>

        {/* Cards Section */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "15px" }}>
          {cards.map((card, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                maxWidth: "230px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "14px",
                padding: "12px 20px",
                backgroundColor: "white",
                border: "0.2px solid #ddd",
                height: "90px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", fontWeight: 400 }}>{card.title}</span>
                <span style={{ fontSize: "24px", fontWeight: 600 }}>{card.value}</span>
                <span style={{ fontSize: "12px", fontWeight: 400 }}>{card.value1}</span>
              </div>
              <img src={card.icon} alt="icon" style={{ width: "22px", height: "22px" }} />
            </div>
          ))}
        </div>
        <br /><br />
{/* x */}
   <ChargerSearchBar />

   {/* <SessionTable records={chargerRecoards} /> */}
   {/* Charger Records Table */}
        <div style={{
          marginTop: "30px",
          backgroundColor: "#fff",
          borderRadius: "14px",
          padding: "18px",
          border: "0.2px solid #ddd"
        }}>
          <h3 style={{
            fontWeight: "700",
            marginBottom: "15px",
            fontSize: "18px",
            color: "#1A1A1A",
            fontFamily: "Lexend, sans-serif"
          }}>
            Chargers
          </h3>

          {loading ? (
            <LoadingSpinner />
          ) : chargerRecoards.length === 0 ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
              No chargers available.
            </p>
          ) : (
            <table style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 12px",
              fontFamily: "Roboto, sans-serif",
              fontSize: "14px",
            }}>
              <thead>
                <tr>
                  {["OCPP ID", "Station ID", "Connector Type", "Charger Type", "Rate", "Status", "Availability"].map(
                    (header, index) => (
                      <th
                        key={index}
                        style={{
                          padding: "10px 12px",
                          fontWeight: "600",
                          textAlign: "left",
                          color: "#333333",
                          fontSize: "14px",
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {chargerRecoards.map((charger) => (
                  <tr key={charger.id} style={{ backgroundColor: "#fff", borderRadius: "12px" }}>
                    <td style={{ padding: "12px" }}>{charger.ocppId}</td>
                    <td style={{ padding: "12px" }}>{charger.stationId || 'N/A'}</td>
                    <td style={{ padding: "12px" }}>{charger.connectorType}</td>
                    <td style={{ padding: "12px" }}>{charger.chargerType}</td>
                    <td style={{ padding: "12px" }}>₹{charger.rate}/kWh</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "4px 12px",
                        borderRadius: "15px",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: charger.isOccupied ? "#D32F2F" : "#2E7D32",
                        backgroundColor: charger.isOccupied ? "#FFCDD2" : "#C8E6C9",
                      }}>
                        {charger.isOccupied ? "Occupied" : "Free"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "4px 12px",
                        borderRadius: "15px",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: charger.availability ? "#2E7D32" : "#D32F2F",
                        backgroundColor: charger.availability ? "#C8E6C9" : "#FFCDD2",
                      }}>
                        {charger.availability ? "Available" : "Unavailable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ✅ Conditionally show AddCharger form */}
        {isModelOpen && (
          <Model onClose={() => setIsModelOpen(false)}>
            <Suspense fallback={<LoadingSpinner/>}>
            <AddCharger 
            onClose={() => setIsFormOpen(false)} 
            onChargerAdded={handleChargerAdded}
            baseUrl={baseUrl}
            />
            </Suspense>
          </Model>
        )}
      </div>
    </div>
  );
};

export default Charger;
