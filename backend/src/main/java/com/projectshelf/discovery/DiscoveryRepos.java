package com.projectshelf.discovery;

import com.projectshelf.common.Types.JobStatus;
import com.projectshelf.common.Types.JobType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public final class DiscoveryRepos {
    private DiscoveryRepos() {}

    public interface ExternalSourceRecordRepo extends JpaRepository<ExternalSourceRecord, Long> {
        Optional<ExternalSourceRecord> findBySourcePlatformIdAndResourceKindAndExternalId(Long platformId, String kind, String externalId);
        Optional<ExternalSourceRecord> findFirstByProjectId(Long projectId);
    }

    public interface DiscoveryJobRepo extends JpaRepository<DiscoveryJob, Long> {
        boolean existsByJobTypeAndStatus(JobType type, JobStatus status);
        List<DiscoveryJob> findByStatus(JobStatus status);
        Optional<DiscoveryJob> findFirstByJobTypeOrderByIdDesc(JobType type);
        List<DiscoveryJob> findAllByOrderByIdDesc(Pageable page);
    }

    public interface AiAnalysisRepo extends JpaRepository<AiAnalysis, Long> {
        Optional<AiAnalysis> findFirstByProjectIdOrderByIdDesc(Long projectId);
        Optional<AiAnalysis> findFirstByProjectIdAndAnalysisKindOrderByIdDesc(Long projectId, String kind);
    }

    public interface QualityScoreRepo extends JpaRepository<QualityScore, Long> {
        Optional<QualityScore> findFirstByProjectIdOrderByIdDesc(Long projectId);
    }

    public interface DuplicateCandidateRepo extends JpaRepository<DuplicateCandidate, Long> {
        boolean existsByProjectIdAndOtherProjectId(Long a, Long b);
        List<DuplicateCandidate> findByStatusOrderBySimilarityDesc(String status);
        long countByStatus(String status);
    }
}
