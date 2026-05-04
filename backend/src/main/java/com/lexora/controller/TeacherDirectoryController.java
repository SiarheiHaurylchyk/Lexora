package com.lexora.controller;

import com.lexora.service.TeacherDirectoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Public teacher discovery (similar idea to marketplace tutor listings).
 * GET endpoints are open so guests could browse in the future; the SPA uses them logged in.
 */
@RestController
@RequestMapping("/api/teachers")
public class TeacherDirectoryController {

    @Autowired private TeacherDirectoryService teacherDirectoryService;

    /** Paged directory with filters (language, speaks, rate, video, specialties) and search. */
    @GetMapping("/directory")
    public ResponseEntity<?> directory(
            @RequestParam(required = false) String lang,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String speaks,
            @RequestParam(required = false) String minRate,
            @RequestParam(required = false) String maxRate,
            @RequestParam(required = false) String hasVideo,
            @RequestParam(required = false) String trial,
            @RequestParam(required = false) String specialties,
            @RequestParam(defaultValue = "new") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Sort sortObj = resolveSort(sort);
        Pageable pageable = PageRequest.of(page, size, sortObj);
        return ResponseEntity.ok(teacherDirectoryService.list(
                lang,
                q,
                speaks,
                parseDecimal(minRate),
                parseDecimal(maxRate),
                parseBoolFlag(hasVideo),
                specialties,
                parseBoolFlag(trial),
                pageable));
    }

    /**
     * {@code new} — newest first; {@code rate} — lowest hourly rate first (nulls last);
     * {@code rate_desc} — highest rate first.
     */
    private static Sort resolveSort(String sort) {
        if ("rate".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.asc("hourlyRate").nullsLast())
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        if ("rate_desc".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.desc("hourlyRate").nullsLast())
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private static BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            BigDecimal v = new BigDecimal(raw.trim());
            return v.signum() < 0 ? null : v;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Accepts {@code true} / {@code 1} when filtering to teachers with an intro video URL. */
    private static Boolean parseBoolFlag(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String s = raw.trim();
        if ("true".equalsIgnoreCase(s) || "1".equals(s)) {
            return Boolean.TRUE;
        }
        return null;
    }

    /** Full public profile with sample public decks. */
    @GetMapping("/{id}")
    public ResponseEntity<?> teacher(@PathVariable Long id, Authentication auth) {
        return teacherDirectoryService.findPublicTeacher(id, auth)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
