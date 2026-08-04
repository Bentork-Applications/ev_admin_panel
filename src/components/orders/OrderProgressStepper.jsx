import React from "react";
import { ShoppingBag, ShieldCheck, Box, Truck, MapPin, CheckCircle } from "lucide-react";

export const OrderProgressStepper = React.memo(({ currentStatus, orderId }) => {
  const status = (orderId ? localStorage.getItem(`order_status_${orderId}`) : null) || currentStatus;

  const stages = [
    { key: "sales_registered", label: "Order Placed", desc: "Order details registered in sales", icon: ShoppingBag },
    { key: "in_production", label: "Confirmed", desc: "Production confirmed & active", icon: ShieldCheck },
    { key: "production_complete", label: "Packed", desc: "Manufacturing complete & packed", icon: Box },
    { key: "scm_complete", label: "Shipped", desc: "SCM verified & ready for transport", icon: Truck },
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

  return (
    <div className="vertical-stepper">
      {stages.map((stage, idx) => {
        const isPassed = idx < currentIndex;
        const isActive = idx === currentIndex;
        const IconComponent = stage.icon;

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
              <div className="vertical-step-label">{stage.label}</div>
              <div className="vertical-step-desc">
                {stage.key === "delivered" && status === "delivered"
                  ? `Delivered on ${localStorage.getItem(`order_delivered_date_${orderId}`) ? new Date(localStorage.getItem(`order_delivered_date_${orderId}`)).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
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
