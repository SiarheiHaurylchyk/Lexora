package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.ChatReadCursor;
import com.lexora.entity.DirectMessage;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.ChatReadCursorRepository;
import com.lexora.repository.DirectMessageRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Arrays;
import java.util.Collections;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Direct messages between users who share a {@link TeacherStudent} link.
 *
 * <p>Routes under {@code /api/chat}: inbox list, unread badge, threads, uploads, read cursors.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$");
    private static final Set<String> UPLOAD_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf")));

    @Value("${app.chat.upload-dir:uploads/chat}")
    private String chatUploadDir;

    @Autowired private DirectMessageRepository messageRepository;
    @Autowired private TeacherStudentRepository linkRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ChatReadCursorRepository cursorRepository;

    /** GET /api/chat/conversations — inbox (one row per connected teacher/student). */
    @GetMapping("/conversations")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Dto.ChatConversationDTO>> conversations(Authentication auth) {
        User me = currentUser(auth);
        List<TeacherStudent> asTeacher = linkRepository.findByTeacherOrderByCreatedAtDesc(me);
        List<TeacherStudent> asStudent = linkRepository.findByStudentOrderByCreatedAtDesc(me);

        Set<Long> seenPeerIds = new HashSet<>();
        List<Dto.ChatConversationDTO> rows = new ArrayList<>();

        for (TeacherStudent link : Stream.concat(asTeacher.stream(), asStudent.stream()).collect(Collectors.toList())) {
            User peer = link.getTeacher().getId().equals(me.getId()) ? link.getStudent() : link.getTeacher();
            if (!seenPeerIds.add(peer.getId())) {
                continue;
            }
            Long tid = link.getTeacher().getId();
            Long sid = link.getStudent().getId();
            rows.add(buildConversationRow(me, peer, tid, sid));
        }

        rows.sort(Comparator.comparing(
                (Dto.ChatConversationDTO c) -> c.lastMessageAt,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return ResponseEntity.ok(rows);
    }

    /** GET /api/chat/unread-total — sum of unread incoming messages across all threads. */
    @GetMapping("/unread-total")
    @Transactional(readOnly = true)
    public ResponseEntity<Dto.ChatUnreadTotalDTO> unreadTotal(Authentication auth) {
        User me = currentUser(auth);
        long sum = 0L;
        for (Dto.ChatConversationDTO row : collectConversationRows(me)) {
            sum += row.unreadCount;
        }
        return ResponseEntity.ok(Dto.ChatUnreadTotalDTO.builder().totalUnread(sum).build());
    }

    /** POST /api/chat/{peerUserId}/read — mark thread read (sidebar badges). */
    @PostMapping("/{peerUserId}/read")
    @Transactional
    public ResponseEntity<?> markRead(@PathVariable Long peerUserId, Authentication auth) {
        User me = currentUser(auth);
        User peer = userRepository.findById(peerUserId).orElse(null);
        if (peer == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse("User not found", false));
        }
        if (!findLink(me, peer).isPresent()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("No chat with this user", false));
        }
        LocalDateTime now = LocalDateTime.now();
        ChatReadCursor cur = cursorRepository.findByUserAndPeer(me, peer).orElse(null);
        if (cur == null) {
            cursorRepository.save(ChatReadCursor.builder().user(me).peer(peer).lastReadAt(now).build());
        } else {
            cur.setLastReadAt(now);
            cursorRepository.save(cur);
        }
        return ResponseEntity.ok(new Dto.MessageResponse("OK", true));
    }

    /** GET /api/chat/{peerUserId}/thread */
    @GetMapping("/{peerUserId}/thread")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getThread(@PathVariable Long peerUserId, Authentication auth) {
        User me = currentUser(auth);
        User peer = userRepository.findById(peerUserId).orElse(null);
        if (peer == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse("User not found", false));
        }
        TeacherStudent link = findLink(me, peer).orElse(null);
        if (link == null) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "You can only chat with someone on your teachers/students list.", false));
        }

        User teacher = link.getTeacher();
        User student = link.getStudent();
        List<DirectMessage> rows = messageRepository.findByTeacher_IdAndStudent_IdOrderByCreatedAtAsc(
                teacher.getId(), student.getId());

        Dto.ChatThreadDTO thread = new Dto.ChatThreadDTO();
        thread.peer = toUserDto(peer);
        thread.messages = rows.stream().map(this::toMessageDto).collect(Collectors.toList());
        return ResponseEntity.ok(thread);
    }

    /** POST /api/chat/{peerUserId}/messages */
    @PostMapping("/{peerUserId}/messages")
    @Transactional
    public ResponseEntity<?> sendMessage(@PathVariable Long peerUserId,
                                         @Valid @RequestBody Dto.ChatSendRequest req,
                                         Authentication auth) {
        User me = currentUser(auth);
        User peer = userRepository.findById(peerUserId).orElse(null);
        if (peer == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse("User not found", false));
        }
        TeacherStudent link = findLink(me, peer).orElse(null);
        if (link == null) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "You can only chat with someone on your teachers/students list.", false));
        }

        String body = req.body == null ? "" : req.body.trim();
        String attachmentUrl = req.attachmentUrl == null ? null : req.attachmentUrl.trim();
        String attachmentMime = req.attachmentMime == null ? null : req.attachmentMime.trim();

        if (body.isEmpty() && (attachmentUrl == null || attachmentUrl.isEmpty())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Message is empty", false));
        }
        if (attachmentUrl != null && !attachmentUrl.isEmpty()) {
            if (!attachmentUrl.startsWith("/api/chat/files/")) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse("Invalid attachment", false));
            }
        }

        DirectMessage saved = messageRepository.save(DirectMessage.builder()
                .teacher(link.getTeacher())
                .student(link.getStudent())
                .sender(me)
                .body(body.isEmpty() ? "" : body)
                .attachmentUrl(attachmentUrl == null || attachmentUrl.isEmpty() ? null : attachmentUrl)
                .attachmentMime(attachmentMime == null || attachmentMime.isEmpty() ? null : attachmentMime)
                .build());

        return ResponseEntity.ok(toMessageDto(saved));
    }

    /** POST /api/chat/upload — images or PDF for chat (returns path for attachmentUrl). */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) throws IOException {
        currentUser(auth);
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Empty file", false));
        }
        String ct = file.getContentType();
        if (ct == null || !UPLOAD_TYPES.contains(ct.toLowerCase(Locale.ROOT))) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Allowed: JPEG, PNG, GIF, WebP, PDF", false));
        }
        if (file.getSize() > 8 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Max size 8 MB", false));
        }

        Path dir = Paths.get(chatUploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String ext = extensionFromOriginal(file.getOriginalFilename(), ct);
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir)) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Bad path", false));
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        Map<String, String> body = new HashMap<>();
        body.put("url", "/api/chat/files/" + filename);
        body.put("mime", ct);
        return ResponseEntity.ok(body);
    }

    /** GET /api/chat/files/{filename} — download attachment (must be signed in). */
    @GetMapping("/files/{filename:.+}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> file(@PathVariable String filename, Authentication auth)
            throws MalformedURLException, IOException {
        currentUser(auth);
        if (!SAFE_FILENAME.matcher(filename).matches()) {
            return ResponseEntity.badRequest().build();
        }
        Path base = Paths.get(chatUploadDir).toAbsolutePath().normalize();
        Path resolved = base.resolve(filename).normalize();
        if (!resolved.startsWith(base) || !Files.isReadable(resolved)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new UrlResource(resolved.toUri());
        String mime = Files.probeContentType(resolved);
        if (mime == null) {
            mime = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(mime))
                .body(resource);
    }

    /* ===================== helpers ===================== */

    private List<Dto.ChatConversationDTO> collectConversationRows(User me) {
        List<TeacherStudent> asTeacher = linkRepository.findByTeacherOrderByCreatedAtDesc(me);
        List<TeacherStudent> asStudent = linkRepository.findByStudentOrderByCreatedAtDesc(me);
        Set<Long> seenPeerIds = new HashSet<>();
        List<Dto.ChatConversationDTO> rows = new ArrayList<>();
        for (TeacherStudent link : Stream.concat(asTeacher.stream(), asStudent.stream()).collect(Collectors.toList())) {
            User peer = link.getTeacher().getId().equals(me.getId()) ? link.getStudent() : link.getTeacher();
            if (!seenPeerIds.add(peer.getId())) {
                continue;
            }
            Long tid = link.getTeacher().getId();
            Long sid = link.getStudent().getId();
            rows.add(buildConversationRow(me, peer, tid, sid));
        }
        return rows;
    }

    private Dto.ChatConversationDTO buildConversationRow(User me, User peer, Long teacherId, Long studentId) {
        LocalDateTime since = cursorRepository.findByUserAndPeer(me, peer)
                .map(ChatReadCursor::getLastReadAt)
                .orElse(LocalDateTime.MIN);
        long unread = messageRepository.countIncomingAfter(teacherId, studentId, me.getId(), since);

        Optional<DirectMessage> lastOpt =
                messageRepository.findTopByTeacher_IdAndStudent_IdOrderByCreatedAtDesc(teacherId, studentId);

        LocalDateTime lastAt = lastOpt.map(DirectMessage::getCreatedAt).orElse(null);
        String preview = lastOpt.map(this::previewLine).orElse(null);

        return Dto.ChatConversationDTO.builder()
                .peer(toUserDto(peer))
                .lastMessagePreview(preview)
                .lastMessageAt(lastAt)
                .unreadCount(unread)
                .build();
    }

    private String previewLine(DirectMessage m) {
        if (m.getAttachmentUrl() != null && !m.getAttachmentUrl().isEmpty()) {
            boolean img = m.getAttachmentMime() != null && m.getAttachmentMime().startsWith("image/");
            String tail = m.getBody() != null && !m.getBody().trim().isEmpty()
                    ? (" · " + truncate(m.getBody(), 80))
                    : "";
            return (img ? "[Photo]" : "[File]") + tail;
        }
        return truncate(m.getBody(), 140);
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        String t = s.replace('\n', ' ').trim();
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }

    private static String extensionFromOriginal(String original, String contentType) {
        if (original != null && original.contains(".")) {
            String ext = original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ext.length() <= 8 && ext.matches("\\.[a-z0-9]+")) {
                return ext;
            }
        }
        if ("image/jpeg".equalsIgnoreCase(contentType)) return ".jpg";
        if ("image/png".equalsIgnoreCase(contentType)) return ".png";
        if ("image/gif".equalsIgnoreCase(contentType)) return ".gif";
        if ("image/webp".equalsIgnoreCase(contentType)) return ".webp";
        return ".pdf";
    }

    private Optional<TeacherStudent> findLink(User me, User peer) {
        Optional<TeacherStudent> meTeacher = linkRepository.findByTeacherAndStudent(me, peer);
        if (meTeacher.isPresent()) {
            return meTeacher;
        }
        return linkRepository.findByTeacherAndStudent(peer, me);
    }

    private Dto.ChatMessageDTO toMessageDto(DirectMessage m) {
        return Dto.ChatMessageDTO.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .body(m.getBody() != null ? m.getBody() : "")
                .attachmentUrl(m.getAttachmentUrl())
                .attachmentMime(m.getAttachmentMime())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private Dto.UserDTO toUserDto(User u) {
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

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
