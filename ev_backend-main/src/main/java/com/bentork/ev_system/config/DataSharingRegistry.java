package com.bentork.ev_system.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import com.bentork.ev_system.dto.response.UserDataExportResponse.DataSharingInfo;

/**
 * Dynamic registry of external entities that user data is shared with.
 * Configured via application.properties under the prefix "dpdpa.data-sharing".
 *
 * <p>Example configuration:
 * <pre>
 * dpdpa.data-sharing.entries[0].entity-name=Razorpay
 * dpdpa.data-sharing.entries[0].purpose=Payment processing
 * dpdpa.data-sharing.entries[0].data-categories=email,phone,payment info
 * </pre>
 *
 * <p>This avoids hardcoding and allows adding/removing integrations
 * without code changes — just update application.properties and restart.
 */
@Configuration
@ConfigurationProperties(prefix = "dpdpa.data-sharing")
public class DataSharingRegistry {

    private List<DataSharingEntry> entries = new ArrayList<>();

    public List<DataSharingEntry> getEntries() {
        return entries;
    }

    public void setEntries(List<DataSharingEntry> entries) {
        this.entries = entries;
    }

    /**
     * Convert config entries to response DTOs for the export.
     */
    public List<DataSharingInfo> toDataSharingInfoList() {
        List<DataSharingInfo> result = new ArrayList<>();
        for (DataSharingEntry entry : entries) {
            result.add(DataSharingInfo.builder()
                    .entityName(entry.getEntityName())
                    .purpose(entry.getPurpose())
                    .dataCategories(entry.getDataCategories())
                    .build());
        }
        return result;
    }

    /**
     * POJO for each data-sharing entry loaded from properties.
     */
    public static class DataSharingEntry {
        private String entityName;
        private String purpose;
        private List<String> dataCategories = new ArrayList<>();

        public String getEntityName() {
            return entityName;
        }

        public void setEntityName(String entityName) {
            this.entityName = entityName;
        }

        public String getPurpose() {
            return purpose;
        }

        public void setPurpose(String purpose) {
            this.purpose = purpose;
        }

        public List<String> getDataCategories() {
            return dataCategories;
        }

        public void setDataCategories(List<String> dataCategories) {
            this.dataCategories = dataCategories;
        }
    }
}
