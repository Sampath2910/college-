package com.projectshelf.admin;

import com.projectshelf.catalogue.Repos.SourcePlatformRepo;
import com.projectshelf.catalogue.SourcePlatform;
import com.projectshelf.common.AuditService;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Types.JobType;
import com.projectshelf.discovery.DiscoveryJob;
import com.projectshelf.discovery.DiscoveryRepos.DiscoveryJobRepo;
import com.projectshelf.discovery.JobService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Discovery Agent controls: run jobs, inspect history and errors, tune rules, schedules and per-source behaviour. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDiscoveryController {
    private final JobService jobService;
    private final DiscoveryJobRepo jobs;
    private final SettingsService settings;
    private final SourcePlatformRepo platforms;
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    @GetMapping("/jobs")
    public Map<String, Object> jobs(@RequestParam(defaultValue = "40") int limit) {
        Map<String, Object> schedule = new LinkedHashMap<>();
        for (JobType t : JobType.values()) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("cron", settings.getString("schedule." + t.name()));
            s.put("nextRun", jobService.nextRun(t));
            schedule.put(t.name(), s);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("jobs", jobs.findAllByOrderByIdDesc(PageRequest.of(0, Math.min(limit, 200))));
        m.put("schedule", schedule);
        m.put("paused", settings.getBool("schedules.paused"));
        return m;
    }

    @GetMapping("/jobs/{id}")
    public Map<String, Object> job(@PathVariable long id) {
        DiscoveryJob j = jobs.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found."));
        return Map.of("job", j, "results", jdbc.queryForList("SELECT external_ref AS ref, outcome, detail, project_id AS projectId, created_at AS createdAt "
                + "FROM discovery_job_results WHERE job_id = ? ORDER BY id LIMIT 500", id));
    }

    public record RunRequest(@NotNull JobType type) {}

    @PostMapping("/jobs")
    public DiscoveryJob run(@Valid @RequestBody RunRequest b) {
        DiscoveryJob j = jobService.start(b.type(), "MANUAL");
        audit.log("JOB_STARTED", "job", j.getId(), b.type().name());
        return j;
    }

    @GetMapping("/discovery/stats")
    public Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("byStatus", jdbc.queryForList("SELECT status, COUNT(*) AS total FROM projects GROUP BY status"));
        m.put("byPlatform", jdbc.queryForList("SELECT sp.name AS platform, p.status, COUNT(*) AS total FROM projects p JOIN source_platforms sp ON sp.id = p.source_platform_id GROUP BY sp.name, p.status"));
        m.put("byAnalysis", jdbc.queryForList("SELECT analysis_status AS analysis, COUNT(*) AS total FROM projects GROUP BY analysis_status"));
        m.put("byType", jdbc.queryForList("SELECT project_type AS type, COUNT(*) AS total FROM projects GROUP BY project_type"));
        m.put("rejectionReasons", jdbc.queryForList("SELECT detail AS reason, COUNT(*) AS total FROM discovery_job_results WHERE outcome = 'REJECTED' "
                + "AND created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY GROUP BY detail ORDER BY total DESC LIMIT 10"));
        m.put("sourceRecords", jdbc.queryForObject("SELECT COUNT(*) FROM external_source_records", Long.class));
        m.put("pendingDuplicates", jdbc.queryForObject("SELECT COUNT(*) FROM duplicate_candidates WHERE status = 'PENDING'", Long.class));
        return m;
    }

    // ---------- settings (keywords, limits, thresholds, weights, schedules, engagement rules) ----------

    @GetMapping("/settings")
    public Map<String, Object> settings() {
        return settings.all();
    }

    @PutMapping("/settings")
    public Map<String, Object> updateSettings(@RequestBody Map<String, Object> changes) {
        changes.forEach((k, v) -> {
            if (k.startsWith("schedule.") && v instanceof String cron && !cron.isBlank() && !CronExpression.isValidExpression(cron))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cron expression for " + k + ". Use 6 fields: second minute hour day month weekday.");
            Object def = settings.get(k, new com.fasterxml.jackson.core.type.TypeReference<Object>() {});
            String expected = SettingsService.DEFAULTS.get(k);
            if (expected == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown setting: " + k);
            boolean typeOk = expected.startsWith("[") ? v instanceof List : expected.startsWith("{") ? v instanceof Map
                    : expected.equals("true") || expected.equals("false") ? v instanceof Boolean
                    : expected.startsWith("\"") ? v instanceof String : (v == null || v instanceof Number);
            if (!typeOk) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wrong value type for " + k + ".");
            if (v instanceof Number n && n.doubleValue() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, k + " cannot be negative.");
            settings.set(k, v);
        });
        audit.log("SETTINGS_UPDATED", "settings", null, String.join(", ", changes.keySet()));
        return settings.all();
    }

    // ---------- per-source rules ----------

    @GetMapping("/sources")
    public List<SourcePlatform> sources() {
        return platforms.findAll();
    }

    public record SourceRequest(boolean enabled, boolean autoPublish, @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal autoPublishThreshold) {}

    @PutMapping("/sources/{code}")
    public SourcePlatform updateSource(@PathVariable String code, @Valid @RequestBody SourceRequest b) {
        SourcePlatform p = platforms.findByCode(code).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown source."));
        p.setEnabled(b.enabled());
        p.setAutoPublish(b.autoPublish());
        p.setAutoPublishThreshold(b.autoPublishThreshold());
        audit.log("SOURCE_UPDATED", "source", code, "enabled=" + b.enabled() + ", autoPublish=" + b.autoPublish() + ", threshold=" + b.autoPublishThreshold());
        return platforms.save(p);
    }
}
