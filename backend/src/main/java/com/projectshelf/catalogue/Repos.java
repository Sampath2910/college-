package com.projectshelf.catalogue;

import com.projectshelf.common.Types.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Spring Data repositories for the catalogue (grouped: each is a one-liner). */
public final class Repos {
    private Repos() {}

    public interface CategoryRepo extends JpaRepository<Category, Long> {
        List<Category> findAllByOrderBySortOrderAscNameAsc();
        Optional<Category> findBySlug(String slug);
    }

    public interface TechnologyRepo extends JpaRepository<Technology, Long> {
        Optional<Technology> findBySlug(String slug);
    }

    public interface SourcePlatformRepo extends JpaRepository<SourcePlatform, Long> {
        Optional<SourcePlatform> findByCode(String code);
    }

    public interface LicenceRepo extends JpaRepository<Licence, Long> {
        Optional<Licence> findBySpdxId(String spdxId);
    }

    public interface ProjectAssetRepo extends JpaRepository<ProjectAsset, Long> {
        List<ProjectAsset> findByProjectIdOrderBySortOrderAsc(Long projectId);
    }

    public interface ProjectRepo extends JpaRepository<Project, Long> {
        Optional<Project> findBySlug(String slug);
        Optional<Project> findByCanonicalUrl(String canonicalUrl);
        boolean existsBySlug(String slug);
        List<Project> findByStatus(ProjectStatus status);
        List<Project> findByStatusIn(List<ProjectStatus> statuses);
        long countByStatus(ProjectStatus status);
    }
}
