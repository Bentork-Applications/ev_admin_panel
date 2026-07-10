package com.bentork.ev_system.dto.request;

public class AssignOrderDTO {
    
    private Long assignToUserId;
    private String adminNotes;

    // Getters and Setters

    public Long getAssignToUserId() {
        return assignToUserId;
    }

    public void setAssignToUserId(Long assignToUserId) {
        this.assignToUserId = assignToUserId;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }
}
