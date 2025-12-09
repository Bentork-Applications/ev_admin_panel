import React, { useState } from "react";

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
    padding: '23px 12px',
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
        {isSubmitting ? "Registering..." : "Register Card"}
      </button>
    </div>
  );
}

function RegisterCard({ onClose, onCardRegistered, baseUrl }){
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    contact: "",
    cardId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetDetails = async () => {
    if (!formData.email) {
      alert("Please enter an email address first.");
      return;
    }
    setIsFetchingDetails(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${baseUrl}/user/byemail/${formData.email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "User not found.");
      }

      const userData = await response.json();
      
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
        contact: userData.mobile || '',
        id: userData.id || '',
      }));

    } catch (err) {
      console.error("Error fetching user details:", err);
      alert("Error: " + err.message);
    } finally {
      setIsFetchingDetails(false);
    }
  };


  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.cardId) {
      alert("Please fill in the Name, Email, and Card ID fields.");
      return;
    }
    setIsSubmitting(true);

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Authentication error. Please log in again.");
        setIsSubmitting(false);
        onClose();
        return;
    }

    const payload = {
        cardNumber: formData.cardId,
        userId: formData.id,
    };

    try {
      const response = await fetch(`${baseUrl}/rfid-card/register`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to register the card.");
      }

      alert("Card registered successfully!");
      onCardRegistered();

    } catch (err) {
      console.error("Error registering card:", err);
      alert("Submission Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '700px', marginLeft: '250px', height: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffffff', fontFamily: "'Lexend', sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: '24px 40px 0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Register Card</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 20px' }}>
          Register a new RFID card for a user
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB' }} />
      </div>

      {/* Form Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ flex: 1 }}>
              <FloatingInput label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <button
              onClick={handleGetDetails}
              disabled={isFetchingDetails}
              style={{
                height: '46px',
                padding: '0 20px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: isFetchingDetails ? 0.6 : 1,
                marginleft: '50px',
                marginRight: '-25px',
              }}
            >
              {isFetchingDetails ? 'Fetching...' : 'Get Details'}
            </button>
          </div>

          <FloatingInput label="Full Name" name="name" value={formData.name} onChange={handleChange} />
          <FloatingInput label="Contact Number" name="contact" type="tel" value={formData.contact} onChange={handleChange} />
          <FloatingInput label="Card ID / RFID Tag" name="cardId" value={formData.cardId} onChange={handleChange} />
        </div>
      </div>

      {/* Footer with Buttons */}
      <Footer onBack={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default RegisterCard;
