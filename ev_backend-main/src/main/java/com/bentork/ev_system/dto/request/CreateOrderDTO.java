package com.bentork.ev_system.dto.request;

public class CreateOrderDTO {

    private Long assignToUserId;
    private String title;
    private String description;
    private String priority = "medium"; // low, medium, high, urgent
    private String adminNotes;

    // Getters and Setters

    public Long getAssignToUserId() {
        return assignToUserId;
    }

    public void setAssignToUserId(Long assignToUserId) {
        this.assignToUserId = assignToUserId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }
}
