package com.bentork.ev_system.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for dispatching marketing and notification emails for CRM Campaigns.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailDispatchService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:hrbentork@gmail.com}")
    private String fromEmail;

    /**
     * Send campaign email to a recipient.
     * Supports dynamic placeholders: {{contactName}}, {{companyName}}.
     *
     * @param toEmail target email address
     * @param subject email subject line
     * @param bodyTemplate message body with optional placeholders
     * @param contactName recipient's name
     * @param companyName recipient's company name
     */
    public void sendCampaignEmail(String toEmail, String subject, String bodyTemplate, String contactName, String companyName) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email address is missing");
        }

        String resolvedSubject = subject != null && !subject.isEmpty() ? subject : "Update from Bentork EV";
        String resolvedBody = formatTemplate(bodyTemplate, contactName, companyName);

        try {
            boolean isHtml = resolvedBody.contains("<") && resolvedBody.contains(">") && (
                    resolvedBody.toLowerCase().contains("<html") ||
                    resolvedBody.toLowerCase().contains("<p") ||
                    resolvedBody.toLowerCase().contains("<div") ||
                    resolvedBody.toLowerCase().contains("<br"));

            if (isHtml) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
                helper.setFrom(fromEmail);
                helper.setTo(toEmail.trim());
                helper.setSubject(resolvedSubject);
                helper.setText(resolvedBody, true);
                mailSender.send(mimeMessage);
            } else {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(toEmail.trim());
                message.setSubject(resolvedSubject);
                message.setText(resolvedBody);
                mailSender.send(message);
            }

            log.info("Campaign email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send campaign email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Email delivery failed: " + e.getMessage(), e);
        }
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
