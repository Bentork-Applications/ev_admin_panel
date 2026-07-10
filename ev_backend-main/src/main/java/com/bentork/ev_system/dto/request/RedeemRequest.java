package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class RedeemRequest {

    @NotNull(message = "Coins amount is required")
    @Min(value = 1000, message = "Minimum 1000 coins required to redeem")
    private Integer coins;

    public Integer getCoins() {
        return coins;
    }

    public void setCoins(Integer coins) {
        this.coins = coins;
    }
}
