package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.Card;
import com.lexora.entity.Deck;
import com.lexora.entity.Lesson;
import com.lexora.entity.LessonBlock;
import com.lexora.entity.LessonSection;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.CardRepository;
import com.lexora.repository.DeckRepository;
import com.lexora.repository.LessonBlockRepository;
import com.lexora.repository.LessonRepository;
import com.lexora.repository.LessonSectionRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Endpoints for lessons. A lesson is a page that a teacher prepares for a student.
 * It is built from blocks: text notes, article excerpts, YouTube videos, links, images.
 *
 * Access rules:
 *  - The teacher (creator) can read, edit, and delete the lesson.
 *  - The student set on the lesson can read it.
 *  - Anyone else gets 403.
 */
@RestController
@RequestMapping("/api/lessons")
public class LessonController {

    @Autowired private LessonRepository lessonRepository;
    @Autowired private LessonBlockRepository blockRepository;
    @Autowired private LessonSectionRepository lessonSectionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DeckRepository deckRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;

    /* ===== Lesson list ===== */

    /** GET /api/lessons/my-teaching — lessons that I (the teacher) created. */
    @GetMapping("/my-teaching")
    @Transactional(readOnly = true)
    public ResponseEntity<?> myLessons(Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<Lesson> list = lessonRepository.findByTeacherOrderByUpdatedAtDesc(me);
        return ResponseEntity.ok(list.stream().map(this::toLessonLight).collect(Collectors.toList()));
    }

    /** GET /api/lessons/my-learning — lessons that a teacher prepared for me (the student). */
    @GetMapping("/my-learning")
    @Transactional(readOnly = true)
    public ResponseEntity<?> learningLessons(Authentication auth) {
        User me = currentUser(auth);
        List<Lesson> list = lessonRepository.findByStudentOrderByUpdatedAtDesc(me);
        return ResponseEntity.ok(list.stream().map(this::toLessonLight).collect(Collectors.toList()));
    }

    /* ===== Single lesson ===== */

    /**
     * GET /api/lessons/{id} — full lesson with sections/blocks.
     * Optional {@code classroomLinkId}: student may load the lesson currently pinned for that shared class
     * (including teacher drafts once pinned).
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getLesson(@PathVariable Long id,
                                        @RequestParam(required = false) Long classroomLinkId,
                                        Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!canRead(lesson, me)) {
            if (classroomLinkId == null || !canReadActiveLessonViaClassroom(lesson, me, classroomLinkId)) {
                return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
            }
        }
        return ResponseEntity.ok(toLessonFull(lesson));
    }

    /** Student reads pinned draft/active lesson inside a classroom link they belong to. */
    private boolean canReadActiveLessonViaClassroom(Lesson lesson, User me, Long classroomLinkId) {
        TeacherStudent link = teacherStudentRepository.findById(classroomLinkId).orElse(null);
        if (link == null) {
            return false;
        }
        if (!link.getStudent().getId().equals(me.getId())) {
            return false;
        }
        if (!link.getTeacher().getId().equals(lesson.getTeacher().getId())) {
            return false;
        }
        if (!Objects.equals(link.getActiveLessonId(), lesson.getId())) {
            return false;
        }
        return lesson.getStudent() == null || lesson.getStudent().getId().equals(me.getId());
    }

    /** POST /api/lessons — create a new (empty) lesson. */
    @PostMapping
    @Transactional
    public ResponseEntity<?> createLesson(@Valid @RequestBody Dto.LessonRequest req, Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        User student = req.studentId != null ? userRepository.findById(req.studentId).orElse(null) : null;

        Lesson lesson = Lesson.builder()
                .title(req.title)
                .summary(req.summary)
                .teacher(me)
                .student(student)
                .updatedAt(LocalDateTime.now())
                .build();

        lesson = lessonRepository.save(lesson);
        LessonSection warm = LessonSection.builder()
                .lesson(lesson)
                .title("Warm up")
                .sortOrder(0)
                .build();
        lessonSectionRepository.save(warm);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);

