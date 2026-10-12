package com.bentork.ev_system.util;

import com.bentork.ev_system.dto.response.UserDataExportResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.util.List;
import java.util.Map;

public class UserDataHtmlGenerator {

    private static final ObjectMapper mapper = new ObjectMapper();
    static {
        mapper.registerModule(new JavaTimeModule());
        mapper.findAndRegisterModules();
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public static String generateHtml(UserDataExportResponse data) {
        Map<String, Object> map = mapper.convertValue(data, new TypeReference<Map<String, Object>>() {});
        
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html lang=\"en\">\n");
        html.append("<head>\n");
        html.append("    <meta charset=\"UTF-8\">\n");
        html.append("    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append("    <title>Your Data Export</title>\n");
        html.append("    <style>\n");
        html.append("        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #262626; margin: 0; padding: 20px; line-height: 1.5; }\n");
        html.append("        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }\n");
        html.append("        h1 { font-size: 24px; font-weight: 600; margin-bottom: 10px; color: #000; border-bottom: 1px solid #dbdbdb; padding-bottom: 15px; }\n");
        html.append("        h2 { font-size: 18px; font-weight: 600; margin-top: 35px; margin-bottom: 15px; color: #000; text-transform: capitalize; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }\n");
        html.append("        .property-list { display: flex; flex-wrap: wrap; gap: 15px; }\n");
        html.append("        .property-item { background: #f8f9fa; padding: 15px; border-radius: 6px; flex: 1 1 calc(33.333% - 15px); border: 1px solid #e9ecef; min-width: 200px; }\n");
        html.append("        .property-label { font-size: 12px; color: #8e8e8e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; display: block; }\n");
        html.append("        .property-value { font-size: 15px; color: #262626; word-break: break-word; font-weight: 500; }\n");
        html.append("        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }\n");
        html.append("        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #efefef; }\n");
        html.append("        th { background-color: #fafafa; color: #8e8e8e; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; white-space: nowrap; }\n");
        html.append("        tr:hover { background-color: #fcfcfc; }\n");
        html.append("        .empty-state { color: #8e8e8e; font-style: italic; padding: 10px 0; background: #fafafa; text-align: center; border-radius: 6px; border: 1px dashed #ddd; }\n");
        html.append("        .notice { background-color: #e8f4fd; color: #0056b3; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-size: 14px; line-height: 1.6; }\n");
        html.append("        .header-meta { font-size: 13px; color: #8e8e8e; margin-bottom: 30px; display: flex; justify-content: space-between; }\n");
        html.append("        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }\n");
        html.append("        @media (max-width: 768px) {\n");
        html.append("            .property-item { flex: 1 1 100%; }\n");
        html.append("            .container { padding: 20px; }\n");
        html.append("        }\n");
        html.append("    </style>\n");
        html.append("</head>\n");
        html.append("<body>\n");
        html.append("    <div class=\"container\">\n");
        html.append("        <h1>Your Data Export</h1>\n");
        
        if (map.containsKey("exportedAt") || map.containsKey("requestedBy")) {
            html.append("        <div class=\"header-meta\">\n");
            if (map.get("requestedBy") != null) {
                html.append("            <span>Requested by: <strong>").append(escapeHtml(map.get("requestedBy").toString())).append("</strong></span>\n");
            }
            if (map.get("exportedAt") != null) {
                html.append("            <span>Exported at: <strong>").append(escapeHtml(map.get("exportedAt").toString())).append("</strong></span>\n");
            }
            html.append("        </div>\n");
        }
        
        if (map.get("dpdpaNotice") != null) {
            html.append("        <div class=\"notice\">\n");
            html.append("            <strong>Privacy Notice</strong><br>\n");
            html.append("            ").append(escapeHtml(map.get("dpdpaNotice").toString())).append("\n");
            html.append("        </div>\n");
        }
        
        // Remove metadata fields from the map so we don't render them again
        map.remove("exportedAt");
        map.remove("requestedBy");
        map.remove("dpdpaNotice");

        // Profile Section (Top level object)
        if (map.containsKey("profile") && map.get("profile") instanceof Map) {
            html.append("        <h2>Profile Information</h2>\n");
            html.append("        <div class=\"property-list\">\n");
            renderMapProperties(html, (Map<String, Object>) map.get("profile"));
            html.append("        </div>\n");
            map.remove("profile");
        }

        // Render remaining sections dynamically
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String sectionName = formatSectionName(entry.getKey());
            Object value = entry.getValue();
            
            html.append("        <h2>").append(escapeHtml(sectionName)).append("</h2>\n");
            
            if (value == null) {
                html.append("        <div class=\"empty-state\">No data available</div>\n");
            } else if (value instanceof List) {
                List<?> list = (List<?>) value;
                if (list.isEmpty()) {
                    html.append("        <div class=\"empty-state\">No records found</div>\n");
                } else {
                    renderTable(html, list);
                }
            } else if (value instanceof Map) {
                html.append("        <div class=\"property-list\">\n");
                renderMapProperties(html, (Map<String, Object>) value);
                html.append("        </div>\n");
            } else {
                html.append("        <div class=\"property-list\">\n");
                html.append("            <div class=\"property-item\">\n");
                html.append("                <span class=\"property-value\">").append(escapeHtml(value.toString())).append("</span>\n");
                html.append("            </div>\n");
                html.append("        </div>\n");
            }
        }
        
        html.append("    </div>\n");
        html.append("</body>\n");
        html.append("</html>\n");
        
        return html.toString();
    }

    @SuppressWarnings("unchecked")
    private static void renderMapProperties(StringBuilder html, Map<String, Object> map) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            html.append("            <div class=\"property-item\">\n");
            html.append("                <span class=\"property-label\">").append(escapeHtml(formatSectionName(entry.getKey()))).append("</span>\n");
            String displayValue = entry.getValue() == null ? "-" : escapeHtml(entry.getValue().toString());
            html.append("                <span class=\"property-value\">").append(displayValue).append("</span>\n");
            html.append("            </div>\n");
        }
    }

    @SuppressWarnings("unchecked")
    private static void renderTable(StringBuilder html, List<?> list) {
        html.append("        <div style=\"overflow-x: auto; padding-bottom: 10px;\">\n");
        html.append("        <table>\n");
        
        if (list.get(0) instanceof Map) {
            Map<String, Object> firstRow = (Map<String, Object>) list.get(0);
            html.append("            <thead><tr>\n");
            for (String key : firstRow.keySet()) {
                html.append("                <th>").append(escapeHtml(formatSectionName(key))).append("</th>\n");
            }
            html.append("            </tr></thead>\n");
            
            html.append("            <tbody>\n");
            for (Object item : list) {
                if (item instanceof Map) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    html.append("            <tr>\n");
                    for (String key : firstRow.keySet()) {
                        Object cellValue = row.get(key);
                        String displayValue = cellValue == null ? "-" : escapeHtml(cellValue.toString());
                        html.append("                <td>").append(displayValue).append("</td>\n");
                    }
                    html.append("            </tr>\n");
                }
            }
            html.append("            </tbody>\n");
        } else {
            html.append("            <tbody>\n");
            for (Object item : list) {
                html.append("            <tr><td>").append(escapeHtml(item.toString())).append("</td></tr>\n");
            }
            html.append("            </tbody>\n");
        }
        html.append("        </table>\n");
        html.append("        </div>\n");
    }

    private static String formatSectionName(String camelCase) {
        if (camelCase == null || camelCase.isEmpty()) return "";
        String result = camelCase.replaceAll("([a-z])([A-Z]+)", "$1 $2");
        return result.substring(0, 1).toUpperCase() + result.substring(1);
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
