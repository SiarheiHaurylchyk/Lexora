package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherSlot;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.TeacherSlotRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Booked-slot reminders for the UI and learner booking list.
 */
@RestController
public class BookingReminderController {

    private static final int REMINDER_WINDOW_MINUTES = 60;

    @Autowired private TeacherSlotRepository slotRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;

    /** Learner: BOOKED slots that are still in the future (my reservations). */
    @GetMapping("/api/me/booked-slots")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Dto.TeacherSlotDTO>> myBookedSlots(Authentication auth) {
        User me = currentUser(auth);
        LocalDateTime now = LocalDateTime.now();
        List<TeacherSlot> slots = slotRepository.findByBookedByAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                me, TeacherSlot.Status.BOOKED, now);
        return ResponseEntity.ok(slots.stream().map(this::toSlotDto).collect(Collectors.toList()));
    }

    /**
     * Next lesson starting within {@value #REMINDER_WINDOW_MINUTES} minutes (for toast / tooltip while online).
     */
    @GetMapping("/api/me/lesson-reminder")
    @Transactional(readOnly = true)
    public ResponseEntity<Dto.LessonReminderDTO> lessonReminder(Authentication auth) {
        User me = currentUser(auth);
        LocalDateTime now = LocalDateTime.now();

        List<TeacherSlot> asStudent = slotRepository.findByBookedByAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                me, TeacherSlot.Status.BOOKED, now);
        Optional<TeacherSlot> studentPick = pickInReminderWindow(asStudent, now);
        if (studentPick.isPresent()) {
            TeacherSlot s = studentPick.get();
            return ResponseEntity.ok(Dto.LessonReminderDTO.builder()
                    .active(true)
                    .slotId(s.getId())
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .counterpartName(displayName(s.getTeacher()))
                    .asTeacher(false)
                    .meetingUrl(s.getMeetingUrl())
                    .classroomLinkId(classroomLinkIdForSlot(s))
                    .build());
        }

        if (!me.canTeach()) {
            return ResponseEntity.ok(inactive());
        }

        List<TeacherSlot> asTeacher = slotRepository.findByTeacherAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                me, TeacherSlot.Status.BOOKED, now);
        Optional<TeacherSlot> teacherPick = pickInReminderWindow(asTeacher, now);
        if (teacherPick.isPresent()) {
            TeacherSlot s = teacherPick.get();
            User st = s.getBookedBy();
            String peer = st != null ? displayName(st) : "";
            return ResponseEntity.ok(Dto.LessonReminderDTO.builder()
                    .active(true)
                    .slotId(s.getId())
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .counterpartName(peer)
                    .asTeacher(true)
                    .meetingUrl(s.getMeetingUrl())
                    .classroomLinkId(classroomLinkIdForSlot(s))
                    .build());
        }

        return ResponseEntity.ok(inactive());
    }

    /** Soonest upcoming BOOKED slot (dashboard card). Prefers learner role; teachers see their next teaching slot if none as student. */
    @GetMapping("/api/me/next-booking")
    @Transactional(readOnly = true)
    public ResponseEntity<Dto.NextBookingDTO> nextBooking(Authentication auth) {
        User me = currentUser(auth);
        LocalDateTime now = LocalDateTime.now();

        List<TeacherSlot> asStudent = slotRepository.findByBookedByAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                me, TeacherSlot.Status.BOOKED, now);
        if (!asStudent.isEmpty()) {
            TeacherSlot s = asStudent.get(0);
            return ResponseEntity.ok(Dto.NextBookingDTO.builder()
                    .hasBooking(true)
                    .slotId(s.getId())
                    .teacherId(s.getTeacher().getId())
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .counterpartName(displayName(s.getTeacher()))
                    .meetingUrl(s.getMeetingUrl())
                    .classroomLinkId(classroomLinkIdForSlot(s))
                    .asTeacher(false)
                    .build());
        }

        if (me.canTeach()) {
            List<TeacherSlot> asTeacher = slotRepository.findByTeacherAndStatusAndEndTimeAfterOrderByStartTimeAsc(
                    me, TeacherSlot.Status.BOOKED, now);
            if (!asTeacher.isEmpty()) {
                TeacherSlot s = asTeacher.get(0);
                User st = s.getBookedBy();
                String peer = st != null ? displayName(st) : "";
                return ResponseEntity.ok(Dto.NextBookingDTO.builder()
                        .hasBooking(true)
                        .slotId(s.getId())
                        .teacherId(s.getTeacher().getId())
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .counterpartName(peer)
                        .meetingUrl(s.getMeetingUrl())
                        .classroomLinkId(classroomLinkIdForSlot(s))
                        .asTeacher(true)
                        .build());
            }
        }

        return ResponseEntity.ok(Dto.NextBookingDTO.builder().hasBooking(false).build());
    }

    private static Dto.LessonReminderDTO inactive() {
        return Dto.LessonReminderDTO.builder().active(false).build();
    }

    private Optional<TeacherSlot> pickInReminderWindow(List<TeacherSlot> slots, LocalDateTime now) {
        return slots.stream()
                .filter(s -> s.getStartTime().isAfter(now))
                .filter(s -> !now.isBefore(s.getStartTime().minusMinutes(REMINDER_WINDOW_MINUTES)))
                .min(Comparator.comparing(TeacherSlot::getStartTime));
    }

    private Long classroomLinkIdForSlot(TeacherSlot s) {
        if (s.getBookedBy() == null) {
            return null;
        }
        return teacherStudentRepository.findByTeacherAndStudent(s.getTeacher(), s.getBookedBy())
                .map(TeacherStudent::getId)
                .orElse(null);
    }

    private Dto.TeacherSlotDTO toSlotDto(TeacherSlot s) {
        User te = s.getTeacher();
        Dto.UserDTO teacherDto = Dto.UserDTO.builder()
                .id(te.getId())
                .username(te.getUsername())
                .email(te.getEmail())
                .displayName(te.getDisplayName())
                .avatarUrl(te.getAvatarUrl())
                .role(te.getRole().name())
                .build();

        Dto.UserDTO booked = null;
        if (s.getBookedBy() != null) {
            User u = s.getBookedBy();
            booked = Dto.UserDTO.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .email(u.getEmail())
                    .displayName(u.getDisplayName())
                    .avatarUrl(u.getAvatarUrl())
                    .role(u.getRole().name())
                    .build();
        }

        Dto.TeacherSlotDTO dto = Dto.TeacherSlotDTO.builder()
                .id(s.getId())
                .teacherId(te.getId())
                .teacher(teacherDto)
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus().name())
                .bookedBy(booked)
                .meetingUrl(s.getMeetingUrl())
                .classroomLinkId(classroomLinkIdForSlot(s))
                .build();
        return dto;
    }

    private static String displayName(User u) {
        if (u.getDisplayName() != null && !u.getDisplayName().trim().isEmpty()) {
            return u.getDisplayName().trim();
        }
        return u.getUsername();
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
