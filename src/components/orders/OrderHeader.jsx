import React from "react";
import { RefreshCw, Plus } from "lucide-react";

export const OrderHeader = React.memo(({
  isSalesAdmin,
  isProductionAdmin,
  isScmAdmin,
  isSuperAdmin,
  isAdministrator,
  loading,
  onRefresh,
  onCreateOrderClick
}) => {
  return (
    <div className="orders-header">
      <div>
        <h1 className="page-heading">
          {isSalesAdmin && "Sales Admin — Complete Order History"}
          {isProductionAdmin && "Production Admin — Complete Order History"}
          {isScmAdmin && "SCM Admin — Complete Order History"}
          {(isAdministrator || isSuperAdmin) && "Order Management (Complete Order History)"}
        </h1>
        <p className="page-subheading">
          {isSalesAdmin && "View complete order history. Create new orders and edit orders currently in Sales stage."}
          {isProductionAdmin && "View complete order history. Monitor manufacturing pipeline and transition Production status."}
          {isScmAdmin && "View complete order history. Fill barcode/warranty details and dispatch completed orders."}
          {(isAdministrator || isSuperAdmin) && "Full view and management of system order history across all pipeline stages."}
        </p>
      </div>

      <div className="header-actions">
        <button className="refresh-btn" onClick={onRefresh} title="Refresh orders">
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>

        {(isSalesAdmin || isAdministrator) && (
          <button className="primary-action-btn" onClick={onCreateOrderClick}>
            <Plus size={18} />
            <span>Create Order</span>
          </button>
        )}
      </div>
    </div>
  );
});

OrderHeader.displayName = "OrderHeader";
