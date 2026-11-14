package com.projectshelf.common;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.function.Supplier;

/** Outbound HTTP helpers: timeouts everywhere, bounded retries, and an SSRF-safe link probe. */
public final class SafeHttp {
    private SafeHttp() {}

    private static final HttpClient NO_REDIRECT = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER).build();

    public static RestClient client(String baseUrl) {
        JdkClientHttpRequestFactory f = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder()
                        .version(HttpClient.Version.HTTP_1_1)
                        .connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .build());
        f.setReadTimeout(Duration.ofSeconds(60));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(f).build();
    }

    /** Retries transient failures (I/O errors, HTTP 5xx) up to 3 attempts with backoff. Only use for idempotent calls. */
    public static <T> T retry(Supplier<T> call) {
        RuntimeException last = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                return call.get();
            } catch (ResourceAccessException | HttpServerErrorException e) {
                last = e;
                try {
                    Thread.sleep(800L * (attempt + 1));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
        throw last;
    }

    /**
     * Returns the HTTP status of a public URL, or -1 if it cannot be reached or is not allowed.
     * Refuses non-http(s) schemes and private/loopback addresses because the URLs come from third-party metadata.
     */
    public static int probe(String url) {
        try {
            URI uri = URI.create(url.trim());
            if (uri.getHost() == null || !("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))) return -1;
            for (InetAddress a : InetAddress.getAllByName(uri.getHost()))
                if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress() || a.isMulticastAddress()) return -1;
            HttpRequest req = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "catalogue-link-check").GET().build();
            return NO_REDIRECT.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
        } catch (Exception e) {
            return -1;
        }
    }
}
