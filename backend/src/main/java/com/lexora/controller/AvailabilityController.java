package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherSlot;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.TeacherSlotRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import com.lexora.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Teacher availability endpoints.
 *
 * Two URL groups:
 *   /api/me/availability        — current user's own calendar (teacher accounts only).
 *   /api/teachers/{id}/availability — public read; booking with auth.
 */
@RestController
public class AvailabilityController {

    @Autowired private TeacherSlotRepository slotRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;
    @Autowired private NotificationService notificationService;

    /* ---------------------------- Teacher CRUD ---------------------------- */

    @GetMapping("/api/me/availability")
    @Transactional(readOnly = true)
    public ResponseEntity<?> myAvailability(@RequestParam String from,
                                            @RequestParam String to,
                                            Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        LocalDateTime fromTs = LocalDateTime.parse(from);
        LocalDateTime toTs = LocalDateTime.parse(to);
        List<TeacherSlot> slots = slotRepository
                .findByTeacherAndStartTimeBetweenOrderByStartTimeAsc(me, fromTs, toTs);
        return ResponseEntity.ok(slots.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @PostMapping("/api/me/availability")
    @Transactional
    public ResponseEntity<?> createSlot(@Valid @RequestBody Dto.TeacherSlotRequest req,
                                        Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        LocalDateTime startTs;
        LocalDateTime endTs;
        try {
            startTs = LocalDateTime.parse(req.startTime);
            endTs = LocalDateTime.parse(req.endTime);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Invalid date/time format. Use ISO-8601.", false));
        }
        ResponseEntity<?> windowErr = validateSlotWindow(startTs, endTs);
        if (windowErr != null) {
            return windowErr;
        }
        if (slotRepository.existsByTeacherAndStartTimeLessThanAndEndTimeGreaterThan(me, endTs, startTs)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "This time overlaps another slot.", false));
        }

        TeacherSlot.Status status = parseStatus(req.status, TeacherSlot.Status.OPEN);
        if (status == TeacherSlot.Status.BOOKED) {
            // BOOKED is only set through the booking endpoint.
            status = TeacherSlot.Status.OPEN;
        }

        String title = null;
        String description = null;
        if (status == TeacherSlot.Status.BLOCKED) {
            title = normalizeOptionalText(req.title, 40);
            description = normalizeOptionalText(req.description, 500);
        }

        TeacherSlot slot = slotRepository.save(TeacherSlot.builder()
                .teacher(me)
                .startTime(startTs)
                .endTime(endTs)
                .status(status)
                .title(title)
                .description(description)
                .build());
        return ResponseEntity.ok(toDto(slot));
    }

    /**
     * Update slot: toggle OPEN/BLOCKED, move/reschedule times, or edit personal-event text.
     * BOOKED slots may change start/end only (student gets an in-app notification).
     */
    @PatchMapping("/api/me/availability/{slotId}")
    @Transactional
    public ResponseEntity<?> patchSlot(@PathVariable Long slotId,
                                       @RequestBody Dto.TeacherSlotPatchRequest req,
                                       Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        boolean hasStatus = req.status != null && !req.status.trim().isEmpty();
        boolean hasTime = req.startTime != null && !req.startTime.trim().isEmpty()
                && req.endTime != null && !req.endTime.trim().isEmpty();
        boolean hasTitle = req.title != null;
        boolean hasDesc = req.description != null;

        if (!hasStatus && !hasTime && !hasTitle && !hasDesc) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Nothing to update.", false));
        }

        TeacherSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        if (!slot.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        if (hasTime) {
            LocalDateTime startTs;
            LocalDateTime endTs;
            try {
                startTs = LocalDateTime.parse(req.startTime.trim());
                endTs = LocalDateTime.parse(req.endTime.trim());
            } catch (RuntimeException ex) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Invalid date/time format. Use ISO-8601.", false));
            }
            ResponseEntity<?> windowErr = validateSlotWindow(startTs, endTs);
            if (windowErr != null) {
                return windowErr;
            }

            LocalDateTime oldStart = slot.getStartTime();
            LocalDateTime oldEnd = slot.getEndTime();

            if (slotRepository.existsOverlapForTeacherExcluding(me, slotId, startTs, endTs)) {
                if (!Boolean.TRUE.equals(req.shiftOverlappingSlots)) {
                    List<TeacherSlot> conflicts =
                            slotRepository.findOverlappingExcluding(me, slotId, startTs, endTs);
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Dto.AvailabilityConflictResponse.builder()
                            .message("This time overlaps another slot.")
                            .success(false)
                            .code("SLOT_OVERLAP")
                            .conflictingSlots(conflicts.stream().map(this::toConflictDto).collect(Collectors.toList()))
                            .build());
                }
                return applyCascadeReschedule(me, slot, startTs, endTs, oldStart, oldEnd);
            }

