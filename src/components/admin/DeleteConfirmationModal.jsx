import React, { useEffect } from "react";

export default function DeleteConfirmationModal({ onClose, onConfirm, itemName, isLoading }) {
  // ✅ Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ✅ Close on outside click
  const handleOverlayClick = (e) => {
    if (e.target.id === "delete-overlay") {
      onClose();
    }
  };

  return (
    <>
      <style>
        {`
          .delete-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            font-family: 'Roboto', sans-serif;
          }
          .delete-modal {
            background: #fff;
            border-radius: 20px;
            padding: 32px;
            width: 400px;
            box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            animation: modalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .delete-icon-container {
            width: 64px;
            height: 64px;
            background-color: #FEF2F2;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            color: #EF4444;
          }
          .delete-title {
            font-weight: 700;
            font-size: 22px;
            margin: 0 0 10px 0;
            color: #111827;
          }
          .delete-desc {
            font-size: 15px;
            color: #6B7280;
            margin-bottom: 28px;
            line-height: 1.5;
          }
          .delete-actions {
            display: flex;
            gap: 12px;
            width: 100%;
          }
          .modal-btn {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }
          .modal-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .btn-modal-cancel {
            background-color: #F3F4F6;
            color: #4B5563;
          }
          .btn-modal-cancel:hover:not(:disabled) {
            background-color: #E5E7EB;
          }
          .btn-modal-delete {
            background-color: #EF4444;
            color: white;
          }
          .btn-modal-delete:hover:not(:disabled) {
            background-color: #DC2626;
            transform: translateY(-1px);
          }
        `}
      </style>
      <div id="delete-overlay" className="delete-overlay" onClick={handleOverlayClick}>
        <div className="delete-modal">
          <div className="delete-icon-container">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>

          <h2 className="delete-title">Delete Charger</h2>

          <p className="delete-desc">
            Are you sure you want to delete <strong>{itemName || "this charger"}</strong>? This action cannot be undone.
          </p>

          <div className="delete-actions">
            <button 
              className="modal-btn btn-modal-cancel" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="modal-btn btn-modal-delete" 
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
