import React, { useMemo } from "react";

export const OrderStageTabs = React.memo(({ adminStageTab, setAdminStageTab, orders, setCurrentPage }) => {
  const counts = useMemo(() => {
    const res = {
      sales_registered: 0,
      in_production: 0,
      production_complete: 0,
      scm_complete: 0,
      dispatched: 0,
    };
    for (let i = 0; i < orders.length; i++) {
      const st = orders[i]?.orderStatus;
      if (st && res[st] !== undefined) {
        res[st]++;
      }
    }
    return res;
  }, [orders]);

  return (
    <div className="stage-tabs-container">
      <button
        className={`tab-btn ${adminStageTab === "ALL" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("ALL"); setCurrentPage(1); }}
      >
        All Orders ({orders.length})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "SALES" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("SALES"); setCurrentPage(1); }}
      >
        Sales Registered ({counts.sales_registered})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "PRODUCTION" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("PRODUCTION"); setCurrentPage(1); }}
      >
        In Production ({counts.in_production})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "PROD_DONE" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("PROD_DONE"); setCurrentPage(1); }}
      >
        Production Complete ({counts.production_complete})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "SCM_DONE" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("SCM_DONE"); setCurrentPage(1); }}
      >
        SCM Complete ({counts.scm_complete})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "DISPATCHED" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("DISPATCHED"); setCurrentPage(1); }}
      >
        Dispatched ({counts.dispatched})
      </button>
    </div>
  );
});

OrderStageTabs.displayName = "OrderStageTabs";
