import React, { useState, useEffect } from "react";

export default function AddChargerForm({ onClose, onChargerAdded, baseUrl, initialData }) {   // ✅ accept onClose prop
  const getInitialFormState = () => {
    if (!initialData) {
      return {
        stationId: "",
        stationName: "",
        ocppId: "",
        connectorType: "",
        chargerType: "AC",
        chargeMode: "",
        rate: 15,
        platformFeePerKwh: 0,
        isOccupied: false,
        availability: true
      };
    }
    
    const isOccupiedVal = initialData.isOccupied === true || initialData.isOccupied === "true" || initialData.occupied === true || initialData.occupied === "true";
    const availabilityVal = initialData.availability === true || initialData.availability === "true";
    
    return {
      ...initialData,
      isOccupied: isOccupiedVal,
      availability: availabilityVal
    };
  };

  const [form, setForm] = useState(getInitialFormState);

  const [stations, setStations] = useState([]);
  const [isLoadingStation, setIsLoadingStation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStations = async () => {
      setIsLoadingStation(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication error')
        setError('Authentication Failed, please login again');
        setIsLoadingStation(false);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/stations/all`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch station data')
        }

        const data = await response.json();
        setStations(data);

      } catch (error) {
        console.error('Failed to load station', error)
        setError('Failed to load Station Data');
      } finally {
        setIsLoadingStation(false);
      }
    };

    fetchStations();
  }, [baseUrl]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'stationId') {
      const selectedStation = stations.find(s => s.id.toString() === value);
      setForm({
        ...form,
        stationId: value,
        stationName: selectedStation?.name || ''
      })
    }
    else if (type === 'checkBox') {
      setForm({ ...form, [name]: e.target.checked });
    }
    else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.stationId) {
      setError('Select a station')
      return;
    }
    if (!form.ocppId) {
      setError('enter ocppid')
      return;
    }
    if (!form.connectorType) {
      setError('select a Connector Type')
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('Authentication error')
        setError('Authentication Failed, please login again');
        setIsLoadingStation(false);
        return;
      }

      const payload = {
        stationId: form.stationId,
        ocppId: form.ocppId,
        connectorType: form.connectorType,
        chargerType: form.chargerType,
        chargeMode: form.chargeMode,
        rate: form.rate !== "" ? parseFloat(form.rate) : 0,
        platformFeePerKwh: form.platformFeePerKwh !== "" ? parseFloat(form.platformFeePerKwh) : 0,
        isOccupied: form.isOccupied,
        availability: form.availability
      }

      const isEdit = !!initialData;
      const url = isEdit ? `${baseUrl}/chargers/update/${initialData.id}` : `${baseUrl}/chargers/add`;
      const method = isEdit ? 'PUT' : 'POST';

      console.log(`${isEdit ? 'Updating' : 'Adding'} charger: `, payload);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`Failed to ${isEdit ? 'update' : 'add'} charger`);
        const errText = await response.text();
        setError(`Failed to ${isEdit ? 'Update' : 'Add'} Charger: ${errText || 'try again'}`);
        alert(`Failed to ${isEdit ? 'update' : 'add'} the charger`);
        return;
      }

      alert(`Charger ${isEdit ? 'Updated' : 'Added'} Successfully`);
      onChargerAdded();
    } catch (error) {
      console.error(`Failed to ${initialData ? 'update' : 'add'} charger`, error)
      setError(`Failed to ${initialData ? 'update' : 'add'} Charger`);
    } finally {
      setIsSubmitting(false)
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{initialData ? "Edit Charger" : "Add Charger"}</h2>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Station Name</label>
            <select
              name="stationId"
              value={form.stationId}
              onChange={handleChange}
              style={styles.select}
              disabled={isLoadingStation}
            >
              <option>
                {isLoadingStation ? 'Loading Stations...' : 'Select a Station'}
              </option>
              {stations.map(station => (
                <option key={station.id} value={station.id} >
                  {station.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>OCPP ID</label>
            <input
              type="text"
              name="ocppId"
              value={form.ocppId}
              onChange={handleChange}
              placeholder="e.g., CHARGER_001"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Connector Type</label>
            <select
              name="connectorType"
              value={form.connectorType}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="" disabled>Select Connector Type</option>
              <option value="Type-1">Type-1</option>
              <option value="Type-2">Type-2</option>
              <option value="Type-3">Type-3</option>
              <option value="Type-4">Type-4</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Charging Type</label>
            <div style={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="chargerType"
                  value="AC"
                  checked={form.chargerType === "AC"}
                  onChange={handleChange}
                />{" "}
                AC Charging
              </label>
              <label>
                <input
                  type="radio"
                  name="chargerType"
                  value="DC"
                  checked={form.chargerType === "DC"}
                  onChange={handleChange}
                />{" "}
                DC Fast Charging
              </label>
            </div>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Rate (₹ per kWh)</label>
            <input
              type="number"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              placeholder="e.g., 15"
              style={styles.input}
              min="0"
              step="0.01"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Platform Fee per kWh (₹)</label>
            <input
              type="number"
              name="platformFeePerKwh"
              value={form.platformFeePerKwh}
              onChange={handleChange}
              placeholder="e.g., 0.05"
              style={styles.input}
              min="0"
              step="0.01"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Charge Mode</label>
            <select
              name="chargeMode"
              value={form.chargeMode}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">Select Mode</option>
              <option value="Standard">Standard</option>
              <option value="Fast">Fast</option>
              <option value="Ultra Fast">Ultra Fast</option>
            </select>
          </div>
        </div>

        <div style={styles.buttons}>
          <button type="button" style={styles.dismiss} onClick={onClose} disabled={isSubmitting}> {/* ✅ close form on dismiss */}
            Dismiss
          </button>
          <button type="submit"
            style={{
              ...styles.save,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (initialData ? "Updating..." : "Adding...") : (initialData ? "Update Charger" : "Add Charger")}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    padding: "2rem",
    borderRadius: "12px",
    maxWidth: "800px",
    margin: "2rem auto",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    marginBottom: "1.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  row: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  label: {
    fontSize: "0.9rem",
    color: "#333",
    marginBottom: "5px",
  },
  input: {
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "10px",
    fontSize: "1rem",
  },
  select: {
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "10px",
    fontSize: "1rem",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sliderContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  slider: {
    flex: 1,
    cursor: "pointer",
  },
  buttons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "1rem",
  },
  dismiss: {
    padding: "10px 20px",
    borderRadius: "8px",
    background: "#ddd",
    border: "none",
    cursor: "pointer",
  },
  save: {
    padding: "10px 20px",
    borderRadius: "8px",
    background: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
};
