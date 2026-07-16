import React, { useState } from "react";

// ── Floating Label Input ───────────────────────────────────────────────────────
function FloatingInput({ label, as = 'input', children, ...props }) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value && props.value !== '';

  const isFloated = focused || hasValue;

  const labelStyle = {
    position: 'absolute',
    left: '14px',
    color: focused ? '#27C786' : '#9CA3AF',
    pointerEvents: 'none',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    backgroundColor: 'white',
    padding: '0 4px',
    top: isFloated ? '-8px' : '50%',
    transform: isFloated ? 'translateY(0)' : 'translateY(-50%)',
    fontSize: isFloated ? '11px' : '14px',
    fontWeight: isFloated ? '600' : '400',
    zIndex: 1,
  };

  const baseInputStyle = {
    width: '100%',
    height: '48px',
    padding: '14px 14px',
    fontSize: '14px',
    border: focused ? '1.5px solid #27C786' : '1.5px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: "'Lexend', sans-serif",
    color: '#111827',
    background: props.disabled ? '#F9FAFB' : '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: focused ? '0 0 0 3px rgba(39,199,134,0.12)' : 'none',
    cursor: props.disabled ? 'not-allowed' : 'text',
  };

  const selectStyle = {
    ...baseInputStyle,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.2em 1.2em',
    paddingRight: '36px',
  };

  const Element = as;

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor={props.name} style={labelStyle}>{label}</label>
      <Element
        id={props.name}
        {...props}
        style={as === 'select' ? selectStyle : baseInputStyle}
        onFocus={(e) => { setFocused(true); if (props.onFocus) props.onFocus(e); }}
        onBlur={(e) => { setFocused(false); if (props.onBlur) props.onBlur(e); }}
      >
        {children}
      </Element>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ onBack, onSubmit, isSubmitting, label = 'Register Card' }) {
  return (
    <div style={{
      padding: '16px 32px',
      borderTop: '1px solid #F3F4F6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#FAFAFA',
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          color: '#6B7280',
          fontFamily: "'Lexend', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 0',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#111827'}
        onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          backgroundColor: isSubmitting ? '#374151' : '#111827',
          color: 'white',
          border: 'none',
          borderRadius: '9999px',
          padding: '11px 28px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontFamily: "'Lexend', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(17,24,39,0.2)',
          opacity: isSubmitting ? 0.75 : 1,
        }}
        onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.background = '#374151'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
        onMouseLeave={e => { e.currentTarget.style.background = isSubmitting ? '#374151' : '#111827'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {isSubmitting ? (
          <>
            <span style={{
              width: '14px', height: '14px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'rc-spin 0.75s linear infinite',
            }} />
            Processing...
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {label}
          </>
        )}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function RegisterCard({ onClose, onCardRegistered, baseUrl, application }) {
  const isFromApplication = !!application;

  const [formData, setFormData] = useState({
    id: application?.userId || application?.user?.id || "",
    name: application?.fullName || application?.user?.name || "",
    email: application?.email || application?.user?.email || "",
    contact: application?.mobile || application?.user?.mobile || "",
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
    if (!formData.cardId) {
      alert("Please enter the Card ID / RFID Tag.");
      return;
    }
    if (!isFromApplication && (!formData.name || !formData.email)) {
      alert("Please fill in the Name and Email fields.");
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

    try {
      if (isFromApplication) {
        // ── APPROVE APPLICATION FLOW ──
        const approveRes = await fetch(`${baseUrl}/rfid-applications/${application.id}/approve`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cardNumber: formData.cardId }),
        });

        if (!approveRes.ok) {
          const err = await approveRes.json().catch(() => ({}));
          throw new Error(err.message || "Failed to approve the application.");
        }

        const approvedAppData = await approveRes.json();
        const cardId = approvedAppData?.assignedCard?.id;

        if (cardId) {
          // Immediately set the card status to Inactive (false) to keep it Inactive by default
          await fetch(`${baseUrl}/rfid-card/${cardId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ active: false }),
          });
        }

        // Send user notification
        const userId = formData.id || application?.userId || application?.user?.id;
        if (userId) {
          await fetch(`${baseUrl}/notifications/user/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: "RFID Card Approved! 🎉",
              message: `Your RFID card request has been approved. Your Card Tag ID is: ${formData.cardId}. It will be dispatched to your address shortly.`,
              type: "RFID",
            }),
          });
        }

        alert("Application approved and card assigned successfully!");
      } else {
        // ── MANUAL REGISTER FLOW ──
        const payload = {
          cardNumber: formData.cardId,
          userId: formData.id,
        };

        const response = await fetch(`${baseUrl}/rfid-card/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to register the card.");
        }

        alert("Card registered successfully!");
      }

      onCardRegistered();

    } catch (err) {
      console.error("Error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      width: '540px',
      maxWidth: '95vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff',
      fontFamily: "'Lexend', sans-serif",
      borderRadius: '20px',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes rc-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 0' }}>
        {/* Icon + Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '12px',
            background: 'rgba(39,199,134,0.08)',
            border: '1px solid rgba(39,199,134,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27C786" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
              {isFromApplication ? 'Process Card Request' : 'Register RFID Card'}
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '3px 0 0', fontWeight: '500' }}>
              {isFromApplication
                ? `Approving request from ${formData.name || 'user'} — assign a unique Card ID`
                : 'Link a new RFID card to a user account'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#F3F4F6', margin: '20px 0 0' }} />
      </div>

      {/* ── Application Banner ─────────────────────────────────────────────── */}
      {isFromApplication && (
        <div style={{
          margin: '16px 32px 0',
          padding: '12px 16px',
          background: '#FFFBEB',
          borderRadius: '10px',
          border: '1px solid #FDE68A',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', margin: '0 0 2px' }}>Shipping Address</p>
            <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>{application.address || '—'}</p>
          </div>
        </div>
      )}

      {/* ── Form Fields ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Email + Get Details (manual flow) */}
          {!isFromApplication && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <FloatingInput
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <button
                onClick={handleGetDetails}
                disabled={isFetchingDetails}
                style={{
                  height: '48px',
                  padding: '0 18px',
                  backgroundColor: '#F9FAFB',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isFetchingDetails ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isFetchingDetails ? 0.6 : 1,
                  fontFamily: "'Lexend', sans-serif",
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!isFetchingDetails) { e.currentTarget.style.borderColor = '#27C786'; e.currentTarget.style.color = '#27C786'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
              >
                {isFetchingDetails ? (
                  <>
                    <span style={{
                      width: '12px', height: '12px',
                      border: '2px solid #D1D5DB', borderTopColor: '#6B7280',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'rc-spin 0.75s linear infinite',
                    }} />
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Get Details
                  </>
                )}
              </button>
            </div>
          )}

          {/* Email (read-only, from application) */}
          {isFromApplication && (
            <FloatingInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled
            />
          )}

          <FloatingInput
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={isFromApplication}
          />

          <FloatingInput
            label="Contact Number"
            name="contact"
            type="tel"
            value={formData.contact}
            onChange={handleChange}
            disabled={isFromApplication}
          />

          {/* Card ID field — highlighted */}
          <div style={{
            padding: '16px',
            background: 'rgba(39,199,134,0.04)',
            border: '1.5px dashed rgba(39,199,134,0.4)',
            borderRadius: '12px',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#27C786', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Card Assignment
            </p>
            <FloatingInput
              label="Card ID / RFID Tag"
              name="cardId"
              value={formData.cardId}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Footer
        onBack={onClose}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        label={isFromApplication ? 'Approve & Assign Card' : 'Register Card'}
      />
    </div>
  );
}

export default RegisterCard;
