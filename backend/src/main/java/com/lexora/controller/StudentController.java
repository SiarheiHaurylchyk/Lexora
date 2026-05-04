package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Endpoints for the "my students" / "my teachers" feature.
 * A teacher can add a student by email; a student can see who their teachers are.
 */
@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired private TeacherStudentRepository linkRepository;
    @Autowired private UserRepository userRepository;

    /** GET /api/students/my-students  — list students of the current user (acting as teacher). */
    @GetMapping("/my-students")
    public ResponseEntity<?> myStudents(Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        List<TeacherStudent> links = linkRepository.findByTeacherOrderByCreatedAtDesc(me);
        return ResponseEntity.ok(links.stream()
                .map(l -> toLinkResponse(l, l.getStudent(), true))
                .collect(Collectors.toList()));
    }

    /** GET /api/students/my-teachers  — list teachers of the current user (acting as student). */
    @GetMapping("/my-teachers")
    public ResponseEntity<?> myTeachers(Authentication auth) {
        User me = currentUser(auth);
        List<TeacherStudent> links = linkRepository.findByStudentOrderByCreatedAtDesc(me);
        return ResponseEntity.ok(links.stream()
                .map(l -> toLinkResponse(l, l.getTeacher(), false))
                .collect(Collectors.toList()));
    }

    /** POST /api/students  — current user adds a student by email. */
    @PostMapping
    @Transactional
    public ResponseEntity<?> addStudent(@Valid @RequestBody Dto.AddStudentRequest req, Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        User student = userRepository.findByEmail(req.email)
                .orElse(null);

        if (student == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse(
                    "No user with this email. Ask them to sign up first.", false));
        }
        if (student.getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "You cannot add yourself.", false));
        }
        if (linkRepository.existsByTeacherAndStudent(me, student)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "This student is already on your list.", false));
        }

        TeacherStudent link = linkRepository.save(TeacherStudent.builder()
                .teacher(me)
                .student(student)
                .build());

        return ResponseEntity.ok(toLinkResponse(link, student, true));
    }

    /**
     * POST /api/students/connect-teacher — current user becomes the student of the given teacher.
     * Idempotent: if the link already exists, returns it. Lets learners start chatting without booking a slot.
     */
    @PostMapping("/connect-teacher")
    @Transactional
    public ResponseEntity<?> connectTeacher(@Valid @RequestBody Dto.ConnectTeacherRequest req,
                                            Authentication auth) {
        User me = currentUser(auth);
        User teacher = userRepository.findById(req.teacherId)
                .orElse(null);
        if (teacher == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse("Teacher not found", false));
        }
        if (!teacher.canTeach()) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "That user is not a teacher account.", false));
        }
        if (teacher.getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "You cannot connect to yourself.", false));
        }

        Optional<TeacherStudent> existing = linkRepository.findByTeacherAndStudent(teacher, me);
        if (existing.isPresent()) {
            return ResponseEntity.ok(toLinkResponse(existing.get(), teacher, false));
        }

        TeacherStudent link = linkRepository.save(TeacherStudent.builder()
                .teacher(teacher)
                .student(me)
                .build());
        return ResponseEntity.ok(toLinkResponse(link, teacher, false));
    }

    /** Teacher-only: save private notes about a linked student (only you can read them). */
    @PatchMapping("/my-students/{linkId}/notes")
    @Transactional
    public ResponseEntity<?> patchStudentNotes(@PathVariable Long linkId,
                                               @RequestBody Dto.StudentNotesPatchRequest req,
                                               Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teacher accounts only", false));
        }
        TeacherStudent link = linkRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Link not found"));
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        String notes = req.privateNotes == null ? null : req.privateNotes.trim();
        link.setPrivateNotes(notes == null || notes.isEmpty() ? null : notes);
        linkRepository.save(link);
        return ResponseEntity.ok(toLinkResponse(link, link.getStudent(), true));
    }

    /** DELETE /api/students/{linkId}  — remove a student from the current teacher's list. */
    @DeleteMapping("/{linkId}")
    @Transactional
    public ResponseEntity<?> removeStudent(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        TeacherStudent link = linkRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Link not found"));
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        linkRepository.delete(link);
        return ResponseEntity.ok(new Dto.MessageResponse("Student removed", true));
    }

    private Dto.StudentLinkResponse toLinkResponse(TeacherStudent link, User other, boolean includePrivateNotes) {
        Dto.UserDTO userDto = Dto.UserDTO.builder()
                .id(other.getId())
                .username(other.getUsername())
                .email(other.getEmail())
                .displayName(other.getDisplayName())
                .avatarUrl(other.getAvatarUrl())
                .role(other.getRole() != null ? other.getRole().name() : "USER")
                .createdAt(other.getCreatedAt())
                .build();
        if (includePrivateNotes) {
            return Dto.StudentLinkResponse.builder()
                    .linkId(link.getId())
                    .createdAt(link.getCreatedAt())
                    .user(userDto)
                    .privateNotes(link.getPrivateNotes())
                    .build();
        }
        return Dto.StudentLinkResponse.builder()
                .linkId(link.getId())
                .createdAt(link.getCreatedAt())
                .user(userDto)
                .build();
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
