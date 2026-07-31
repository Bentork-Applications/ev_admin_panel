import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {startItem} to {endItem} of {totalItems} items
      </span>
      <div className="pagination-controls">
        <button
          className="page-nav-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="page-num">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="page-nav-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
