import React from "react";
import { ShoppingBag, ShieldCheck, Box, Truck, MapPin, CheckCircle } from "lucide-react";

export const OrderProgressStepper = React.memo(({ currentStatus, orderId, selectedOrder }) => {
  const status = selectedOrder?.orderStatus || selectedOrder?.productionStatus || currentStatus || (orderId ? localStorage.getItem(`order_status_${orderId}`) : null) || "sales_registered";
  const id = selectedOrder?.id || orderId;

  const stages = [
    { key: "sales_registered", label: "Order Placed", desc: "Order details registered in sales", icon: ShoppingBag },
    { key: "in_production", label: "Confirmed", desc: "Production confirmed & active", icon: ShieldCheck },
    { key: "production_complete", label: "Packed", desc: "Manufacturing complete & packed", icon: Box },
    { key: "scm_complete", label: "Shipped", desc: "SCM verified & barcode assigned", icon: Truck },
    { key: "dispatched", label: "Out For Delivery", desc: "In transit with courier partner", icon: MapPin },
    { key: "delivered", label: "Delivered ✅", desc: "Successfully delivered to customer", icon: CheckCircle },
  ];

  const getStageIndex = (st) => {
    switch (st?.toLowerCase()) {
      case "sales_registered": return 0;
      case "in_production": return 1;
      case "production_complete": return 2;
      case "scm_complete": return 3;
      case "dispatched": return 4;
      case "delivered": return 5;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(status);

  const getStageTimestamp = (key) => {
    if (!selectedOrder) return null;
    let dStr = null;

    if (Array.isArray(selectedOrder.statusHistory) && selectedOrder.statusHistory.length > 0) {
      const matchedEvent = selectedOrder.statusHistory.find(
        (h) => (h.status === key || h.stage?.toLowerCase()?.includes(key.replace("_", " ")) || (key === "sales_registered" && h.title?.includes("Registered")) || (key === "dispatched" && h.title?.includes("Dispatched")))
      );
      if (matchedEvent && matchedEvent.timestamp) {
        dStr = matchedEvent.timestamp;
      }
    }

    if (!dStr) {
      if (key === "sales_registered") dStr = selectedOrder.createdAt || selectedOrder.createdDate;
      else if (key === "in_production") dStr = selectedOrder.productionStartedAt || (currentIndex >= 1 ? (selectedOrder.updatedAt || selectedOrder.createdAt) : null);
      else if (key === "production_complete") dStr = selectedOrder.productionCompletedAt || (currentIndex >= 2 ? selectedOrder.updatedAt : null);
      else if (key === "scm_complete") dStr = selectedOrder.scmCompletedAt || (currentIndex >= 3 ? selectedOrder.updatedAt : null);
      else if (key === "dispatched") dStr = selectedOrder.dispatchedAt || (currentIndex >= 4 ? selectedOrder.updatedAt : null);
      else if (key === "delivered") dStr = selectedOrder.deliveredAt || (id ? localStorage.getItem(`order_delivered_date_${id}`) : null) || (currentIndex >= 5 ? selectedOrder.updatedAt : null);
    }

    if (!dStr) return null;
    try {
      return new Date(dStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <div className="vertical-stepper">
      {stages.map((stage, idx) => {
        const isPassed = idx < currentIndex;
        const isActive = idx === currentIndex;
        const IconComponent = stage.icon;
        const ts = getStageTimestamp(stage.key);

        let statusClass = "pending";
        if (isPassed) statusClass = "passed";
        else if (isActive) statusClass = "active";

        return (
          <div key={stage.key} className={`vertical-step-item ${statusClass}`}>
            <div className="vertical-step-left">
              <div className="vertical-step-circle">
                <IconComponent size={14} />
              </div>
              {idx < stages.length - 1 && (
                <div className={`vertical-step-line ${isPassed ? "passed" : ""}`} />
              )}
            </div>
            <div className="vertical-step-right">
              <div className="vertical-step-label">
                {stage.label}
                {ts && <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748B", marginLeft: "8px" }}>({ts})</span>}
              </div>
              <div className="vertical-step-desc">
                {stage.key === "delivered" && status === "delivered" && ts
                  ? `Delivered on ${ts}`
                  : stage.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

OrderProgressStepper.displayName = "OrderProgressStepper";
