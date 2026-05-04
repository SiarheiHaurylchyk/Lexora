package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.Lesson;
import com.lexora.entity.LessonBlock;
import com.lexora.entity.LessonSection;
import com.lexora.entity.StudentAssignment;
import com.lexora.entity.StudentAssignment.ResponseMode;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.LessonBlockRepository;
import com.lexora.repository.LessonRepository;
import com.lexora.repository.LessonSectionRepository;
import com.lexora.repository.StudentAssignmentRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import com.lexora.service.BuiltInCallService;
import com.lexora.service.ClassroomTimerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Shared classroom per {@link TeacherStudent} link: lazy-created video room, recording consent, homework list.
 */
@RestController
public class ClassroomController {

    @Autowired private TeacherStudentRepository teacherStudentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentAssignmentRepository assignmentRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private LessonBlockRepository lessonBlockRepository;
    @Autowired private LessonSectionRepository lessonSectionRepository;
    @Autowired private BuiltInCallService builtInCallService;
    @Autowired private ClassroomTimerService classroomTimerService;

    @GetMapping("/api/me/classrooms/{linkId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> workspace(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        return ResponseEntity.ok(buildWorkspace(link, me));
    }

    /** GET /api/me/classrooms/{linkId}/lesson-focus — pinned lesson id + teacher navigation cue (cheap poll). */
    @GetMapping("/api/me/classrooms/{linkId}/lesson-focus")
    @Transactional(readOnly = true)
    public ResponseEntity<?> lessonFocusSnapshot(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        return ResponseEntity.ok(Dto.ClassroomLessonFocusSnapshotDTO.builder()
                .activeLessonId(link.getActiveLessonId())
                .lessonFocusBlockId(link.getLessonFocusBlockId())
                .lessonFocusLessonSectionId(link.getLessonFocusLessonSectionId())
                .lessonFocusSection(link.getLessonFocusSection())
                .lessonFocusSerial(lessonFocusSerialOrZero(link))
                .build());
    }

    @PostMapping("/api/me/classrooms/{linkId}/prepare-call")
    @Transactional
    public ResponseEntity<?> prepareCall(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (link.getCallRoomId() == null || link.getCallRoomId().trim().isEmpty()) {
            link.setCallRoomId("Lexora-" + UUID.randomUUID());
            teacherStudentRepository.save(link);
        }
        return ResponseEntity.ok(Dto.PrepareCallResponse.builder()
                .builtInCallUrl(builtInCallService.roomUrl(link.getCallRoomId()))
                .build());
    }

