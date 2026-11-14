package com.projectshelf.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.projectshelf.common.SafeHttp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Resend email API (https://resend.com/docs/api-reference/emails/send-email). */
@Component
public class EmailClient {
    private final RestClient http;
    private final String apiKey, from, fromName, replyTo;

    public EmailClient(@Value("${app.email.api-url}") String apiUrl, @Value("${app.email.resend-api-key}") String apiKey,
                       @Value("${app.email.from}") String from, @Value("${app.email.from-name}") String fromName,
                       @Value("${app.email.reply-to}") String replyTo) {
        this.http = SafeHttp.client(apiUrl);
        this.apiKey = apiKey.trim();
        this.from = from.trim();
        this.fromName = fromName.trim();
        this.replyTo = replyTo.trim();
    }

    public boolean configured() {
        return !apiKey.isEmpty() && !from.isEmpty();
    }

    /** Sends one email and returns the provider's message id. Not retried automatically: a retry could send twice. */
    public String send(String to, String subject, String text, String unsubscribeUrl) {
        if (!configured()) throw new IllegalStateException("Email is not configured (RESEND_API_KEY and EMAIL_FROM).");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("from", fromName.isEmpty() ? from : fromName + " <" + from + ">");
        body.put("to", List.of(to));
        body.put("subject", subject);
        body.put("text", text);
        body.put("html", "<div style=\"font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1b1f1d\">"
                + escape(text).replace("\n", "<br>") + "</div>");
        if (!replyTo.isEmpty()) body.put("reply_to", replyTo);
        if (unsubscribeUrl != null)
            body.put("headers", Map.of("List-Unsubscribe", "<" + unsubscribeUrl + ">", "List-Unsubscribe-Post", "List-Unsubscribe=One-Click"));
        JsonNode r = http.post().uri("/emails").headers(h -> h.setBearerAuth(apiKey)).body(body).retrieve().body(JsonNode.class);
        return r == null ? null : r.path("id").asText(null);
    }

    /** Latest delivery event reported by Resend for a message (e.g. sent, delivered, bounced). */
    public String deliveryStatus(String providerMessageId) {
        JsonNode r = http.get().uri("/emails/{id}", providerMessageId).headers(h -> h.setBearerAuth(apiKey)).retrieve().body(JsonNode.class);
        return r == null ? null : r.path("last_event").asText(null);
    }

    static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
