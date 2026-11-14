package com.projectshelf.integration;

import com.projectshelf.common.Text;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IntegrationService {
    public interface IntegrationRepo extends JpaRepository<Integration, Long> {
        Optional<Integration> findByCode(String code);
    }

    private final IntegrationRepo repo;

    public Integration get(String code) {
        return repo.findByCode(code).orElseThrow();
    }

    public boolean enabled(String code) {
        return repo.findByCode(code).map(Integration::isEnabled).orElse(false);
    }

    public void success(String code) {
        Integration i = get(code);
        i.setLastSuccessAt(Instant.now());
        repo.save(i);
    }

    public void failure(String code, String message) {
        Integration i = get(code);
        i.setLastFailureAt(Instant.now());
        i.setLastFailureMessage(Text.truncate(message, 600));
        repo.save(i);
    }

    public void synced(String code) {
        Integration i = get(code);
        i.setLastSyncAt(Instant.now());
        i.setLastSuccessAt(Instant.now());
        repo.save(i);
    }
}
