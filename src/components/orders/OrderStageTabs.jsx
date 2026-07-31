import React from "react";

export const OrderStageTabs = ({ adminStageTab, setAdminStageTab, orders, setCurrentPage }) => {
  const getCount = (status) => orders.filter((o) => o.orderStatus === status).length;

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
        Sales Registered ({getCount("sales_registered")})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "PRODUCTION" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("PRODUCTION"); setCurrentPage(1); }}
      >
        In Production ({getCount("in_production")})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "PROD_DONE" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("PROD_DONE"); setCurrentPage(1); }}
      >
        Production Complete ({getCount("production_complete")})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "SCM_DONE" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("SCM_DONE"); setCurrentPage(1); }}
      >
        SCM Complete ({getCount("scm_complete")})
      </button>
      <button
        className={`tab-btn ${adminStageTab === "DISPATCHED" ? "active" : ""}`}
        onClick={() => { setAdminStageTab("DISPATCHED"); setCurrentPage(1); }}
      >
        Dispatched ({getCount("dispatched")})
      </button>
    </div>
  );
};
