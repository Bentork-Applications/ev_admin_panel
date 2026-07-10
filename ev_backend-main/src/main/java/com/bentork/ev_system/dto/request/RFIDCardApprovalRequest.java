package com.bentork.ev_system.dto.request;

import lombok.Data;

@Data
public class RFIDCardApprovalRequest {
    private String cardNumber;
    private String boxId;

    public String getCardNumber() {
        return cardNumber;
    }

    public void setCardNumber(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    public String getBoxId() {
        return boxId;
    }

    public void setBoxId(String boxId) {
        this.boxId = boxId;
    }
}
