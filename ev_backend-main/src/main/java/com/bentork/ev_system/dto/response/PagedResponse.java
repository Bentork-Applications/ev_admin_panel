package com.bentork.ev_system.dto.response;

import java.util.List;

import lombok.Data;

/**
 * Generic paginated response wrapper.
 * Used for server-side pagination across Leads, Companies, Quotations, and Orders.
 */
@Data
public class PagedResponse<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;

    public static <T> PagedResponse<T> of(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {
        PagedResponse<T> response = new PagedResponse<>();
        response.setContent(content);
        response.setPage(page);
        response.setSize(size);
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setLast(last);
        return response;
    }
}
