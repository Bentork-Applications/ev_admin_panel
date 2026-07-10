package com.bentork.ev_system.dto.response;

public class CoinBalanceResponse {

    private int coinBalance;
    private double redeemableKwh;

    public CoinBalanceResponse() {
    }

    public CoinBalanceResponse(int coinBalance, double redeemableKwh) {
        this.coinBalance = coinBalance;
        this.redeemableKwh = redeemableKwh;
    }

    public int getCoinBalance() {
        return coinBalance;
    }

    public void setCoinBalance(int coinBalance) {
        this.coinBalance = coinBalance;
    }

    public double getRedeemableKwh() {
        return redeemableKwh;
    }

    public void setRedeemableKwh(double redeemableKwh) {
        this.redeemableKwh = redeemableKwh;
    }
}
