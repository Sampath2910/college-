package com.projectshelf.order;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.DownloadFileType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "order_downloads")
@Getter
@Setter
public class OrderDownload extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "download_token", nullable = false, unique = true, length = 80)
    private String downloadToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 50)
    private DownloadFileType fileType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "download_count", nullable = false)
    private int downloadCount = 0;

    @Column(name = "max_downloads", nullable = false)
    private int maxDownloads = 10;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isDownloadLimitReached() {
        return downloadCount >= maxDownloads;
    }
}

