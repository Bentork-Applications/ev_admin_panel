import React, { useState } from "react";

export default function DealerProfile() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

    return (
        <div className="profile-container">
            <style>
                {`
            .profile-container {
                padding: 20px;
                font-family: 'Lexend', sans-serif;
            }
            .profile-card {
                background: white;
                border-radius: 24px;
                padding: 40px;
                max-width: 600px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .profile-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 30px;
            }
            .avatar-placeholder {
                width: 80px;
                height: 80px;
                background: #111;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                font-weight: 700;
            }
            .field-group {
                margin-bottom: 20px;
            }
            .field-label {
                display: block;
                font-size: 14px;
                color: #666;
                margin-bottom: 8px;
            }
            .field-value {
                font-size: 16px;
                font-weight: 500;
                padding: 12px;
                background: #f9f9f9;
                border-radius: 8px;
                border: 1px solid #eee;
            }
            .edit-input {
                width: 100%;
                padding: 12px;
                font-size: 16px;
                border-radius: 8px;
                border: 1px solid #ddd;
                outline: none;
            }
            .btn-group {
                display: flex;
                gap: 12px;
                margin-top: 30px;
            }
            .primary-btn {
                background: #111;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 30px;
                cursor: pointer;
                font-weight: 600;
            }
            .secondary-btn {
                background: white;
                color: #111;
                border: 1px solid #ddd;
                padding: 12px 24px;
                border-radius: 30px;
                cursor: pointer;
                font-weight: 600;
            }
        `}
            </style>

            <h1 className="page-title">MY PROFILE</h1>

            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar-placeholder">
                        {user.name ? user.name.charAt(0).toUpperCase() : "D"}
                    </div>
                    <div>
                        <h2 style={{ margin: 0 }}>{user.name || "Dealer Name"}</h2>
                        <p style={{ color: '#666', margin: '4px 0' }}>Dealer Account</p>
                    </div>
                </div>

                <div className="field-group">
                    <span className="field-label">Full Name</span>
                    <div className="field-value">{user.name || "N/A"}</div>
                </div>

                <div className="field-group">
                    <span className="field-label">Email Address</span>
                    <div className="field-value">{user.email || "N/A"}</div>
                    <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Email cannot be changed — contact admin.</p>
                </div>

                <div className="field-group">
                    <span className="field-label">Account_ID</span>
                    <div className="field-value">{user.id || "DEALER-001"}</div>
                </div>

            </div>
        </div>
    );
}
