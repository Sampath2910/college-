package com.projectshelf.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Admin-editable configuration stored in system_settings. Values are JSON; defaults live here. Never holds secrets. */
@Service
@RequiredArgsConstructor
public class SettingsService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public static final Map<String, String> DEFAULTS = new LinkedHashMap<>();
    static {
        // discovery
        DEFAULTS.put("discovery.github.keywords", "[\"final year project\",\"management system spring boot\",\"machine learning project\",\"django project\",\"mern stack project\",\"android app kotlin\",\"flutter app\",\"iot project arduino\",\"blockchain dapp\",\"object detection opencv\",\"sentiment analysis\",\"e-commerce website\"]");
        DEFAULTS.put("discovery.github.minStars", "20");
        DEFAULTS.put("discovery.github.maxStars", "15000");
        DEFAULTS.put("discovery.kaggle.keywords", "[\"student\",\"classification\",\"sentiment analysis\",\"image classification\",\"time series\"]");
        DEFAULTS.put("discovery.kaggle.kinds", "[\"dataset\",\"notebook\",\"model\",\"competition\"]");
        DEFAULTS.put("discovery.kaggle.minVotes", "10");
        DEFAULTS.put("discovery.maxPerKeyword", "10");
        DEFAULTS.put("discovery.maxPerRun", "60");
        DEFAULTS.put("discovery.minDescriptionLength", "20");
        DEFAULTS.put("discovery.maxAgeYears", "6");
        // quality
        DEFAULTS.put("quality.minScore", "30");
        DEFAULTS.put("quality.weights", "{\"documentation\":20,\"completeness\":15,\"studentRelevance\":15,\"technologyRelevance\":10,\"sourceAvailability\":5,\"maintenance\":10,\"popularity\":10,\"licenceClarity\":10,\"demoEvidence\":5}");
        DEFAULTS.put("duplicates.threshold", "0.7");
        DEFAULTS.put("autopublish.enabled", "false");
        // AI usage controls
        DEFAULTS.put("ai.enabled", "true");
        DEFAULTS.put("ai.maxCallsPerDay", "200");
        DEFAULTS.put("ai.price.inputPerMTok", "null");   // USD per million tokens; set from the provider's price list
        DEFAULTS.put("ai.price.outputPerMTok", "null");
        // engagement
        DEFAULTS.put("engagement.timezone", "\"Asia/Kolkata\"");
        DEFAULTS.put("engagement.quietStart", "\"21:00\"");
        DEFAULTS.put("engagement.quietEnd", "\"09:00\"");
        DEFAULTS.put("engagement.maxMessagesPerWeek", "1");
        DEFAULTS.put("engagement.autoSend", "false");     // false = every message needs admin approval
        DEFAULTS.put("email.dailyLimit", "90");
        // schedules (Spring cron: sec min hour day month weekday, server time zone)
        DEFAULTS.put("schedules.paused", "false");
        DEFAULTS.put("schedule.GITHUB_DISCOVERY", "\"0 0 2 * * *\"");
        DEFAULTS.put("schedule.KAGGLE_DISCOVERY", "\"0 30 2 * * *\"");
        DEFAULTS.put("schedule.METADATA_UPDATE", "\"0 0 3 * * SUN\"");
        DEFAULTS.put("schedule.SOURCE_VALIDATION", "\"0 0 4 * * *\"");
        DEFAULTS.put("schedule.DEMO_VALIDATION", "\"0 30 4 * * *\"");
        DEFAULTS.put("schedule.DUPLICATE_DETECTION", "\"0 0 5 * * SUN\"");
        DEFAULTS.put("schedule.SCORE_RECALCULATION", "\"0 30 5 * * SUN\"");
        DEFAULTS.put("schedule.INTEREST_AGGREGATION", "\"0 0 * * * *\"");
        DEFAULTS.put("schedule.DRAFT_GENERATION", "\"0 15 10 * * *\"");
    }

    public String raw(String key) {
        List<String> v = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = ?", String.class, key);
        return v.isEmpty() ? DEFAULTS.get(key) : v.get(0);
    }

    public <T> T get(String key, TypeReference<T> type) {
        try {
            String raw = raw(key);
            return raw == null ? null : json.readValue(raw, type);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid setting " + key, e);
        }
    }

    public int getInt(String key) { return get(key, new TypeReference<Integer>() {}); }
    public double getDouble(String key) { return get(key, new TypeReference<Double>() {}); }
    public Double getNullableDouble(String key) { return get(key, new TypeReference<Double>() {}); }
    public boolean getBool(String key) { return Boolean.TRUE.equals(get(key, new TypeReference<Boolean>() {})); }
    public String getString(String key) { return get(key, new TypeReference<String>() {}); }
    public List<String> getList(String key) { return get(key, new TypeReference<List<String>>() {}); }

    /** All known settings with their current (or default) JSON values. */
    public Map<String, Object> all() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (String k : DEFAULTS.keySet()) out.put(k, get(k, new TypeReference<Object>() {}));
        return out;
    }

    public void set(String key, Object value) {
        if (!DEFAULTS.containsKey(key)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown setting: " + key);
        try {
            String v = json.writeValueAsString(value);
            jdbc.update("INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, UTC_TIMESTAMP(6)) "
                    + "ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)", key, v);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid value for " + key);
        }
    }
}
