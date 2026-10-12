package com.bentork.ev_system.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class IndiaMartPayloadDTO {

    @JsonProperty("UNIQUE_QUERY_ID")
    private String uniqueQueryId;

    @JsonProperty("SENDER_NAME")
    private String senderName;

    @JsonProperty("SENDER_MOBILE")
    private String senderMobile;

    @JsonProperty("SENDER_EMAIL")
    private String senderEmail;

    @JsonProperty("SENDER_COMPANY")
    private String senderCompany;

    @JsonProperty("SENDER_CITY")
    private String senderCity;

    @JsonProperty("SENDER_STATE")
    private String senderState;

    @JsonProperty("QUERY_PRODUCT_NAME")
    private String queryProductName;

    @JsonProperty("QUERY_MESSAGE")
    private String queryMessage;
}
