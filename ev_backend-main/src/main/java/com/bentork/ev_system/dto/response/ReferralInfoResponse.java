package com.bentork.ev_system.dto.response;

public class ReferralInfoResponse {

    private String referralCode;
    private long totalReferrals;
    private long completedReferrals;
    private long pendingReferrals;
    private int totalCoinsEarned;

    public ReferralInfoResponse() {
    }

    public ReferralInfoResponse(String referralCode, long totalReferrals,
            long completedReferrals, long pendingReferrals, int totalCoinsEarned) {
        this.referralCode = referralCode;
        this.totalReferrals = totalReferrals;
        this.completedReferrals = completedReferrals;
        this.pendingReferrals = pendingReferrals;
        this.totalCoinsEarned = totalCoinsEarned;
    }

    public String getReferralCode() {
        return referralCode;
    }

    public void setReferralCode(String referralCode) {
        this.referralCode = referralCode;
    }

    public long getTotalReferrals() {
        return totalReferrals;
    }

    public void setTotalReferrals(long totalReferrals) {
        this.totalReferrals = totalReferrals;
    }

    public long getCompletedReferrals() {
        return completedReferrals;
    }

    public void setCompletedReferrals(long completedReferrals) {
        this.completedReferrals = completedReferrals;
    }

    public long getPendingReferrals() {
        return pendingReferrals;
    }

    public void setPendingReferrals(long pendingReferrals) {
        this.pendingReferrals = pendingReferrals;
    }

    public int getTotalCoinsEarned() {
        return totalCoinsEarned;
    }

    public void setTotalCoinsEarned(int totalCoinsEarned) {
        this.totalCoinsEarned = totalCoinsEarned;
    }
}