        return ResponseEntity.ok(toLessonFull(lessonRepository.findById(lesson.getId()).orElseThrow(() -> new RuntimeException("Lesson not found"))));
    }

    /** PUT /api/lessons/{id} — update title / summary / target student. Teacher only. */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateLesson(@PathVariable Long id,
                                           @Valid @RequestBody Dto.LessonRequest req,
                                           Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        lesson.setTitle(req.title);
        lesson.setSummary(req.summary);
        lesson.setStudent(req.studentId != null ? userRepository.findById(req.studentId).orElse(null) : null);
        lesson.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(toLessonFull(lessonRepository.save(lesson)));
    }

    /** DELETE /api/lessons/{id} — delete the lesson and all its blocks. Teacher only. */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteLesson(@PathVariable Long id, Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        lessonRepository.delete(lesson);
        return ResponseEntity.ok(new Dto.MessageResponse("Lesson deleted", true));
    }

    /* ===== Blocks ===== */

    /** POST /api/lessons/{id}/blocks — add a new block to the lesson. Teacher only. */
    @PostMapping("/{id}/blocks")
    @Transactional
    public ResponseEntity<?> addBlock(@PathVariable Long id,
                                       @Valid @RequestBody Dto.LessonBlockRequest req,
                                       Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        if (req.sectionId == null) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("sectionId is required", false));
        }
        LessonSection sec = lessonSectionRepository.findById(req.sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));
        if (!sec.getLesson().getId().equals(lesson.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Section does not belong to this lesson", false));
        }
        List<LessonBlock> inSec = blockRepository.findBySection_IdOrderBySortOrderAsc(sec.getId());
        int nextOrder = req.sortOrder != null
                ? req.sortOrder
                : inSec.stream().mapToInt(this::sortVal).max().orElse(-1) + 1;

        LessonBlock block = LessonBlock.builder()
                .lesson(lesson)
                .section(sec)
                .type(LessonBlock.BlockType.valueOf(req.type))
                .title(req.title)
                .content(req.content)
                .extra(req.extra)
                .sortOrder(nextOrder)
                .build();

        block = blockRepository.save(block);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);

        return ResponseEntity.ok(toBlockResponse(block));
    }

    /** PUT /api/lessons/{id}/blocks/{blockId} — update an existing block. Teacher only. */
    @PutMapping("/{id}/blocks/{blockId}")
    @Transactional
    public ResponseEntity<?> updateBlock(@PathVariable Long id,
                                          @PathVariable Long blockId,
                                          @Valid @RequestBody Dto.LessonBlockRequest req,
                                          Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        LessonBlock block = blockRepository.findById(blockId)
                .orElseThrow(() -> new RuntimeException("Block not found"));
        if (!block.getLesson().getId().equals(lesson.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong lesson", false));
        }

        block.setType(LessonBlock.BlockType.valueOf(req.type));
        block.setTitle(req.title);
        block.setContent(req.content);
        block.setExtra(req.extra);
        if (req.sortOrder != null) {
            block.setSortOrder(req.sortOrder);
        }
        if (req.sectionId != null) {
            LessonSection sec = lessonSectionRepository.findById(req.sectionId)
                    .orElseThrow(() -> new RuntimeException("Section not found"));
            if (!sec.getLesson().getId().equals(lesson.getId())) {
                return ResponseEntity.status(400).body(new Dto.MessageResponse("Section does not belong to this lesson", false));
            }
            block.setSection(sec);
        }

        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);

        return ResponseEntity.ok(toBlockResponse(blockRepository.save(block)));
    }

    /** DELETE /api/lessons/{id}/blocks/{blockId} — remove a block. Teacher only. */
    @DeleteMapping("/{id}/blocks/{blockId}")
    @Transactional
    public ResponseEntity<?> deleteBlock(@PathVariable Long id,
                                          @PathVariable Long blockId,
                                          Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        LessonBlock block = blockRepository.findById(blockId)
                .orElseThrow(() -> new RuntimeException("Block not found"));
        if (!block.getLesson().getId().equals(lesson.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong lesson", false));
        }
        blockRepository.delete(block);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);
        return ResponseEntity.ok(new Dto.MessageResponse("Block deleted", true));
    }

    /* ===== Sections (sidebar pages within a lesson) ===== */

    /** POST /api/lessons/{id}/sections — add a section. Teacher only. */
    @PostMapping("/{id}/sections")
    @Transactional
    public ResponseEntity<?> addSection(@PathVariable Long id,
                                        @Valid @RequestBody Dto.LessonSectionRequest req,
                                        Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        List<LessonSection> existing = lessonSectionRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId());
        int nextOrder = req.sortOrder != null
                ? req.sortOrder
                : existing.stream().mapToInt(this::sectionSortVal).max().orElse(-1) + 1;
        LessonSection sec = LessonSection.builder()
                .lesson(lesson)
                .title(req.title.trim())
                .sortOrder(nextOrder)
                .build();
        lessonSectionRepository.save(sec);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);
        return ResponseEntity.ok(toLessonFull(lessonRepository.findById(lesson.getId()).orElseThrow(() -> new RuntimeException("Lesson not found"))));
    }

    /** PUT /api/lessons/{id}/sections/{sectionId} — rename / reorder. Teacher only. */
    @PutMapping("/{id}/sections/{sectionId}")
    @Transactional
    public ResponseEntity<?> updateSection(@PathVariable Long id,
                                            @PathVariable Long sectionId,
                                            @Valid @RequestBody Dto.LessonSectionRequest req,
                                            Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        LessonSection sec = lessonSectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));
        if (!sec.getLesson().getId().equals(lesson.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong lesson", false));
        }
        sec.setTitle(req.title.trim());
        if (req.sortOrder != null) {
            sec.setSortOrder(req.sortOrder);
        }
        lessonSectionRepository.save(sec);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);
        return ResponseEntity.ok(toLessonFull(lessonRepository.findById(lesson.getId()).orElseThrow(() -> new RuntimeException("Lesson not found"))));
    }

    /** DELETE /api/lessons/{id}/sections/{sectionId} — remove section and its blocks. Teacher only. */
    @DeleteMapping("/{id}/sections/{sectionId}")
    @Transactional
    public ResponseEntity<?> deleteSection(@PathVariable Long id,
                                            @PathVariable Long sectionId,
                                            Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        List<LessonSection> all = lessonSectionRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId());
        if (all.size() <= 1) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("A lesson must keep at least one section", false));
        }
        LessonSection sec = lessonSectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));
        if (!sec.getLesson().getId().equals(lesson.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong lesson", false));
        }
        lessonSectionRepository.delete(sec);
        lesson.setUpdatedAt(LocalDateTime.now());
        lessonRepository.save(lesson);
        return ResponseEntity.ok(toLessonFull(lessonRepository.findById(lesson.getId()).orElseThrow(() -> new RuntimeException("Lesson not found"))));
    }

    /**
     * Creates a private deck owned by the teacher with one card per phrase extracted from TEXT / ARTICLE / NOTE blocks.
     */
    @PostMapping("/{id}/deck-from-blocks")
    @Transactional
    public ResponseEntity<?> deckFromBlocks(@PathVariable Long id, Authentication auth) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));
        User me = currentUser(auth);
        if (!isTeacher(lesson, me)) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        List<String> phrases = extractPhrases(lesson);
        if (phrases.isEmpty()) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "No phrases found — add text, article, or note blocks first.", false));
        }

        String[] langs = inferDeckLanguages(lesson);
        Deck deck = Deck.builder()
                .title(trimDeckTitle(lesson.getTitle()) + " — phrases")
                .description("Auto-built from lesson #" + lesson.getId())
                .coverColor("#6C63FF")
                .emoji("🧩")
                .sourceLanguage(langs[0])
                .targetLanguage(langs[1])
                .visibility(Deck.Visibility.PRIVATE)
                .owner(me)
                .updatedAt(LocalDateTime.now())
                .viewCount(0)
                .studyCount(0)
                .build();
        deck = deckRepository.save(deck);

        int ord = 0;
        for (String phrase : phrases) {
            cardRepository.save(Card.builder()
                    .deck(deck)
                    .term(phrase)
                    .definition(phrase)
                    .sortOrder(ord++)
                    .build());
        }

        deck.setUpdatedAt(LocalDateTime.now());
        deckRepository.save(deck);
        return ResponseEntity.ok(toDeckResponse(deck));
    }

    /* ===== Helpers ===== */

    private static String trimDeckTitle(String title) {
        if (title == null) {
            return "Lesson";
        }
        String t = title.trim();
        return t.isEmpty() ? "Lesson" : (t.length() > 80 ? t.substring(0, 80) : t);
    }

    private String[] inferDeckLanguages(Lesson lesson) {
        User student = lesson.getStudent();
        User teacher = lesson.getTeacher();
        String learn = "en";
        if (student != null && student.getLearningLanguage() != null
                && !student.getLearningLanguage().trim().isEmpty()) {
            learn = student.getLearningLanguage().trim().toLowerCase();
        }
        String target = learn;
        if (teacher.getTeachesLanguages() != null && !teacher.getTeachesLanguages().trim().isEmpty()) {
            String[] parts = teacher.getTeachesLanguages().split(",");
            if (parts.length > 0 && !parts[0].trim().isEmpty()) {
                target = parts[0].trim().toLowerCase();
            }
        }
        return new String[]{learn, target};
    }

    private List<String> extractPhrases(Lesson lesson) {
        List<LessonBlock> blocks = new ArrayList<>(blockRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId()));
        blocks.sort(Comparator.comparingInt(this::sortVal));
        List<String> raw = new ArrayList<>();
        for (LessonBlock b : blocks) {
            if (b.getType() == LessonBlock.BlockType.TEXT
                    || b.getType() == LessonBlock.BlockType.ARTICLE
                    || b.getType() == LessonBlock.BlockType.NOTE) {
                appendPhrasesFromText(raw, b.getTitle());
                appendPhrasesFromText(raw, b.getContent());
            }
        }
        return dedupePhrases(raw, 200);
    }

    private int sortVal(LessonBlock b) {
        return b.getSortOrder() != null ? b.getSortOrder() : 0;
    }

    private void appendPhrasesFromText(List<String> out, String text) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }
        String normalized = text.replace("\r\n", "\n").trim();
        for (String para : normalized.split("\n\n+")) {
            for (String line : para.split("\n")) {
                line = line.trim();
                if (line.length() < 3) {
                    continue;
                }
                if (line.length() <= 240) {
                    out.add(clamp(line, 500));
                } else {
                    String[] sentences = line.split("(?<=[.!?])\\s+");
                    for (String sent : sentences) {
                        String s = sent.trim();
                        if (s.length() >= 3) {
                            out.add(clamp(s, 500));
                        }
                    }
                }
            }
        }
    }

    private static String clamp(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private List<String> dedupePhrases(List<String> phrases, int maxCards) {
        Set<String> seen = new HashSet<>();
        List<String> out = new ArrayList<>();
        for (String p : phrases) {
            if (out.size() >= maxCards) {
                break;
            }
            String key = p.trim().toLowerCase();
            if (key.length() < 3 || seen.contains(key)) {
                continue;
            }
            seen.add(key);
            out.add(p.trim());
        }
        return out;
    }

    private Dto.DeckResponse toDeckResponse(Deck deck) {
        List<Card> cards = cardRepository.findByDeckOrderBySortOrder(deck);
        User owner = deck.getOwner();
        return Dto.DeckResponse.builder()
                .id(deck.getId())
                .title(deck.getTitle())
                .description(deck.getDescription())
                .coverColor(deck.getCoverColor())
                .emoji(deck.getEmoji())
                .sourceLanguage(deck.getSourceLanguage())
                .targetLanguage(deck.getTargetLanguage())
                .visibility(deck.getVisibility().name())
                .owner(owner != null ? toUserDTO(owner) : null)
                .cards(cards.stream().map(this::toCardResponse).collect(Collectors.toList()))
                .cardCount(cards.size())
                .createdAt(deck.getCreatedAt())
                .updatedAt(deck.getUpdatedAt())
                .viewCount(deck.getViewCount())
                .studyCount(deck.getStudyCount())
                .build();
    }

    private Dto.CardResponse toCardResponse(Card c) {
        return Dto.CardResponse.builder()
                .id(c.getId())
                .term(c.getTerm())
                .definition(c.getDefinition())
                .example(c.getExample())
                .transcription(c.getTranscription())
                .termImageUrl(c.getTermImageUrl())
                .definitionImageUrl(c.getDefinitionImageUrl())
                .sortOrder(c.getSortOrder())
                .build();
    }

    private boolean isTeacher(Lesson lesson, User me) {
        return lesson.getTeacher().getId().equals(me.getId());
    }

    private boolean canRead(Lesson lesson, User me) {
        if (isTeacher(lesson, me)) return true;
        return lesson.getStudent() != null && lesson.getStudent().getId().equals(me.getId());
    }

    private Dto.LessonResponse toLessonLight(Lesson lesson) {
        return Dto.LessonResponse.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .summary(lesson.getSummary())
                .teacher(toUserDTO(lesson.getTeacher()))
                .student(lesson.getStudent() != null ? toUserDTO(lesson.getStudent()) : null)
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .build();
    }

    private Dto.LessonResponse toLessonFull(Lesson lesson) {
        Dto.LessonResponse base = toLessonLight(lesson);
        List<LessonSection> secs = lessonSectionRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId());
        base.setSections(secs.stream().map(this::toSectionResponse).collect(Collectors.toList()));
        return base;
    }

    private Dto.LessonSectionResponse toSectionResponse(LessonSection s) {
        List<LessonBlock> blocks = blockRepository.findBySection_IdOrderBySortOrderAsc(s.getId());
        return Dto.LessonSectionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .sortOrder(s.getSortOrder())
                .blocks(blocks.stream().map(this::toBlockResponse).collect(Collectors.toList()))
                .build();
    }

    private Dto.LessonBlockResponse toBlockResponse(LessonBlock b) {
        return Dto.LessonBlockResponse.builder()
                .id(b.getId())
                .type(b.getType().name())
                .title(b.getTitle())
                .content(b.getContent())
                .extra(b.getExtra())
                .sortOrder(b.getSortOrder())
                .sectionId(b.getSection() != null ? b.getSection().getId() : null)
                .build();
    }

    private int sectionSortVal(LessonSection s) {
        return s.getSortOrder() != null ? s.getSortOrder() : 0;
    }

    private Dto.UserDTO toUserDTO(User u) {
        return Dto.UserDTO.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .displayName(u.getDisplayName())
                .avatarUrl(u.getAvatarUrl())
                .role(u.getRole() != null ? u.getRole().name() : "USER")
                .createdAt(u.getCreatedAt())
                .build();
    }

    private int orZero(Integer v) { return v != null ? v : 0; }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