            applySlotTimeMove(slot, startTs, endTs, me);
        }

        if (hasStatus) {
            if (slot.getStatus() == TeacherSlot.Status.BOOKED) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Cancel the booking before changing this slot.", false));
            }
            TeacherSlot.Status newStatus = parseStatus(req.status.trim(), null);
            if (newStatus != TeacherSlot.Status.OPEN && newStatus != TeacherSlot.Status.BLOCKED) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "status must be OPEN or BLOCKED", false));
            }
            slot.setStatus(newStatus);
            if (newStatus == TeacherSlot.Status.OPEN) {
                slot.setTitle(null);
                slot.setDescription(null);
            }
        }

        if (hasTitle || hasDesc) {
            if (slot.getStatus() != TeacherSlot.Status.BLOCKED) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Title and description apply only to blocked (personal) slots.", false));
            }
            if (hasTitle) {
                slot.setTitle(normalizeOptionalText(req.title, 40));
            }
            if (hasDesc) {
                slot.setDescription(normalizeOptionalText(req.description, 500));
            }
        }

        slotRepository.save(slot);
        return ResponseEntity.ok(toDto(slot));
    }

    @DeleteMapping("/api/me/availability/{slotId}")
    @Transactional
    public ResponseEntity<?> deleteSlot(@PathVariable Long slotId, Authentication auth) {
        User me = currentUser(auth);
        TeacherSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        if (!slot.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        slotRepository.delete(slot);
        return ResponseEntity.ok(new Dto.MessageResponse("Slot removed", true));
    }

    /**
     * Teacher pastes a video-call link on a BOOKED slot; the student sees it on “My bookings”.
     */
    @PatchMapping("/api/me/availability/{slotId}/meeting-url")
    @Transactional
    public ResponseEntity<?> patchMeetingUrl(@PathVariable Long slotId,
                                             @RequestBody Dto.MeetingUrlRequest req,
                                             Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teacher accounts only", false));
        }
        TeacherSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        if (!slot.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (slot.getStatus() != TeacherSlot.Status.BOOKED) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Meeting link can only be set on a booked slot.", false));
        }
        String url = req.meetingUrl == null ? null : req.meetingUrl.trim();
        if (url != null && url.length() > 2048) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("URL too long", false));
        }
        if (url != null && url.isEmpty()) {
            url = null;
        }
        slot.setMeetingUrl(url);
        slotRepository.save(slot);
        return ResponseEntity.ok(toDto(slot));
    }

    /**
     * Release a BOOKED slot back to OPEN.
     * — Teacher (slot owner): anytime.
     * — Learner who booked: only if the lesson starts more than 24 hours from now.
     */
    @DeleteMapping("/api/me/availability/{slotId}/booking")
    @Transactional
    public ResponseEntity<?> cancelBooking(@PathVariable Long slotId, Authentication auth) {
        User me = currentUser(auth);
        TeacherSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        if (slot.getStatus() != TeacherSlot.Status.BOOKED) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Slot is not booked", false));
        }
        boolean isTeacher = slot.getTeacher().getId().equals(me.getId());
        boolean isBookedLearner = slot.getBookedBy() != null && slot.getBookedBy().getId().equals(me.getId());
        if (!isTeacher && !isBookedLearner) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (isBookedLearner) {
            LocalDateTime earliestAllowedStart = LocalDateTime.now().plusHours(24);
            if (!slot.getStartTime().isAfter(earliestAllowedStart)) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "You can only cancel more than 24 hours before the lesson.", false));
            }
        }

        User teacherRow = slot.getTeacher();
        User studentRow = slot.getBookedBy();
        LocalDateTime bookedStart = slot.getStartTime();
        LocalDateTime bookedEnd = slot.getEndTime();
        Long linkIdWhenBooked = null;
        if (teacherRow != null && studentRow != null) {
            linkIdWhenBooked = teacherStudentRepository.findByTeacherAndStudent(teacherRow, studentRow)
                    .map(TeacherStudent::getId).orElse(null);
        }

        slot.setStatus(TeacherSlot.Status.OPEN);
        slot.setBookedBy(null);
        slot.setMeetingUrl(null);
        slot.setReminderEmailSent(false);
        slotRepository.save(slot);

        if (isTeacher && studentRow != null && teacherRow != null) {
            Map<String, Object> ctx = new HashMap<>();
            ctx.put("teacherName", displayName(teacherRow));
            ctx.put("startIso", bookedStart.toString());
            ctx.put("endIso", bookedEnd.toString());
            ctx.put("classroomLinkId", linkIdWhenBooked);
            notificationService.notifyEvent(studentRow, "BOOKING", "booking_cancelled_by_teacher", ctx,
                    "Lesson cancelled",
                    displayName(teacherRow) + " cancelled your lesson scheduled for " + bookedStart + ".",
                    "/bookings");
        }
        if (isBookedLearner && teacherRow != null && studentRow != null) {
            Map<String, Object> ctx = new HashMap<>();
            ctx.put("studentName", displayName(studentRow));
            ctx.put("startIso", bookedStart.toString());
            ctx.put("endIso", bookedEnd.toString());
            ctx.put("classroomLinkId", linkIdWhenBooked);
            notificationService.notifyEvent(teacherRow, "BOOKING", "booking_cancelled_by_student", ctx,
                    "Booking cancelled",
                    displayName(studentRow) + " cancelled the lesson at " + bookedStart + ".",
                    "/schedule");
        }

        return ResponseEntity.ok(toDto(slot));
    }

    /* ---------------------- Public availability + booking ----------------- */

    /**
     * Learner-facing week view: OPEN (bookable) and BOOKED (busy — shown as striped in UI).
     * Signed-in learners get {@code bookedByMe} on slots they reserved.
     */
    @GetMapping("/api/teachers/{teacherId}/availability")
    @Transactional(readOnly = true)
    public ResponseEntity<?> teacherAvailability(@PathVariable Long teacherId,
                                                  @RequestParam String from,
                                                  @RequestParam String to,
                                                  Authentication auth) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        if (!teacher.canTeach()) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse("Not a teacher", false));
        }
        LocalDateTime fromTs = LocalDateTime.parse(from);
        LocalDateTime toTs = LocalDateTime.parse(to);
        List<TeacherSlot> slots = slotRepository
                .findByTeacherAndStartTimeBetweenOrderByStartTimeAsc(teacher, fromTs, toTs);
        User viewer = viewerFrom(auth);
        return ResponseEntity.ok(slots.stream()
                .filter(s -> s.getStatus() == TeacherSlot.Status.OPEN
                        || s.getStatus() == TeacherSlot.Status.BOOKED)
                .map(s -> toPublicDto(s, viewer))
                .collect(Collectors.toList()));
    }

    /** Book a single slot. Auto-creates a teacher-student link if needed. */
    @PostMapping("/api/teachers/{teacherId}/availability/{slotId}/book")
    @Transactional
    public ResponseEntity<?> bookSlot(@PathVariable Long teacherId,
                                       @PathVariable Long slotId,
                                       Authentication auth) {
        User me = currentUser(auth);
        TeacherSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        if (!slot.getTeacher().getId().equals(teacherId)) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong teacher", false));
        }
        if (slot.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "You cannot book your own slot.", false));
        }
        if (slot.getStatus() != TeacherSlot.Status.OPEN) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "This slot is not available.", false));
        }
        slot.setStatus(TeacherSlot.Status.BOOKED);
        slot.setBookedBy(me);
        slotRepository.save(slot);

        TeacherStudent link;
        if (!teacherStudentRepository.existsByTeacherAndStudent(slot.getTeacher(), me)) {
            link = teacherStudentRepository.save(TeacherStudent.builder()
                    .teacher(slot.getTeacher())
                    .student(me)
                    .build());
        } else {
            link = teacherStudentRepository.findByTeacherAndStudent(slot.getTeacher(), me)
                    .orElseThrow(() -> new RuntimeException("Teacher-student link missing"));
        }

        User teacher = slot.getTeacher();
        String learnerName = displayName(me);
        String teacherName = displayName(teacher);
        String classHref = "/class/" + link.getId();
        Map<String, Object> ctxTeacher = new HashMap<>();
        ctxTeacher.put("peerName", learnerName);
        ctxTeacher.put("studentName", learnerName);
        ctxTeacher.put("teacherName", teacherName);
        ctxTeacher.put("startIso", slot.getStartTime().toString());
        ctxTeacher.put("endIso", slot.getEndTime().toString());
        ctxTeacher.put("classroomLinkId", link.getId());
        notificationService.notifyEvent(teacher, "BOOKING", "booking_new_teacher", ctxTeacher,
                "New booking",
                learnerName + " booked a lesson at " + slot.getStartTime()
                        + ". Open your shared classroom for calls and homework.",
                classHref);
        Map<String, Object> ctxStudent = new HashMap<>();
        ctxStudent.put("peerName", teacherName);
        ctxStudent.put("studentName", learnerName);
        ctxStudent.put("teacherName", teacherName);
        ctxStudent.put("startIso", slot.getStartTime().toString());
        ctxStudent.put("endIso", slot.getEndTime().toString());
        ctxStudent.put("classroomLinkId", link.getId());
        notificationService.notifyEvent(me, "BOOKING", "booking_new_student", ctxStudent,
                "Lesson booked",
                "With " + teacherName + " — " + slot.getStartTime() + ". Video and homework: shared classroom.",
                classHref);

        return ResponseEntity.ok(toDto(slot));
    }

    /* ------------------------------ helpers ------------------------------- */

    private static boolean intervalsOverlap(LocalDateTime aStart, LocalDateTime aEnd,
                                          LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
    }

    private static LocalDateTime earlier(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }

    private static LocalDateTime later(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private void applySlotTimeMove(TeacherSlot slot, LocalDateTime startTs, LocalDateTime endTs, User teacher) {
        boolean timeChanged = !startTs.equals(slot.getStartTime()) || !endTs.equals(slot.getEndTime());
        slot.setStartTime(startTs);
        slot.setEndTime(endTs);
        if (timeChanged && slot.getStatus() == TeacherSlot.Status.BOOKED) {
            slot.setReminderEmailSent(false);
            User student = slot.getBookedBy();
            if (student != null) {
                notifyBookingRescheduled(student, teacher, startTs, endTs);
            }
        }
    }

    private Dto.ConflictingSlotDTO toConflictDto(TeacherSlot s) {
        String bookedName = null;
        if (s.getBookedBy() != null) {
            bookedName = displayName(s.getBookedBy());
        }
        return Dto.ConflictingSlotDTO.builder()
                .id(s.getId())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus().name())
                .bookedByName(bookedName)
                .build();
    }

    private LocalDateTime[] projectInterval(TeacherSlot s, Long movingId, LocalDateTime newStart, LocalDateTime newEnd,
                                            Set<Long> shiftIds, long deltaMinutes) {
        if (s.getId().equals(movingId)) {
            return new LocalDateTime[]{newStart, newEnd};
        }
        if (shiftIds.contains(s.getId())) {
            return new LocalDateTime[]{
                    s.getStartTime().plusMinutes(deltaMinutes),
                    s.getEndTime().plusMinutes(deltaMinutes)
            };
        }
        return new LocalDateTime[]{s.getStartTime(), s.getEndTime()};
    }

    private Set<Long> computeShiftCluster(Long movingId, LocalDateTime newStart, LocalDateTime newEnd,
                                          List<TeacherSlot> all, long deltaMinutes) {
        Map<Long, TeacherSlot> byId = all.stream().collect(Collectors.toMap(TeacherSlot::getId, Function.identity()));
        Set<Long> shiftIds = new LinkedHashSet<>();
        Deque<Long> queue = new ArrayDeque<>();

        for (TeacherSlot s : all) {
            if (s.getId().equals(movingId)) {
                continue;
            }
            if (intervalsOverlap(newStart, newEnd, s.getStartTime(), s.getEndTime())) {
                queue.add(s.getId());
            }
        }

        while (!queue.isEmpty()) {
            Long id = queue.poll();
            if (!shiftIds.add(id)) {
                continue;
            }
            TeacherSlot s = byId.get(id);
            if (s == null) {
                continue;
            }
            LocalDateTime sShiftStart = s.getStartTime().plusMinutes(deltaMinutes);
            LocalDateTime sShiftEnd = s.getEndTime().plusMinutes(deltaMinutes);

            for (TeacherSlot o : all) {
                if (o.getId().equals(movingId)) {
                    continue;
                }
                LocalDateTime oStart = shiftIds.contains(o.getId())
                        ? o.getStartTime().plusMinutes(deltaMinutes)
                        : o.getStartTime();
                LocalDateTime oEnd = shiftIds.contains(o.getId())
                        ? o.getEndTime().plusMinutes(deltaMinutes)
                        : o.getEndTime();

                if (intervalsOverlap(sShiftStart, sShiftEnd, oStart, oEnd) && !shiftIds.contains(o.getId())) {
                    queue.add(o.getId());
                }
                if (!shiftIds.contains(o.getId()) && intervalsOverlap(newStart, newEnd, oStart, oEnd)) {
                    queue.add(o.getId());
                }
            }
        }
        return shiftIds;
    }

    private TeacherSlot findSlotInList(List<TeacherSlot> all, Long id) {
        for (TeacherSlot s : all) {
            if (s.getId().equals(id)) {
                return s;
            }
        }
        return null;
    }

    /**
     * Move this slot and every overlapping / chained slot by the same start delta.
     */
    private ResponseEntity<?> applyCascadeReschedule(User me, TeacherSlot slot, LocalDateTime newStart,
                                                     LocalDateTime newEnd, LocalDateTime oldStart,
                                                     LocalDateTime oldEnd) {
        long deltaMinutes = ChronoUnit.MINUTES.between(oldStart, newStart);
        if (deltaMinutes == 0) {
            deltaMinutes = ChronoUnit.MINUTES.between(oldEnd, newEnd);
        }
        LocalDateTime from = earlier(oldStart, newStart).minusDays(2);
        LocalDateTime to = later(oldEnd, newEnd).plusDays(60);
        List<TeacherSlot> all = new ArrayList<>(
                slotRepository.findByTeacherAndStartTimeBetweenOrderByStartTimeAsc(me, from, to));

        boolean hasMoving = false;
        for (TeacherSlot s : all) {
            if (s.getId().equals(slot.getId())) {
                hasMoving = true;
                break;
            }
        }
        if (!hasMoving) {
            all.add(slot);
        }

        Set<Long> shiftIds = computeShiftCluster(slot.getId(), newStart, newEnd, all, deltaMinutes);

        for (int i = 0; i < all.size(); i++) {
            for (int j = i + 1; j < all.size(); j++) {
                TeacherSlot a = all.get(i);
                TeacherSlot b = all.get(j);
                LocalDateTime[] pa = projectInterval(a, slot.getId(), newStart, newEnd, shiftIds, deltaMinutes);
                LocalDateTime[] pb = projectInterval(b, slot.getId(), newStart, newEnd, shiftIds, deltaMinutes);
                if (intervalsOverlap(pa[0], pa[1], pb[0], pb[1])) {
                    return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                            "Could not reschedule: slots still overlap after shift. Try another time.", false));
                }
            }
        }

        ResponseEntity<?> movingWin = validateSlotWindow(newStart, newEnd);
        if (movingWin != null) {
            return movingWin;
        }
        for (Long sid : shiftIds) {
            TeacherSlot s = findSlotInList(all, sid);
            if (s == null) {
                continue;
            }
            LocalDateTime ns = s.getStartTime().plusMinutes(deltaMinutes);
            LocalDateTime ne = s.getEndTime().plusMinutes(deltaMinutes);
            ResponseEntity<?> w = validateSlotWindow(ns, ne);
            if (w != null) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "Chained reschedule would move a slot to an invalid time.", false));
            }
        }

        slot.setStartTime(newStart);
        slot.setEndTime(newEnd);
        boolean movingBooked = slot.getStatus() == TeacherSlot.Status.BOOKED;
        if (movingBooked) {
            slot.setReminderEmailSent(false);
        }

        for (Long sid : shiftIds) {
            TeacherSlot s = findSlotInList(all, sid);
            if (s == null) {
                continue;
            }
            LocalDateTime ns = s.getStartTime().plusMinutes(deltaMinutes);
            LocalDateTime ne = s.getEndTime().plusMinutes(deltaMinutes);
            boolean changed = !ns.equals(s.getStartTime()) || !ne.equals(s.getEndTime());
            s.setStartTime(ns);
            s.setEndTime(ne);
            if (changed && s.getStatus() == TeacherSlot.Status.BOOKED) {
                s.setReminderEmailSent(false);
                User st = s.getBookedBy();
                if (st != null) {
                    notifyBookingRescheduled(st, me, ns, ne);
                }
            }
            slotRepository.save(s);
        }

        slotRepository.save(slot);
        if (movingBooked) {
            User student = slot.getBookedBy();
            if (student != null) {
                notifyBookingRescheduled(student, me, newStart, newEnd);
            }
        }

        return ResponseEntity.ok(toDto(slot));
    }

    private TeacherSlot.Status parseStatus(String value, TeacherSlot.Status fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        try {
            return TeacherSlot.Status.valueOf(value.trim().toUpperCase());
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    /** Null-safe trim; empty → null; clamp length. */
    private static String normalizeOptionalText(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > maxLen ? t.substring(0, maxLen) : t;
    }

    private ResponseEntity<?> validateSlotWindow(LocalDateTime startTs, LocalDateTime endTs) {
        if (!endTs.isAfter(startTs)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "End time must be after start time.", false));
        }
        long minutes = ChronoUnit.MINUTES.between(startTs, endTs);
        if (minutes < 15) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Slot must be at least 15 minutes.", false));
        }
        if (minutes > 8 * 60) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Slot cannot be longer than 8 hours.", false));
        }
        if (startTs.isBefore(LocalDateTime.now().minusMinutes(1))) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Start time cannot be in the past.", false));
        }
        return null;
    }

    private Dto.TeacherSlotDTO toDto(TeacherSlot s) {
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
        User te = s.getTeacher();
        Dto.UserDTO teacherDto = Dto.UserDTO.builder()
                .id(te.getId())
                .username(te.getUsername())
                .email(te.getEmail())
                .displayName(te.getDisplayName())
                .avatarUrl(te.getAvatarUrl())
                .role(te.getRole().name())
                .build();
        Dto.TeacherSlotDTO dto = Dto.TeacherSlotDTO.builder()
                .id(s.getId())
                .teacherId(te.getId())
                .teacher(teacherDto)
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus().name())
                .bookedBy(booked)
                .meetingUrl(s.getMeetingUrl())
                .title(s.getTitle())
                .description(s.getDescription())
                .build();
        attachClassroomLink(dto, s, te);
        return dto;
    }

    private Dto.TeacherSlotDTO toPublicDto(TeacherSlot s, User viewer) {
        Boolean bookedByMe = Boolean.FALSE;
        if (s.getStatus() == TeacherSlot.Status.BOOKED && viewer != null && s.getBookedBy() != null) {
            bookedByMe = viewer.getId().equals(s.getBookedBy().getId());
        }
        String meeting = Boolean.TRUE.equals(bookedByMe) ? s.getMeetingUrl() : null;
        Dto.TeacherSlotDTO dto = Dto.TeacherSlotDTO.builder()
                .id(s.getId())
                .teacherId(s.getTeacher().getId())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus().name())
                .bookedByMe(bookedByMe)
                .meetingUrl(meeting)
                .build();
        if (Boolean.TRUE.equals(bookedByMe)) {
            attachClassroomLink(dto, s, viewer);
        }
        return dto;
    }

    /** BOOKED slots: classroom link id for the teacher ↔ booked student pair (participant only). */
    private void attachClassroomLink(Dto.TeacherSlotDTO dto, TeacherSlot s, User viewer) {
        if (s.getStatus() != TeacherSlot.Status.BOOKED || s.getBookedBy() == null || viewer == null) {
            return;
        }
        boolean participant = s.getTeacher().getId().equals(viewer.getId())
                || s.getBookedBy().getId().equals(viewer.getId());
        if (!participant) {
            return;
        }
        teacherStudentRepository.findByTeacherAndStudent(s.getTeacher(), s.getBookedBy())
                .ifPresent(link -> dto.setClassroomLinkId(link.getId()));
    }

    private void notifyBookingRescheduled(User student, User teacher, LocalDateTime start, LocalDateTime end) {
        if (student == null || teacher == null) {
            return;
        }
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("teacherName", displayName(teacher));
        ctx.put("startIso", start.toString());
        ctx.put("endIso", end.toString());
        notificationService.notifyEvent(student, "BOOKING", "booking_rescheduled", ctx,
                "Lesson rescheduled",
                displayName(teacher) + " moved your lesson to " + start + ".",
                "/bookings");
    }

    private static String displayName(User u) {
        if (u.getDisplayName() != null && !u.getDisplayName().trim().isEmpty()) {
            return u.getDisplayName().trim();
        }
        return u.getUsername();
    }

    /** Signed-in user, or null for anonymous requests. */
    private User viewerFrom(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
