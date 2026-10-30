package com.bentork.ev_system.service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.bentork.ev_system.dto.response.WhatsAppSendResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for dispatching WhatsApp messages for CRM Campaigns.
 * Supports Meta Cloud API in production, and an automated Simulation/Dev mode when keys are not configured.
 * Implements FR-13 (Provider submission) and captures provider message ID (WAMID).
 */
@Service
@Slf4j
public class WhatsAppDispatchService {

    @Value("${crm.whatsapp.enabled:false}")
    private boolean whatsAppEnabled;

    @Value("${crm.whatsapp.api-url:https://graph.facebook.com/v19.0}")
    private String apiUrl;

    @Value("${crm.whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${crm.whatsapp.access-token:}")
    private String accessToken;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Legacy method for sending a WhatsApp message (retained for backward compatibility).
     */
    public void sendWhatsAppMessage(String toPhone, String messageTemplate, String contactName, String companyName) {
        sendCampaignMessage(toPhone, messageTemplate, null, contactName, companyName);
    }

    /**
     * Primary dispatch method for WhatsApp campaign rounds (FR-13).
     * Returns structured result containing provider message ID (WAMID) and status.
     *
     * @param toPhone recipient phone number
     * @param messageBody text message or resolved template body
     * @param templateName optional WhatsApp approved template name
     * @param contactName recipient name for placeholder replacement
     * @param companyName recipient company name for placeholder replacement
     * @return WhatsAppSendResult with provider message ID and status
     */
    public WhatsAppSendResult sendCampaignMessage(String toPhone, String messageBody, String templateName,
                                                  String contactName, String companyName) {
        if (toPhone == null || toPhone.trim().isEmpty()) {
            return WhatsAppSendResult.builder()
                    .success(false)
                    .status("FAILED")
                    .errorCode("INVALID_PHONE")
                    .errorMessage("Recipient phone number is missing")
                    .build();
        }

        String normalizedPhone = normalizePhoneNumber(toPhone.trim());
        String resolvedBody = formatTemplate(messageBody, contactName, companyName);

        if (whatsAppEnabled && phoneNumberId != null && !phoneNumberId.isEmpty() && accessToken != null && !accessToken.isEmpty()) {
            return sendViaMetaCloudApiWithResult(normalizedPhone, resolvedBody, templateName);
        } else {
            // Simulated / Mock dispatch for development, staging, and demo environments
            String simulatedWamid = "wamid.sim_" + UUID.randomUUID().toString().replace("-", "");
            log.info("[SIMULATED WHATSAPP DISPATCH] To: {}, WAMID: {}, Message: '{}'", normalizedPhone, simulatedWamid, resolvedBody);
            return WhatsAppSendResult.builder()
                    .success(true)
                    .providerMessageId(simulatedWamid)
                    .status("SUBMITTED")
                    .build();
        }
    }

    /**
     * Live dispatch via Meta WhatsApp Business Cloud API.
     */
    private WhatsAppSendResult sendViaMetaCloudApiWithResult(String phone, String text, String templateName) {
        try {
            String url = apiUrl + "/" + phoneNumberId + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", phone);

            // If a template name is specified, send template message; otherwise text message
            if (templateName != null && !templateName.trim().isEmpty()) {
                body.put("type", "template");
                Map<String, Object> templateObj = new HashMap<>();
                templateObj.put("name", templateName.trim());
                Map<String, String> langObj = new HashMap<>();
                langObj.put("code", "en_US");
                templateObj.put("language", langObj);
                body.put("template", templateObj);
            } else {
                body.put("type", "text");
                Map<String, String> textObj = new HashMap<>();
                textObj.put("preview_url", "false");
                textObj.put("body", text);
                body.put("text", textObj);
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String wamid = extractWamid(response.getBody());
                log.info("Live WhatsApp message sent to {}, WAMID: {}", phone, wamid);
                return WhatsAppSendResult.builder()
                        .success(true)
                        .providerMessageId(wamid)
                        .status("SUBMITTED")
                        .build();
            } else {
                return WhatsAppSendResult.builder()
                        .success(false)
                        .status("FAILED")
                        .errorCode(String.valueOf(response.getStatusCode().value()))
                        .errorMessage("WhatsApp API returned status " + response.getStatusCode())
                        .build();
            }
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}: {}", phone, e.getMessage());
            return WhatsAppSendResult.builder()
                    .success(false)
                    .status("FAILED")
                    .errorCode("PROVIDER_ERROR")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Extracts provider message ID (wamid) from Meta's API response.
     * Meta response schema: {"messaging_product":"whatsapp","contacts":[{"input":"...","wa_id":"..."}],"messages":[{"id":"wamid.HBg..."}]}
     */
    private String extractWamid(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode messages = root.path("messages");
            if (messages.isArray() && messages.size() > 0) {
                return messages.get(0).path("id").asText();
            }
        } catch (Exception e) {
            log.warn("Could not extract WAMID from response: {}", responseJson);
        }
        return "wamid.unknown_" + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Normalize Indian phone numbers to E.164 without '+' (e.g. 919876543210).
     */
    public String normalizePhoneNumber(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() == 10) {
            return "91" + digits; // Default India country code
        }
        if (digits.startsWith("0") && digits.length() == 11) {
            return "91" + digits.substring(1);
        }
        return digits;
    }

    /**
     * Substitute dynamic personalization placeholders.
     */
    public String formatTemplate(String template, String contactName, String companyName) {
        if (template == null) {
            return "";
        }
        String safeContact = (contactName != null && !contactName.isEmpty()) ? contactName : "Customer";
        String safeCompany = (companyName != null && !companyName.isEmpty()) ? companyName : "Valued Partner";

        return template
                .replace("{{contactName}}", safeContact)
                .replace("{{contact_name}}", safeContact)
                .replace("{{companyName}}", safeCompany)
                .replace("{{company_name}}", safeCompany);
    }
}
