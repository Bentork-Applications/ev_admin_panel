import React from "react";
import { Search, X } from "lucide-react";

export const OrderFilterBar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  setCurrentPage
}) => {
  const hasActiveFilters = searchQuery || statusFilter || priorityFilter;

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="filter-bar">
      <div className="search-input-wrap">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by Order #, Customer, PI, Mobile, Barcode, Tracking ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="filters-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="sales_registered">Sales Registered</option>
          <option value="in_production">In Production</option>
          <option value="production_complete">Production Complete</option>
          <option value="scm_complete">SCM Complete</option>
          <option value="dispatched">Dispatched</option>
        </select>

        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#F3F4F6",
              color: "#374151",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};
