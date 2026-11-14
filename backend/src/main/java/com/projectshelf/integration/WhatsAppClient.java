package com.projectshelf.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.projectshelf.common.SafeHttp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * WhatsApp Business Platform - Cloud API (https://developers.facebook.com/docs/whatsapp/cloud-api).
 * Business-initiated messages must use a template approved by Meta, so engagement messages are sent as
 * the configured template with the approved draft text as its single body parameter.
 * This is different from click-to-chat links (wa.me), which only open a chat on the visitor's own device.
 */
@Component
public class WhatsAppClient {
    private final RestClient http;
    private final String token, phoneNumberId, templateName, templateLang;

    public WhatsAppClient(@Value("${app.whatsapp.api-url}") String apiUrl, @Value("${app.whatsapp.access-token}") String token,
                          @Value("${app.whatsapp.phone-number-id}") String phoneNumberId,
                          @Value("${app.whatsapp.template-name}") String templateName, @Value("${app.whatsapp.template-lang}") String templateLang) {
        this.http = SafeHttp.client(apiUrl);
        this.token = token.trim();
        this.phoneNumberId = phoneNumberId.trim();
        this.templateName = templateName.trim();
        this.templateLang = templateLang.trim();
    }

    public boolean configured() {
        return !token.isEmpty() && !phoneNumberId.isEmpty();
    }

    public boolean templateConfigured() {
        return configured() && !templateName.isEmpty();
    }

    /** Sends the approved template with one body parameter. Returns the WhatsApp message id. */
    public String sendTemplate(String toPhone, String bodyText) {
        if (!templateConfigured()) throw new IllegalStateException("WhatsApp is not configured (access token, phone number id and an approved template).");
        // template parameters cannot contain newlines, tabs or more than four consecutive spaces
        String param = bodyText.replaceAll("[\\r\\n\\t]+", " ").replaceAll(" {2,}", " ").trim();
        if (param.length() > 1000) param = param.substring(0, 1000);
        Map<String, Object> body = Map.of("messaging_product", "whatsapp", "to", toPhone.replaceAll("[^0-9]", ""), "type", "template",
                "template", Map.of("name", templateName, "language", Map.of("code", templateLang),
                        "components", List.of(Map.of("type", "body", "parameters", List.of(Map.of("type", "text", "text", param))))));
        JsonNode r = http.post().uri("/{id}/messages", phoneNumberId).headers(h -> h.setBearerAuth(token)).body(body).retrieve().body(JsonNode.class);
        return r == null ? null : r.at("/messages/0/id").asText(null);
    }

    /** Real authenticated read of the business phone number. */
    public String test() {
        if (!configured()) throw new IllegalStateException("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set.");
        JsonNode r = http.get().uri("/{id}?fields=display_phone_number,verified_name,quality_rating", phoneNumberId)
                .headers(h -> h.setBearerAuth(token)).retrieve().body(JsonNode.class);
        return "Connected to " + r.path("verified_name").asText("?") + " (" + r.path("display_phone_number").asText("?") + ")"
                + (templateName.isEmpty() ? ". No template configured yet: set WHATSAPP_TEMPLATE_NAME before sending." : ". Template: " + templateName);
    }
}
