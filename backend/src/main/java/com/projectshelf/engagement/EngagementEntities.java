package com.projectshelf.engagement;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.common.Types.DraftStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Entities and repositories of the private engagement module. None of these are exposed to students except their own preferences. */
public final class EngagementEntities {
    private EngagementEntities() {}

    @Entity
    @Table(name = "communication_preferences")
    @Getter
    @Setter
    public static class CommunicationPreference extends BaseEntity {
        private Long userId;
        private boolean activityConsent;
        private boolean emailOptIn;
        private boolean whatsappOptIn;
        @Enumerated(EnumType.STRING) private Channel preferredChannel;
        private String unsubscribeToken;
    }

    @Entity
    @Table(name = "interest_profiles")
    @Getter
    @Setter
    public static class InterestProfile extends BaseEntity {
        private Long userId;
        @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> observed;
        @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> inferred;
        private BigDecimal confidence;
        private Instant lastActivityAt;
    }

    @Entity
    @Table(name = "message_drafts")
    @Getter
    @Setter
    public static class MessageDraft extends BaseEntity {
        private Long userId;
        @Enumerated(EnumType.STRING) private Channel channel;
        private String subject;
        private String body;
        private String triggerReason;
        private String generatedBy;
        @Enumerated(EnumType.STRING) private DraftStatus status = DraftStatus.DRAFT;
        private String statusNote;
        private Long reviewedBy;
        private Instant reviewedAt;
    }

    public interface CommunicationPreferenceRepo extends JpaRepository<CommunicationPreference, Long> {
        Optional<CommunicationPreference> findByUserId(Long userId);
        Optional<CommunicationPreference> findByUnsubscribeToken(String token);
    }

    public interface InterestProfileRepo extends JpaRepository<InterestProfile, Long> {
        Optional<InterestProfile> findByUserId(Long userId);
        void deleteByUserId(Long userId);
    }

    public interface MessageDraftRepo extends JpaRepository<MessageDraft, Long> {
        List<MessageDraft> findByStatusOrderByIdDesc(DraftStatus status);
        List<MessageDraft> findAllByOrderByIdDesc();
        boolean existsByUserIdAndStatus(Long userId, DraftStatus status);
    }
}
