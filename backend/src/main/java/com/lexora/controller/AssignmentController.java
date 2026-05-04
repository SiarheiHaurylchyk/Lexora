package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.Deck;
import com.lexora.entity.Lesson;
import com.lexora.entity.StudentAssignment;
import com.lexora.entity.StudentAssignment.ResponseMode;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.DeckRepository;
import com.lexora.repository.LessonRepository;
import com.lexora.repository.StudentAssignmentRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import com.lexora.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Simple homework rows: teacher assigns text (+ optional deck + due date) to a linked student.
 */
@RestController
@RequestMapping("/api/me/assignments")
public class AssignmentController {

    @Autowired private StudentAssignmentRepository assignmentRepository;
    @Autowired private TeacherStudentRepository linkRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DeckRepository deckRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private NotificationService notificationService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Dto.AssignmentsViewDTO> listMine(Authentication auth) {
        User me = currentUser(auth);
        List<StudentAssignment> incoming = assignmentRepository.findByStudentOrderByCreatedAtDesc(me);
        List<StudentAssignment> outgoing = me.canTeach()
                ? assignmentRepository.findByTeacherOrderByCreatedAtDesc(me)
                : java.util.Collections.emptyList();
        return ResponseEntity.ok(Dto.AssignmentsViewDTO.builder()
                .received(incoming.stream().map(this::toDto).collect(Collectors.toList()))
                .sent(outgoing.stream().map(this::toDto).collect(Collectors.toList()))
                .build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@Valid @RequestBody Dto.CreateAssignmentRequest req, Authentication auth) {
        User teacher = currentUser(auth);
        if (!teacher.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        User student = userRepository.findById(req.studentUserId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        TeacherStudent linkRow = linkRepository.findByTeacherAndStudent(teacher, student).orElse(null);
        if (linkRow == null) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Add this person as your student first.", false));
        }
        if (req.deckId != null) {
            Deck deck = deckRepository.findById(req.deckId).orElse(null);
            if (deck == null || deck.getOwner() == null || !deck.getOwner().getId().equals(teacher.getId())) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Deck must belong to you.", false));
            }
        }

        Long lessonIdToSave = null;
        if (req.lessonId != null) {
            Lesson lesson = lessonRepository.findById(req.lessonId).orElse(null);
            if (lesson == null || !lesson.getTeacher().getId().equals(teacher.getId())) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Lesson not found.", false));
            }
            if (lesson.getStudent() == null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Assign this lesson to a student first, then you can send homework from it.", false));
            }
            if (!lesson.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Pick the same student this lesson is prepared for.", false));
            }
            lessonIdToSave = lesson.getId();
        }

        ResponseMode mode = ResponseMode.TEXT;
        if (req.responseMode != null && !req.responseMode.trim().isEmpty()) {
            try {
                mode = ResponseMode.valueOf(req.responseMode.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "responseMode must be TEXT, AUDIO_LINK, or READ_ALOUD", false));
            }
        }

        StudentAssignment saved = assignmentRepository.save(StudentAssignment.builder()
                .teacher(teacher)
                .student(student)
                .teacherStudentLinkId(linkRow.getId())
                .title(req.title.trim())
                .instructions(req.instructions == null ? null : req.instructions.trim())
                .responseMode(mode)
                .deckId(req.deckId)
                .lessonId(lessonIdToSave)
                .dueDate(req.dueDate)
                .completedByStudent(false)
                .build());

        String who = displayName(teacher);
        Map<String, Object> ctxNew = new HashMap<>();
        ctxNew.put("teacherName", who);
        ctxNew.put("assignmentTitle", saved.getTitle());
        ctxNew.put("classroomLinkId", linkRow.getId());
        notificationService.notifyEvent(student, "ASSIGNMENT", "assignment_new", ctxNew,
                "New assignment",
                who + ": " + saved.getTitle(),
                "/class/" + linkRow.getId());

        return ResponseEntity.ok(toDto(saved));
    }

    @PatchMapping("/{id}/complete")
    @Transactional
    public ResponseEntity<?> markComplete(@PathVariable Long id, Authentication auth) {
        User me = currentUser(auth);
        StudentAssignment a = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!a.getStudent().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        a.setCompletedByStudent(true);
        assignmentRepository.save(a);
        Map<String, Object> ctxDone = new HashMap<>();
        ctxDone.put("studentName", displayName(me));
        ctxDone.put("assignmentTitle", a.getTitle());
        notificationService.notifyEvent(a.getTeacher(), "ASSIGNMENT", "assignment_completed", ctxDone,
                "Assignment completed",
                displayName(me) + " finished: " + a.getTitle(),
                "/students");
        return ResponseEntity.ok(toDto(a));
    }

    /** Learner submits homework (text, audio link, or read-aloud notes). */
    @PatchMapping("/{id}/response")
    @Transactional
    public ResponseEntity<?> patchStudentResponse(@PathVariable Long id,
                                                   @RequestBody Dto.StudentAssignmentResponsePatchRequest req,
                                                   Authentication auth) {
        User me = currentUser(auth);
        StudentAssignment a = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!a.getStudent().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        String text = req.studentResponse == null ? null : req.studentResponse.trim();
        if (text != null && text.isEmpty()) {
            text = null;
        }
        a.setStudentResponse(text);
        assignmentRepository.save(a);
        Map<String, Object> ctxHw = new HashMap<>();
        ctxHw.put("studentName", displayName(me));
        ctxHw.put("assignmentTitle", a.getTitle());
        notificationService.notifyEvent(a.getTeacher(), "ASSIGNMENT", "assignment_response_updated", ctxHw,
                "Homework updated",
                displayName(me) + " updated: " + a.getTitle(),
                "/assignments");
        return ResponseEntity.ok(toDto(a));
    }

    private Dto.StudentAssignmentDTO toDto(StudentAssignment a) {
        User teacher = a.getTeacher();
        User student = a.getStudent();
        return Dto.StudentAssignmentDTO.builder()
                .id(a.getId())
                .teacherId(teacher.getId())
                .teacherName(displayName(teacher))
                .studentId(student.getId())
                .studentName(displayName(student))
                .title(a.getTitle())
                .instructions(a.getInstructions())
                .deckId(a.getDeckId())
                .lessonId(a.getLessonId())
                .dueDate(a.getDueDate())
                .completedByStudent(Boolean.TRUE.equals(a.getCompletedByStudent()))
                .createdAt(a.getCreatedAt())
                .responseMode(a.getResponseMode() != null ? a.getResponseMode().name() : ResponseMode.TEXT.name())
                .studentResponse(a.getStudentResponse())
                .teacherStudentLinkId(a.getTeacherStudentLinkId())
                .build();
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
