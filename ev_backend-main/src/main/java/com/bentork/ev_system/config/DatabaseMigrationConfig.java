package com.bentork.ev_system.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs on application startup to ensure all required database columns exist.
 * This handles cases where Hibernate's ddl-auto=update fails to add new columns
 * (e.g., due to DB permissions, dialect issues, or silent failures).
 *
 * Each migration is idempotent — safe to run multiple times.
 */
@Component
@Order(1) // Run early in startup
public class DatabaseMigrationConfig implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationConfig.class);

    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationConfig(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(String... args) {
        log.info("Running database migration checks...");

        // ==================== ORDERS TABLE MIGRATIONS ====================
        addColumnIfNotExists("orders", "delivered_at", "DATETIME NULL");
        addColumnIfNotExists("orders", "dispatched_at", "DATETIME NULL");

        log.info("Database migration checks completed.");
    }

    /**
     * Adds a column to a table if it doesn't already exist.
     * Uses INFORMATION_SCHEMA to check column existence (MySQL compatible).
     *
     * @param tableName  the table to alter
     * @param columnName the column to add
     * @param columnDef  the column definition (e.g., "DATETIME NULL", "VARCHAR(255)")
     */
    private void addColumnIfNotExists(String tableName, String columnName, String columnDef) {
        try {
            String checkSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?";

            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, tableName, columnName);

            if (count == null || count == 0) {
                String alterSql = "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDef;
                jdbcTemplate.execute(alterSql);
                log.info("✅ Added missing column: {}.{}", tableName, columnName);
            } else {
                log.debug("Column {}.{} already exists, skipping.", tableName, columnName);
            }
        } catch (Exception e) {
            log.error("❌ Failed to add column {}.{}: {}", tableName, columnName, e.getMessage());
        }
    }
}
