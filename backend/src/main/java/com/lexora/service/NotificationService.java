package com.lexora.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lexora.entity.AppNotification;
import com.lexora.entity.User;
import com.lexora.repository.AppNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * In-app notifications. Prefer {@link #notifyEvent} with a {@code kind} + JSON context so the SPA can localize.
 */
@Service
public class NotificationService {

    @Autowired
    private AppNotificationRepository appNotificationRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Transactional
    public void notify(User recipient, String title, String body, String href) {
        notifyEvent(recipient, null, null, null, title, body, href);
    }

    /**
     * Structured notification: {@code kind} drives client i18n; {@code context} is serialized to JSON.
     * {@code title} / {@code body} remain English fallbacks for older clients and logs.
     */
    @Transactional
    public void notifyEvent(User recipient, String category, String kind, Map<String, Object> context,
                            String title, String body, String href) {
        if (recipient == null) {
            return;
        }
        String ctxJson = null;
        if (context != null && !context.isEmpty()) {
            try {
                ctxJson = objectMapper.writeValueAsString(context);
            } catch (JsonProcessingException ignored) {
                ctxJson = null;
            }
        }
        String t = title;
        if (t == null || t.trim().isEmpty()) {
            t = kind != null && !kind.isEmpty() ? kind : "Notification";
        } else if (t.length() > 200) {
            t = t.substring(0, 197) + "…";
        }
        appNotificationRepository.save(AppNotification.builder()
                .recipient(recipient)
                .category(category)
                .kind(kind)
                .contextJson(ctxJson)
                .title(t)
                .body(body)
                .href(href)
                .read(false)
                .build());
    }
}
