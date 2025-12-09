import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// import { Country, State, City } from "country-state-city";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const LOCATION_API = {
  countries: 'https://restcountries.com/v3.1/all?fields=name,cca2',
  states: 'https://countriesnow.space/api/v0.1/countries/states',
  cities: 'https://countriesnow.space/api/v0.1/countries/state/cities',
};

function MapController({ position, onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13, { animate: true });
  }, [position, map]);

  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function FloatingInput({ label, as = 'input', children, ...props }) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value && props.value !== '';
  
  const labelStyle = {
    position: 'absolute',
    left: '12px',
    color: '#6B7280',
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    padding: '0 4px',
    top: focused || hasValue ? '-8px' : '50%',
    transform: focused || hasValue ? 'translateY(0)' : 'translateY(-50%)',
    fontSize: focused || hasValue ? '12px' : '16px',
  };

  const commonInputStyle = {
    width: '100%',
    height: '46px',
    padding: '16px 12px',
    fontSize: '16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    outline: 'none',
  };

  const selectStyle = {
    ...commonInputStyle,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.7rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
  };

  const Element = as;
  
  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor={props.name} style={labelStyle}>{label}</label>
      <Element
        id={props.name}
        {...props}
        style={as === 'select' ? selectStyle : commonInputStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </Element>
    </div>
  );
}