    @PatchMapping("/api/me/classrooms/{linkId}/recording-consent")
    @Transactional
    public ResponseEntity<?> patchRecordingConsent(@PathVariable Long linkId,
                                                   @RequestBody Dto.RecordingConsentPatchRequest req,
                                                   Authentication auth) {
        if (req.consent == null) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("consent is required", false));
        }
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        boolean isTeacher = link.getTeacher().getId().equals(me.getId());
        if (isTeacher) {
            link.setTeacherRecordingConsent(req.consent);
        } else {
            link.setStudentRecordingConsent(req.consent);
        }
        teacherStudentRepository.save(link);
        return ResponseEntity.ok(buildWorkspace(link, me));
    }

    /** GET /api/me/classrooms/{linkId}/eligible-lessons — lessons switchable in this class (teacher + student views differ). */
    @GetMapping("/api/me/classrooms/{linkId}/eligible-lessons")
    @Transactional(readOnly = true)
    public ResponseEntity<?> eligibleLessons(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        User teacher = link.getTeacher();
        User studentUser = link.getStudent();
        List<Dto.ClassroomLessonOptionDTO> out = new ArrayList<>();
        if (teacher.getId().equals(me.getId())) {
            for (Lesson l : lessonRepository.findByTeacherOrderByUpdatedAtDesc(teacher)) {
                if (teacherMayUseLessonInClassroom(l, link)) {
                    out.add(Dto.ClassroomLessonOptionDTO.builder()
                            .id(l.getId())
                            .title(l.getTitle())
                            .draft(l.getStudent() == null)
                            .build());
                }
            }
        } else if (studentUser.getId().equals(me.getId())) {
            for (Lesson l : lessonRepository.findByStudentOrderByUpdatedAtDesc(studentUser)) {
                if (l.getTeacher().getId().equals(teacher.getId())
                        && l.getStudent() != null
                        && l.getStudent().getId().equals(studentUser.getId())) {
                    out.add(Dto.ClassroomLessonOptionDTO.builder()
                            .id(l.getId())
                            .title(l.getTitle())
                            .draft(false)
                            .build());
                }
            }
        } else {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        return ResponseEntity.ok(out);
    }

    /**
     * PATCH /api/me/classrooms/{linkId}/active-lesson — teacher pins/clears lesson;
     * student switches among lessons explicitly shared with them for this pair.
     */
    @PatchMapping("/api/me/classrooms/{linkId}/active-lesson")
    @Transactional
    public ResponseEntity<?> patchActiveLesson(@PathVariable Long linkId,
                                               @RequestBody Dto.ClassroomActiveLessonPatchRequest req,
                                               Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        boolean asTeacher = link.getTeacher().getId().equals(me.getId());
        boolean asStudent = link.getStudent().getId().equals(me.getId());
        if (!asTeacher && !asStudent) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        if (req.lessonId == null) {
            if (!asTeacher) {
                return ResponseEntity.status(403).body(new Dto.MessageResponse(
                        "Only the teacher can clear the class lesson", false));
            }
            link.setActiveLessonId(null);
            link.setLessonFocusBlockId(null);
            link.setLessonFocusLessonSectionId(null);
            link.setLessonFocusSection(null);
        } else {
            Lesson lesson = lessonRepository.findById(req.lessonId)
                    .orElseThrow(() -> new RuntimeException("Lesson not found"));
            if (asTeacher) {
                if (!teacherMayUseLessonInClassroom(lesson, link)) {
                    return ResponseEntity.status(400).body(new Dto.MessageResponse(
                            "Lesson must belong to you and target this student (or no student).", false));
                }
            } else {
                if (!studentMaySelectLessonInClassroom(lesson, link)) {
                    return ResponseEntity.status(400).body(new Dto.MessageResponse(
                            "This lesson is not shared with you for this class", false));
                }
            }
            link.setActiveLessonId(req.lessonId);
            link.setLessonFocusBlockId(null);
            link.setLessonFocusLessonSectionId(null);
            link.setLessonFocusSection(null);
        }
        bumpLessonFocusSerial(link);
        teacherStudentRepository.save(link);
        return ResponseEntity.ok(buildWorkspace(link, me));
    }

    private boolean studentMaySelectLessonInClassroom(Lesson lesson, TeacherStudent link) {
        if (!lesson.getTeacher().getId().equals(link.getTeacher().getId())) {
            return false;
        }
        return lesson.getStudent() != null && lesson.getStudent().getId().equals(link.getStudent().getId());
    }

    /** PATCH /api/me/classrooms/{linkId}/lesson-focus — teacher syncs everyone's scroll position. */
    @PatchMapping("/api/me/classrooms/{linkId}/lesson-focus")
    @Transactional
    public ResponseEntity<?> patchLessonFocus(@PathVariable Long linkId,
                                              @Valid @RequestBody Dto.ClassroomLessonFocusPatchRequest req,
                                              Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Only the teacher can move the class view", false));
        }
        String sec = req.section == null ? "" : req.section.trim().toUpperCase();
        if (!"LESSON_SECTION".equals(sec) && !"BLOCK".equals(sec) && !"VIDEO".equals(sec) && !"RECORDING".equals(sec)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "section must be LESSON_SECTION, BLOCK, VIDEO, or RECORDING", false));
        }
        Long activeId = link.getActiveLessonId();
        if ("LESSON_SECTION".equals(sec)) {
            if (activeId == null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse("Choose a lesson before focusing a section", false));
            }
            if (req.lessonSectionId == null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse("lessonSectionId is required for LESSON_SECTION", false));
            }
            LessonSection ls = lessonSectionRepository.findById(req.lessonSectionId)
                    .orElseThrow(() -> new RuntimeException("Lesson section not found"));
            if (!ls.getLesson().getId().equals(activeId)) {
                return ResponseEntity.status(400).body(new Dto.MessageResponse("Section does not belong to the active lesson", false));
            }
            link.setLessonFocusLessonSectionId(req.lessonSectionId);
            link.setLessonFocusBlockId(null);
            link.setLessonFocusSection("LESSON_SECTION");
        } else if ("BLOCK".equals(sec)) {
            if (activeId == null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse("Choose a lesson before focusing a block", false));
            }
            if (req.blockId == null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse("blockId is required for BLOCK", false));
            }
            LessonBlock block = lessonBlockRepository.findById(req.blockId)
                    .orElseThrow(() -> new RuntimeException("Block not found"));
            if (!block.getLesson().getId().equals(activeId)) {
                return ResponseEntity.status(400).body(new Dto.MessageResponse("Block does not belong to the active lesson", false));
            }
            link.setLessonFocusBlockId(req.blockId);
            link.setLessonFocusLessonSectionId(null);
            link.setLessonFocusSection("BLOCK");
        } else {
            link.setLessonFocusBlockId(null);
            link.setLessonFocusLessonSectionId(null);
            link.setLessonFocusSection(sec);
        }
        bumpLessonFocusSerial(link);
        teacherStudentRepository.save(link);
        return ResponseEntity.ok(buildWorkspace(link, me));
    }

    @GetMapping("/api/me/classrooms/{linkId}/timer")
    public ResponseEntity<?> getTimer(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        return ResponseEntity.ok(classroomTimerService.snapshot(linkId));
    }

    @PostMapping("/api/me/classrooms/{linkId}/timer/start")
    public ResponseEntity<?> startTimer(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Only the teacher can start the timer", false));
        }
        return ResponseEntity.ok(classroomTimerService.start(linkId));
    }

    @PostMapping("/api/me/classrooms/{linkId}/timer/stop")
    public ResponseEntity<?> stopTimer(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Only the teacher can stop the timer", false));
        }
        return ResponseEntity.ok(classroomTimerService.stop(linkId));
    }

    @PostMapping("/api/me/classrooms/{linkId}/timer/reset")
    public ResponseEntity<?> resetTimer(@PathVariable Long linkId, Authentication auth) {
        User me = currentUser(auth);
        TeacherStudent link = teacherStudentRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Classroom not found"));
        if (!isParticipant(me, link)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Only the teacher can reset the timer", false));
        }
        return ResponseEntity.ok(classroomTimerService.reset(linkId));
    }

    private boolean isParticipant(User me, TeacherStudent link) {
        return link.getTeacher().getId().equals(me.getId())
                || link.getStudent().getId().equals(me.getId());
    }

    private Dto.ClassroomWorkspaceDTO buildWorkspace(TeacherStudent link, User viewer) {
        boolean asTeacher = link.getTeacher().getId().equals(viewer.getId());
        User peer = asTeacher ? link.getStudent() : link.getTeacher();
        Long linkId = link.getId();
        boolean prepared = link.getCallRoomId() != null && !link.getCallRoomId().trim().isEmpty();
        List<StudentAssignment> assignments = assignmentRepository
                .findByTeacherStudentLinkIdOrderByCreatedAtDesc(linkId);
        return Dto.ClassroomWorkspaceDTO.builder()
                .linkId(linkId)
                .asTeacher(asTeacher)
                .peer(toUserDto(peer))
                .callRoomPrepared(prepared)
                .builtInCallUrl(prepared ? builtInCallService.roomUrl(link.getCallRoomId()) : null)
                .teacherRecordingConsent(Boolean.TRUE.equals(link.getTeacherRecordingConsent()))
                .studentRecordingConsent(Boolean.TRUE.equals(link.getStudentRecordingConsent()))
                .recordingAllowed(Boolean.TRUE.equals(link.getTeacherRecordingConsent())
                        && Boolean.TRUE.equals(link.getStudentRecordingConsent()))
                .assignments(assignments.stream().map(this::assignmentToDto).collect(Collectors.toList()))
                .activeLessonId(link.getActiveLessonId())
                .lessonFocusBlockId(link.getLessonFocusBlockId())
                .lessonFocusLessonSectionId(link.getLessonFocusLessonSectionId())
                .lessonFocusSection(link.getLessonFocusSection())
                .lessonFocusSerial(lessonFocusSerialOrZero(link))
                .build();
    }

    private static long lessonFocusSerialOrZero(TeacherStudent link) {
        Long s = link.getLessonFocusSerial();
        return s != null ? s : 0L;
    }

    private static void bumpLessonFocusSerial(TeacherStudent link) {
        link.setLessonFocusSerial(lessonFocusSerialOrZero(link) + 1);
    }

    private boolean teacherMayUseLessonInClassroom(Lesson lesson, TeacherStudent link) {
        if (!lesson.getTeacher().getId().equals(link.getTeacher().getId())) {
            return false;
        }
        User ls = lesson.getStudent();
        if (ls == null) {
            return true;
        }
        return ls.getId().equals(link.getStudent().getId());
    }

    private Dto.UserDTO toUserDto(User u) {
        return Dto.UserDTO.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .displayName(u.getDisplayName())
                .avatarUrl(u.getAvatarUrl())
                .role(u.getRole().name())
                .build();
    }

    private Dto.StudentAssignmentDTO assignmentToDto(StudentAssignment a) {
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
