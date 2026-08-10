package com.bentork.ev_system.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Running automatic database migrations...");
        
        try {
            jdbcTemplate.execute("ALTER TABLE user_support_requests MODIFY COLUMN attachment_url LONGTEXT");
            log.info("Successfully updated user_support_requests attachment_url to LONGTEXT");
        } catch (Exception e) {
            log.warn("Could not alter user_support_requests (it might already be updated or column doesn't exist yet): {}", e.getMessage());
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE dealer_support_requests MODIFY COLUMN attachment_url LONGTEXT");
            log.info("Successfully updated dealer_support_requests attachment_url to LONGTEXT");
        } catch (Exception e) {
            log.warn("Could not alter dealer_support_requests (it might already be updated or column doesn't exist yet): {}", e.getMessage());
        }

        // Migration: Replace serial number with barcode as primary battery identifier
        try {
            jdbcTemplate.execute("ALTER TABLE battery_data MODIFY COLUMN barcode VARCHAR(255) NOT NULL");
            log.info("Made barcode column NOT NULL");
        } catch (Exception e) {
            log.warn("Could not modify barcode column (it might already be updated): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE battery_data ADD UNIQUE INDEX idx_battery_barcode (barcode)");
            log.info("Added unique index on barcode");
        } catch (Exception e) {
            log.warn("Could not add unique index on barcode (it might already exist): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE battery_data DROP COLUMN product_serial_number");
            log.info("Dropped product_serial_number column");
        } catch (Exception e) {
            log.warn("Could not drop product_serial_number (it might already be removed): {}", e.getMessage());
        }

        // ==================== Order Tracking Migration ====================
        // The Order entity has been replaced with the new 3-stage order tracking system.
        // JPA ddl-auto=update will add new columns, but old columns must be dropped manually.
        String[] oldOrderColumns = {
            "title", "description", "status", "assigned_to_user_id", "assigned_to_user_email",
            "assigned_to_user_name", "last_updated_by_admin_email", "cancel_reason", "admin_notes",
            "in_progress_at", "testing_at", "completed_at", "delivered_at", "cancelled_at"
        };
        for (String col : oldOrderColumns) {
            try {
                jdbcTemplate.execute("ALTER TABLE orders DROP COLUMN " + col);
                log.info("Dropped old orders column: {}", col);
            } catch (Exception e) {
                log.warn("Could not drop orders column '{}' (may already be removed): {}", col, e.getMessage());
            }
        }

        // Migration: Ensure user_id is nullable in tables that support DPDPA account deletion
        String[] tablesToMakeUserIdNullable = {
            "sessions", "revenue", "receipts", "wallet_transactions", "coin_transactions", "rfid_cards"
        };
        for (String table : tablesToMakeUserIdNullable) {
            try {
                jdbcTemplate.execute("ALTER TABLE " + table + " MODIFY COLUMN user_id BIGINT NULL");
                log.info("Successfully made user_id nullable in {}", table);
            } catch (Exception e) {
                log.warn("Could not modify user_id in {} (it might already be nullable or table doesn't exist): {}", table, e.getMessage());
            }
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN assigned_user_id BIGINT NULL");
            log.info("Successfully made assigned_user_id nullable in orders");
        } catch (Exception e) {
            log.warn("Could not modify assigned_user_id in orders: {}", e.getMessage());
        }

    }
}