function AddStation({ onClose, onStationAdded, baseUrl }) {
  const [formData, setFormData] = useState({
    stationName: "",
    address: "",
    country: "",
    countryName: "",
    state: "",
    stateName: "",
    city: "",
    mapLink: "",
    latitude: 20.5937,
    longitude: 78.9629,
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [mapPosition, setMapPosition] = useState([20.5937, 78.9629]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState({
    countries : true,
    states : false,
    cities : false
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // setCountries(Country.getAllCountries());
    const fetchCountries = async () => {
      try{
        const response = await fetch(LOCATION_API.countries)
        const data = await response.json()
        const sortedCountries = data.map(c => ({
          name: c.name.common,
          isoCode: c.cca2
        })).sort((a, b) => a.name.localeCompare(b.name));

        setCountries(sortedCountries)
      } catch (error) {
        console.error('Failed to load country-state-city library ',error)
        setError(false)
      } finally {
        setIsLoading(prev => ({ ...prev, countries: false }));
      }
    }

    fetchCountries()
  }, []);
  
  useEffect(() => {
    if(!formData.countryName){
      setStates([]);
      setCities([]);
      return;
    }

    const fetchStates = async () => {
      setIsLoading(prev => ({ ...prev, states:true }))
      try{
        const response = await fetch(LOCATION_API.states, {
          method : 'POST',
          headers : { 'Content-Type' : 'application/json'},
          body : JSON.stringify({ country : formData.countryName})
        })
        const data = await response.json();

        if(data.data && data.data.states){
          setStates(data.data.states.map(s => ({
            name : s.name,
            isoCode : s.state_code || s.name
          })));
        } else {
          setStates([]);
        }
      } catch (error) {
        console.error('Failed to fetch states')
        setStates([]);
      } finally {
        setIsLoading(prev => ({ ...prev, states : false}));
      }
    }
    
    fetchStates();
  }, [formData.countryName]);

  useEffect(() => {
    if(!formData.countryName || !formData.state){
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setIsLoading(prev => ({ ...prev, cities : true }));
      try{
        const response = await fetch(LOCATION_API.cities, {
          method : 'POST',
          headers : { 'Content-Type' : 'application/json' },
          body : JSON.stringify({
            country : formData.countryName,
            state : formData.stateName
          })
        });
        const data = await response.json();

        if (data.data) {
          setCities(data.data.map(city => ({ name : city })));
        } else {
          setCities([]);
        }
      } catch (error) {
        console.error('Failed to fetch cities: ', error)
        setCities([])
      } finally {
        setIsLoading(prev => ({ ...prev, cities : false}))
      }
    }

    fetchCities();
    }, [formData.countryName, formData.state]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "country") {

      const selectedCountry = countries.find(c => c.isoCode === value);
      
      setFormData({ ...formData, country: value, countryName: selectedCountry?.name || '', state: "", stateName: "", city: "" });
      
      setStates([]);
      setCities([]);
    } else if (name === "state") {
      
      const selectedState = states.find(s => s.stateCode === value || s.name === value);
      setFormData({ ...formData, state: value, stateName: value, city: "" });
      setCities([]);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleMapClick = async (latlng) => {
    const { lat, lng } = latlng;

    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      mapLink: `https://www.google.com/maps?q=${lat},${lng}`
    }));

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.address) {
        const { address } = data;
        const foundCountry = countries.find(c => c.name === address.country);
        setFormData(prev => ({
          ...prev,
          address: data.display_name.split(',').slice(0, 2).join(', '),
          city: address.city || address.town || address.village || "",
          state: address.state || "",
          country: address.country || ""
        }));
      }
    } catch (error) { console.error("Reverse geocoding failed:", error); }
  };

    const findOnMap = async () => {
      const query = [formData.city, formData.state, formData.country].filter(Boolean).join(", ");
      if (!query) {
        alert("Please select a country, state, or city to find on the map.");
        return;
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setMapPosition([parseFloat(lat), parseFloat(lon)]);
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            mapLink: `https://www.google.com/maps?q=${lat},${lon}`
          }));
        } else {
          alert("Location not found.");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        alert("Error finding location on map.");
      }
    };

  const handleSubmit = async () => {
    if (!formData.stationName || !formData.address) {
      alert("Please fill in the Station Name and Address.");
      return;
    }
    setIsSubmitting(true);
    const token = localStorage.getItem("token")
    
    try {
      const locationPayload = {
        name: formData.stationName,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        city: formData.city,
        state: formData.stateName,
      };

      const locationResponse = await fetch(`${baseUrl}/location/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(locationPayload),
      });

      if (!locationResponse.ok) {
        const err = await locationResponse.json();
        throw new Error(`Location Error: ${err.message || locationResponse.statusText}`);
      }
      const newLocation = await locationResponse.json();

      const stationPayload = {
        name: formData.stationName,
        locationId: newLocation.id,
        status: "ACTIVE",
        directionLink: formData.mapLink,
      };

      const stationResponse = await fetch(`${baseUrl}/stations/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(stationPayload),
      });

      if (!stationResponse.ok) {
        const err = await stationResponse.json();
        console.debug("Station not added, deleting location name: ",newLocation.name);
        const locationResponse = await fetch(`${baseUrl}/location/delete/${newLocation.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!locationResponse.ok) {
          const err = await locationResponse.json();
          throw new Error(`Location Error: ${err.message || locationResponse.statusText}`);
        }

        throw new Error(`Station Error: ${err.message || stationResponse.statusText}`);
      }
      
      alert("Station added successfully!");
      onStationAdded();

    } catch (err) {
      console.error("Error during submission:", err);
      alert("Submission Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading.countries) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E5E7EB',
          borderTop: '4px solid #111827',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6B7280' }}>Loading location data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', fontFamily: "'Lexend', sans-serif" }}>
      <div style={{ padding: '24px 40px 0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Add Station</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 20px' }}>
          Create a new charging station location
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>Basic Details</h4>

            <FloatingInput label="Station Name" name="stationName" value={formData.stationName} onChange={handleChange} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr', gap: '20px' }}>
              <FloatingInput label="Country" as="select" name="country" value={formData.country} onChange={handleChange}>
                <option value="" disabled></option>
                  {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}
                </option>)}
              </FloatingInput>
              <FloatingInput label={isLoading.states ? "Loading..." : "State"} as="select" name="state" value={formData.state} onChange={handleChange} disabled={!formData.country}>
                <option value="" disabled>{isLoading.states ? "Loading..." : "Select State"}</option>
                  {states.map(s => <option key={s.name} value={s.name}>{s.name}
                </option>)}
                </FloatingInput>
                <FloatingInput label={isLoading.cities ? "Loading..." : "City"} as="select" name="city" value={formData.city} onChange={handleChange} disabled={!formData.state}>
                    <option value="" disabled></option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}
                    </option>)}
                </FloatingInput>
            </div>

            <button onClick={findOnMap} style={{ 
                                                backgroundColor: '#F3F4F6', 
                                                color: '#111827', 
                                                border: '1px solid #D1D5DB', 
                                                borderRadius: '8px', 
                                                padding: '16px', 
                                                fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                Find on Map
            </button>

            <FloatingInput label="Address Line 1" name="address" value={formData.address} onChange={handleChange} />
              <FloatingInput label="Map Link" name="mapLink" value={formData.mapLink} onChange={handleChange} readOnly />
            </div>

          {/* Right Side: Map */}
          <div style={{ paddingTop: '40px' }}>
                <MapContainer center={mapPosition} zoom={5} style={{ height: "100%", minHeight: '390px', borderRadius: "16px", border: '1px solid #E5E7EB', zIndex: 0 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
                    <Marker position={[formData.latitude, formData.longitude]} />
                    <MapController position={mapPosition} onMapClick={handleMapClick} />
                </MapContainer>
            </div>
        </div>
      </div>
      <Footer onBack={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}


function Footer({ onBack, onSubmit, isSubmitting }) {
  return (
    <div style={{ padding: '16px 40px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>
        Back
      </button>
      <button 
        onClick={onSubmit} 
        disabled={isSubmitting}
        style={{
          backgroundColor: '#111827', color: 'white',
          border: 'none', borderRadius: '9999px',
          padding: '12px 24px', fontSize: '16px',
          fontWeight: '500', cursor: 'pointer',
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
export default AddStation;