package com.projectshelf.discovery;

import com.projectshelf.catalogue.Project;
import com.projectshelf.catalogue.Repos.ProjectRepo;
import com.projectshelf.catalogue.Repos.SourcePlatformRepo;
import com.projectshelf.common.SafeHttp;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Text;
import com.projectshelf.common.Types.JobStatus;
import com.projectshelf.common.Types.JobType;
import com.projectshelf.common.Types.ProjectStatus;
import com.projectshelf.discovery.DiscoveryRepos.DiscoveryJobRepo;
import com.projectshelf.discovery.DiscoveryRepos.ExternalSourceRecordRepo;
import com.projectshelf.discovery.SourceAdapter.DiscoveredItem;
import com.projectshelf.discovery.SourceAdapter.RateLimitedException;
import com.projectshelf.engagement.EngagementService;
import com.projectshelf.engagement.MessagingService;
import com.projectshelf.integration.IntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Runs every background job, manual or scheduled, and records it in discovery_jobs / discovery_job_results.
 * All jobs share one worker thread, so two jobs can never write the catalogue at the same time, and a job type that is
 * already running cannot be started again. Every job is idempotent, so a failed or interrupted job can simply be re-run.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {
    private final DiscoveryJobRepo jobs;
    private final JdbcTemplate jdbc;
    private final List<SourceAdapter> adapters;
    private final DiscoveryPipeline pipeline;
    private final SettingsService settings;
    private final IntegrationService integrations;
    private final ProjectRepo projects;
    private final SourcePlatformRepo platforms;
    private final ExternalSourceRecordRepo records;
    private final QualityScorer scorer;
    private final DuplicateDetector duplicates;
    private final EngagementService engagement;
    private final MessagingService messaging;
    private final TransactionTemplate tx;

    @Value("${app.scheduler.enabled}") private boolean schedulerEnabled;
    private final Instant startedAt = Instant.now();
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "background-jobs");
        t.setDaemon(true);
        return t;
    });

    /** Running totals for one job. */
    final class Counters {
        final long jobId;
        int discovered, processed, rejected, updated, published, errors;

        Counters(long jobId) { this.jobId = jobId; }

        void result(String ref, String outcome, String detail, Long projectId) {
            switch (outcome) {
                case "CREATED", "UNCHANGED" -> processed++;
                case "UPDATED" -> { processed++; updated++; }
                case "PUBLISHED" -> { processed++; published++; }
                case "REJECTED" -> rejected++;
                case "FLAGGED" -> updated++;
                case "ERROR" -> errors++;
                default -> { }
            }
            if (!outcome.equals("UNCHANGED"))
                jdbc.update("INSERT INTO discovery_job_results (job_id, external_ref, outcome, detail, project_id, created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))",
                        jobId, Text.truncate(ref, 300), outcome, Text.truncate(detail, 1000), projectId);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterrupted() {
        for (DiscoveryJob j : jobs.findByStatus(JobStatus.RUNNING)) {
            j.setStatus(JobStatus.FAILED);
            j.setEndedAt(Instant.now());
            j.setErrorMessage("Interrupted by a restart. It is safe to run this job again.");
            jobs.save(j);
        }
    }

    /** Queues a job on the worker thread and returns immediately. */
    public synchronized DiscoveryJob start(JobType type, String trigger) {
        if (jobs.existsByJobTypeAndStatus(type, JobStatus.RUNNING))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A " + type + " job is already running.");
        DiscoveryJob job = create(type, trigger);
        worker.submit(() -> execute(job.getId()));
        return job;
    }

    /** Runs a job on the calling thread and returns the finished record. Used by tests and by nothing else. */
    public DiscoveryJob runNow(JobType type) {
        DiscoveryJob job = create(type, "MANUAL");
        execute(job.getId());
        return jobs.findById(job.getId()).orElseThrow();
    }

    private DiscoveryJob create(JobType type, String trigger) {
        DiscoveryJob job = new DiscoveryJob();
        job.setJobType(type);
        job.setTriggerType(trigger);
        job.setStatus(JobStatus.RUNNING);
        job.setStartedAt(Instant.now());
        return jobs.save(job);
    }

    void execute(Long jobId) {
        DiscoveryJob job = jobs.findById(jobId).orElseThrow();
        Counters c = new Counters(jobId);
        JobStatus status = JobStatus.SUCCEEDED;
        String message = null;
        int retries = 0;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                run(job.getJobType(), c);
                status = c.errors > 0 ? JobStatus.PARTIAL : JobStatus.SUCCEEDED;
                message = c.errors > 0 ? c.errors + " record(s) failed; see the job results." : null;
                break;
            } catch (RateLimitedException e) {     // stop cleanly; what was processed is kept and the next run continues
                status = JobStatus.PARTIAL;
                message = e.getMessage() + ". Stopped early; the next run will continue.";
                break;
            } catch (Exception e) {
                log.error("Job {} failed (attempt {})", job.getJobType(), attempt + 1, e);
                status = JobStatus.FAILED;
                message = e.getClass().getSimpleName() + ": " + e.getMessage();
                if (e instanceof IllegalStateException) break;   // configuration problem: retrying will not help
                if (attempt == 0) retries++;
            }
        }
        job.setStatus(status);
        job.setEndedAt(Instant.now());
        job.setRecordsDiscovered(c.discovered);
        job.setRecordsProcessed(c.processed);
        job.setRecordsRejected(c.rejected);
        job.setRecordsUpdated(c.updated);
        job.setRecordsPublished(c.published);
        job.setErrorCount(c.errors + (status == JobStatus.FAILED ? 1 : 0));
        job.setRetryCount(retries);
        job.setErrorMessage(Text.truncate(message, 2000));
        jobs.save(job);
    }

    private void run(JobType type, Counters c) {
        switch (type) {
            case GITHUB_DISCOVERY -> discover(adapter("GITHUB"), c);
            case KAGGLE_DISCOVERY -> discover(adapter("KAGGLE"), c);
            case METADATA_UPDATE -> metadataUpdate(c);
            case SOURCE_VALIDATION -> sourceValidation(c);
            case DEMO_VALIDATION -> demoValidation(c);
            case DUPLICATE_DETECTION -> forEachProject("status NOT IN ('REJECTED','ARCHIVED')", c, p -> {
                int n = duplicates.check(p);
                if (n > 0) c.result(p.getSlug(), "FLAGGED", n + " possible duplicate(s) flagged for review", p.getId());
            });
            case SCORE_RECALCULATION -> forEachProject("status <> 'ARCHIVED'", c, p -> {
                scorer.score(p);
                projects.save(p);
            });
            case INTEREST_AGGREGATION -> c.processed = c.discovered = engagement.aggregateProfiles();
            case DRAFT_GENERATION -> c.processed = c.discovered = engagement.generateDrafts(null);
        }
    }

    private SourceAdapter adapter(String code) {
        return adapters.stream().filter(a -> a.code().equals(code)).findFirst().orElseThrow();
    }

    private void discover(SourceAdapter adapter, Counters c) {
        String code = adapter.code();
        if (!integrations.enabled(code) || !platforms.findByCode(code).orElseThrow().isEnabled())
            throw new IllegalStateException(code + " discovery is disabled on the integrations page.");
        int perKeyword = settings.getInt("discovery.maxPerKeyword"), maxPerRun = settings.getInt("discovery.maxPerRun");
        Set<String> seen = new HashSet<>();
        try {
            for (String keyword : settings.getList("discovery." + code.toLowerCase(Locale.ROOT) + ".keywords")) {
                if (c.discovered >= maxPerRun) break;
                for (DiscoveredItem item : adapter.search(keyword, perKeyword)) {
                    if (c.discovered >= maxPerRun) break;
                    if (!seen.add(item.kind() + ":" + item.externalId())) continue;
                    c.discovered++;
                    ingest(adapter, item, c);
                }
            }
            integrations.synced(code);
        } catch (RuntimeException e) {
            if (!(e instanceof RateLimitedException)) integrations.failure(code, e.getMessage());
            throw e;
        }
    }

    private void ingest(SourceAdapter adapter, DiscoveredItem item, Counters c) {
        try {
            DiscoveryPipeline.Outcome o = pipeline.ingest(adapter, item);
            c.result(item.externalId(), o.outcome(), o.detail(), o.projectId());
        } catch (RateLimitedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Ingest failed for {}", item.externalId(), e);
            c.result(item.externalId(), "ERROR", e.getClass().getSimpleName() + ": " + e.getMessage(), null);
        }
    }

    /** Re-reads each reviewed project from its source API: picks up changes and detects deleted sources. */
    private void metadataUpdate(Counters c) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM projects WHERE status IN ('PUBLISHED','APPROVED','PENDING_REVIEW','NEEDS_REVALIDATION') "
                + "ORDER BY last_verified_at ASC LIMIT ?", Long.class, settings.getInt("discovery.maxPerRun"));
        for (Long id : ids) {
            ExternalSourceRecord rec = records.findFirstByProjectId(id).orElse(null);
            if (rec == null) continue;
            String code = platforms.findById(rec.getSourcePlatformId()).orElseThrow().getCode();
            SourceAdapter adapter = adapter(code);
            if (!adapter.supportsRefresh() || !integrations.enabled(code)) continue;
            c.discovered++;
            try {
                Optional<DiscoveredItem> item = adapter.fetch(rec.getResourceKind(), rec.getExternalId());
                if (item.isPresent()) ingest(adapter, item.get(), c);
                else flagUnavailable(id, rec.getExternalId(), "The source API reports this record no longer exists", c);
            } catch (RateLimitedException e) {
                throw e;
            } catch (Exception e) {
                c.result(rec.getExternalId(), "ERROR", e.getMessage(), id);
            }
        }
    }

    /** Checks that each published project's source page still responds. Only a definite 404/410 unpublishes it. */
    private void sourceValidation(Counters c) {
        for (Map<String, Object> row : jdbc.queryForList("SELECT id, source_url AS url FROM projects WHERE status = 'PUBLISHED' ORDER BY last_verified_at ASC LIMIT 100")) {
            long id = ((Number) row.get("id")).longValue();
            String url = (String) row.get("url");
            c.discovered++;
            int status = SafeHttp.probe(url);
            if (status == 404 || status == 410) flagUnavailable(id, url, "Source page returned HTTP " + status, c);
            else if (status >= 200 && status < 400) {
                jdbc.update("UPDATE projects SET last_verified_at = UTC_TIMESTAMP(6), source_available = TRUE WHERE id = ?", id);
                c.processed++;
            } else c.result(url, "INFO", "Check inconclusive (HTTP " + status + "); left unchanged", id);
        }
    }

    private void demoValidation(Counters c) {
        for (Map<String, Object> row : jdbc.queryForList("SELECT id, demo_url AS url, demo_verified AS verified FROM projects "
                + "WHERE demo_url IS NOT NULL AND status IN ('PUBLISHED','APPROVED','PENDING_REVIEW') LIMIT 300")) {
            long id = ((Number) row.get("id")).longValue();
            c.discovered++;
            int status = SafeHttp.probe((String) row.get("url"));
            boolean ok = status >= 200 && status < 400, was = Boolean.TRUE.equals(row.get("verified"));
            jdbc.update("UPDATE projects SET demo_verified = ? WHERE id = ?", ok, id);
            if (ok != was) c.result((String) row.get("url"), ok ? "UPDATED" : "FLAGGED",
                    ok ? "Website link responded (HTTP " + status + "); it is now shown publicly" : "Website link did not respond (HTTP " + status + "); hidden from the public page", id);
            else c.processed++;
        }
    }

    private void flagUnavailable(long projectId, String ref, String reason, Counters c) {
        tx.executeWithoutResult(s -> projects.findById(projectId).ifPresent(p -> {
            p.setSourceAvailable(false);
            if (p.getStatus() != ProjectStatus.REJECTED && p.getStatus() != ProjectStatus.ARCHIVED) p.setStatus(ProjectStatus.NEEDS_REVALIDATION);
            p.setReviewNote(reason + " (" + Instant.now().toString().substring(0, 10) + ")");
        }));
        c.result(ref, "FLAGGED", reason + ". Moved to Needs Revalidation and removed from the public catalogue.", projectId);
    }

    private void forEachProject(String where, Counters c, java.util.function.Consumer<Project> action) {
        for (Long id : jdbc.queryForList("SELECT id FROM projects WHERE " + where + " ORDER BY id", Long.class)) {
            c.discovered++;
            try {
                tx.executeWithoutResult(s -> projects.findById(id).ifPresent(action));
                c.processed++;
            } catch (Exception e) {
                c.result("project " + id, "ERROR", e.getMessage(), id);
            }
        }
    }

    // ---------- scheduling ----------

    /** Next time a job type is due according to its cron setting, or null when it has no schedule. */
    public Instant nextRun(JobType type) {
        String cron = settings.getString("schedule." + type.name());
        if (Text.blank(cron) || !CronExpression.isValidExpression(cron)) return null;
        Instant last = jobs.findFirstByJobTypeOrderByIdDesc(type).map(DiscoveryJob::getStartedAt).filter(t -> t.isAfter(startedAt)).orElse(startedAt);
        LocalDateTime next = CronExpression.parse(cron).next(LocalDateTime.ofInstant(last, ZoneId.systemDefault()));
        return next == null ? null : next.atZone(ZoneId.systemDefault()).toInstant();
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 45_000)
    void tick() {
        if (!schedulerEnabled) return;
        try {
            messaging.sendApproved();
            if (settings.getBool("schedules.paused")) return;
            for (JobType type : JobType.values()) {
                Instant next = nextRun(type);
                if (next != null && !next.isAfter(Instant.now()) && !jobs.existsByJobTypeAndStatus(type, JobStatus.RUNNING)) start(type, "SCHEDULED");
            }
        } catch (Exception e) {
            log.error("Scheduler tick failed", e);
        }
    }
}
