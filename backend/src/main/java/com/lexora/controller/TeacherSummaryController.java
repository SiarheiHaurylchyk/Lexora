package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherSlot;
import com.lexora.entity.User;
import com.lexora.repository.StudentAssignmentRepository;
import com.lexora.repository.TeacherReviewRepository;
import com.lexora.repository.TeacherSlotRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/** Lightweight counts for the teacher dashboard (no charts yet). */
@RestController
@RequestMapping("/api/me/teacher-summary")
public class TeacherSummaryController {

    @Autowired private UserRepository userRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;
    @Autowired private TeacherSlotRepository teacherSlotRepository;
    @Autowired private StudentAssignmentRepository assignmentRepository;
    @Autowired private TeacherReviewRepository reviewRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> summary(Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        long linkedStudents = teacherStudentRepository.countByTeacher(me);
        long upcomingBookings = teacherSlotRepository.countByTeacherAndStatusAndStartTimeAfter(
                me, TeacherSlot.Status.BOOKED, LocalDateTime.now());
        long openAssignments = assignmentRepository.countByTeacherAndCompletedByStudentIsFalse(me);
        Double avgRaw = reviewRepository.averageRatingForTeacher(me.getId());
        Double avg = avgRaw == null ? null : Math.round(avgRaw * 10.0) / 10.0;
        long reviewCount = reviewRepository.countByTeacher(me);

        return ResponseEntity.ok(Dto.TeacherSummaryDTO.builder()
                .linkedStudents(linkedStudents)
                .upcomingBookings(upcomingBookings)
                .openAssignments(openAssignments)
                .averageRating(avg)
                .reviewCount(reviewCount)
                .build());
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
