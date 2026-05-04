package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherReview;
import com.lexora.entity.User;
import com.lexora.repository.TeacherReviewRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;

/**
 * Learners (and other accounts) may leave one review per teacher profile.
 */
@RestController
@RequestMapping("/api/teachers")
public class TeacherReviewController {

    @Autowired private UserRepository userRepository;
    @Autowired private TeacherReviewRepository teacherReviewRepository;

    /**
     * Create or update the caller’s review for this teacher.
     * Cannot review your own public teacher profile.
     */
    @PostMapping("/{teacherId}/reviews")
    @Transactional
    public ResponseEntity<?> upsertReview(
            @PathVariable Long teacherId,
            @Valid @RequestBody Dto.TeacherReviewRequest req,
            Authentication auth) {
        User reviewer = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        User teacher = userRepository.findById(teacherId)
                .orElse(null);
        if (teacher == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isListedTeacher(teacher)) {
            return ResponseEntity.badRequest()
                    .body(new Dto.MessageResponse("Not a public teacher profile", false));
        }
        if (teacher.getId().equals(reviewer.getId())) {
            return ResponseEntity.badRequest()
                    .body(new Dto.MessageResponse("You cannot review your own profile", false));
        }

        String comment = req.comment == null ? null : req.comment.trim();
        if (comment != null && comment.isEmpty()) {
            comment = null;
        }

        TeacherReview existing = teacherReviewRepository.findByTeacherAndStudent(teacher, reviewer).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        TeacherReview saved;
        if (existing != null) {
            existing.setRating(req.rating);
            existing.setComment(comment);
            existing.setUpdatedAt(now);
            saved = teacherReviewRepository.save(existing);
        } else {
            saved = teacherReviewRepository.save(TeacherReview.builder()
                    .teacher(teacher)
                    .student(reviewer)
                    .rating(req.rating)
                    .comment(comment)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }

        return ResponseEntity.ok(toDto(saved, true));
    }

    private static boolean isListedTeacher(User u) {
        return u.getRole() == User.Role.TEACHER
                && (u.getShowInTeacherDirectory() == null || Boolean.TRUE.equals(u.getShowInTeacherDirectory()));
    }

    private static Dto.TeacherReviewDTO toDto(TeacherReview r, boolean mine) {
        User s = r.getStudent();
        return Dto.TeacherReviewDTO.builder()
                .id(r.getId())
                .authorDisplayName(s.getDisplayName() != null ? s.getDisplayName() : s.getUsername())
                .authorAvatarUrl(s.getAvatarUrl())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .mine(mine)
                .build();
    }
}
