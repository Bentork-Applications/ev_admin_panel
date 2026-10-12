package com.bentork.ev_system.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Maps the Truecaller /v1/userinfo API response.
 * Fields use snake_case to match Truecaller's JSON response format.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TruecallerUserInfo {

    private String sub;

    @JsonProperty("given_name")
    private String givenName;

    @JsonProperty("family_name")
    private String familyName;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("phone_number_country_code")
    private String phoneNumberCountryCode;

    private String email;

    private String picture;

    private String gender;

    /**
     * Returns the full display name by combining given_name and family_name.
     */
    public String getFullName() {
        StringBuilder name = new StringBuilder();
        if (givenName != null && !givenName.isBlank()) {
            name.append(givenName);
        }
        if (familyName != null && !familyName.isBlank()) {
            if (name.length() > 0) {
                name.append(" ");
            }
            name.append(familyName);
        }
        return name.length() > 0 ? name.toString() : "Truecaller User";
    }
}
