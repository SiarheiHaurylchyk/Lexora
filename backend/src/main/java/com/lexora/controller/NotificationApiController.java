package com.lexora.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lexora.dto.Dto;
import com.lexora.entity.AppNotification;
import com.lexora.entity.User;
import com.lexora.repository.AppNotificationRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** In-app notification inbox (bell menu in the SPA). */
@RestController
@RequestMapping("/api/me/notifications")
public class NotificationApiController {

    @Autowired private AppNotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Dto.AppNotificationDTO>> list(Authentication auth) {
        User me = currentUser(auth);
        return ResponseEntity.ok(notificationRepository.findTop50ByRecipientOrderByCreatedAtDesc(me).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public ResponseEntity<java.util.Map<String, Long>> unreadCount(Authentication auth) {
        User me = currentUser(auth);
        long n = notificationRepository.countByRecipientAndReadIsFalse(me);
        return ResponseEntity.ok(Collections.singletonMap("count", n));
    }

    @PatchMapping("/{id}/read")
    @Transactional
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        User me = currentUser(auth);
        AppNotification n = notificationRepository.findById(id).orElse(null);
        if (n == null || !n.getRecipient().getId().equals(me.getId())) {
            return ResponseEntity.notFound().build();
        }
        n.setRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(toDto(n));
    }

    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<?> markAllRead(Authentication auth) {
        User me = currentUser(auth);
        notificationRepository.markAllReadForRecipient(me);
        return ResponseEntity.ok(new Dto.MessageResponse("OK", true));
    }

    private Map<String, Object> parseContext(String json) {
        if (json == null || json.trim().isEmpty()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() { });
        } catch (Exception e) {
            return null;
        }
    }

    private Dto.AppNotificationDTO toDto(AppNotification n) {
        return Dto.AppNotificationDTO.builder()
                .id(n.getId())
                .title(n.getTitle())
                .body(n.getBody())
                .href(n.getHref())
                .read(Boolean.TRUE.equals(n.getRead()))
                .createdAt(n.getCreatedAt())
                .category(n.getCategory())
                .kind(n.getKind())
                .context(parseContext(n.getContextJson()))
                .build();
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
