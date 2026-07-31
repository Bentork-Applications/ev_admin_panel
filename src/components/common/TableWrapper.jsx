import React from "react";

export const TableWrapper = ({ children, className = "" }) => {
  return (
    <div className={`table-container ${className}`}>
      <div className="responsive-table-wrapper">
        {children}
      </div>
    </div>
  );
};
