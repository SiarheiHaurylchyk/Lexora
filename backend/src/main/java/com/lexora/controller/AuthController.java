package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherCertificate;
import com.lexora.entity.User;
import com.lexora.repository.TeacherCertificateRepository;
import com.lexora.repository.UserRepository;
import com.lexora.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Set<String> LEARNING_LANGUAGE_CODES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "en", "ru", "de", "es", "fr", "it", "pt", "zh", "ja", "ko", "ar", "tr", "pl", "uk")));

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserRepository userRepository;
    @Autowired private TeacherCertificateRepository teacherCertificateRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody Dto.RegisterRequest request) {
        if (userRepository.existsByUsername(request.username)) {
            return ResponseEntity.badRequest()
                .body(new Dto.MessageResponse("Username already taken", false));
        }
        if (userRepository.existsByEmail(request.email)) {
            return ResponseEntity.badRequest()
                .body(new Dto.MessageResponse("Email already registered", false));
        }

        User.Role signupRole;
        try {
            signupRole = resolveSignupRole(request.accountType);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(new Dto.MessageResponse("Invalid account type", false));
        }

        String learningLang = normalizeLearningLanguage(request.learningLanguage);
        if (signupRole == User.Role.USER) {
            if (learningLang == null) {
                return ResponseEntity.badRequest()
                        .body(new Dto.MessageResponse("Learning language is required", false));
            }
            if (!LEARNING_LANGUAGE_CODES.contains(learningLang)) {
                return ResponseEntity.badRequest()
                        .body(new Dto.MessageResponse("Unsupported learning language", false));
            }
        } else if (learningLang != null && !LEARNING_LANGUAGE_CODES.contains(learningLang)) {
            return ResponseEntity.badRequest()
                    .body(new Dto.MessageResponse("Unsupported learning language", false));
        }

        User user = User.builder()
                .username(request.username)
                .email(request.email)
                .password(passwordEncoder.encode(request.password))
                .displayName(request.displayName != null ? request.displayName : request.username)
                .role(signupRole)
                .learningLanguage(learningLang)
                .build();

        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

        return ResponseEntity.ok(Dto.AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToUserDTO(user))
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody Dto.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.usernameOrEmail, request.password)
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String username = authentication.getName();

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

        return ResponseEntity.ok(Dto.AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToUserDTO(user))
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Dto.RefreshTokenRequest request) {
        if (!jwtUtils.validateToken(request.refreshToken)) {
            return ResponseEntity.badRequest()
                .body(new Dto.MessageResponse("Invalid refresh token", false));
        }
        String username = jwtUtils.getUsernameFromToken(request.refreshToken);
        String newToken = jwtUtils.generateToken(username);

        return ResponseEntity.ok(Dto.AuthResponse.builder()
                .accessToken(newToken)
                .refreshToken(request.refreshToken)
                .tokenType("Bearer")
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(mapToUserDTO(user));
    }

    /** Promote the current learner account to a teacher account. One-way switch. */
    @PostMapping("/upgrade-to-teacher")
    public ResponseEntity<?> upgradeToTeacher(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == User.Role.TEACHER) {
            return ResponseEntity.ok(mapToUserDTO(user));
        }
        if (user.getRole() != User.Role.USER) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "This account cannot be converted to a teacher account.", false));
        }
        user.setRole(User.Role.TEACHER);
        if (user.getShowInTeacherDirectory() == null) {
            user.setShowInTeacherDirectory(true);
        }
        userRepository.save(user);
        return ResponseEntity.ok(mapToUserDTO(user));
    }

    @PatchMapping("/profile")
    @Transactional
    public ResponseEntity<?> patchProfile(@RequestBody Dto.ProfilePatchRequest req,
                                          Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (req.displayName != null && !req.displayName.trim().isEmpty()) {
            user.setDisplayName(req.displayName.trim());
        }
        if (req.avatarUrl != null) {
            String trimmed = req.avatarUrl.trim();
            if (trimmed.isEmpty()) {
                user.setAvatarUrl(null);
            } else {
                if (trimmed.length() > 2_500_000) {
                    return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                            "Avatar image is too large. Use under ~1.5 MB.", false));
                }
                user.setAvatarUrl(trimmed);
            }
        }
        if (req.learningLanguage != null) {
            String trimmed = req.learningLanguage.trim();
            if (trimmed.isEmpty()) {
                user.setLearningLanguage(null);
            } else {
                String code = trimmed.toLowerCase();
                if (!LEARNING_LANGUAGE_CODES.contains(code)) {
                    return ResponseEntity.badRequest()
                            .body(new Dto.MessageResponse("Unsupported learning language", false));
                }
                user.setLearningLanguage(code);
            }
        }

        if (req.cefrLevel != null) {
            String c = req.cefrLevel.trim().toUpperCase();
            user.setCefrLevel(c.isEmpty() ? null : (c.length() > 8 ? c.substring(0, 8) : c));
        }
        if (req.learningGoalType != null) {
            String g = req.learningGoalType.trim();
            user.setLearningGoalType(g.isEmpty() ? null : (g.length() > 32 ? g.substring(0, 32) : g));
        }
        if (req.learningGoalWeeks != null) {
            int w = req.learningGoalWeeks;
            if (w < 1 || w > 520) {
                return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                        "learningGoalWeeks must be between 1 and 520", false));
            }
            user.setLearningGoalWeeks(w);
        }
        if (req.learningGoalNotes != null) {
            String n = req.learningGoalNotes.trim();
            user.setLearningGoalNotes(n.isEmpty() ? null : n);
        }

        if (user.canTeach()) {
            try {
                applyTeacherProfilePatch(user, req);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest()
                        .body(new Dto.MessageResponse(ex.getMessage(), false));
            }
        }

        userRepository.save(user);

        if (req.teacherCertificates != null && user.canTeach()) {
            try {
                syncCertificates(user, req.teacherCertificates);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest()
                        .body(new Dto.MessageResponse(ex.getMessage(), false));
            }
        }

        return ResponseEntity.ok(mapToUserDTO(user));
    }

    private void syncCertificates(User teacher, List<Dto.TeacherCertificateInputDTO> rows) {
        teacherCertificateRepository.deleteByTeacher(teacher);
        if (rows == null || rows.isEmpty()) {
            return;
        }
        int sortOrder = 0;
        for (Dto.TeacherCertificateInputDTO row : rows) {
            if (row == null || row.title == null || row.title.trim().isEmpty()) {
                continue;
            }
            String title = row.title.trim();
            if (title.length() > 500) {
                throw new IllegalArgumentException("Certificate title too long");
            }
            String issuer = blankToNullShort(row.issuer, 300);
            String year = blankToNullShort(row.year, 32);
            String description = row.description == null ? null : row.description.trim();
            if (description != null && description.isEmpty()) {
                description = null;
            }
            String doc = row.documentUrl == null ? null : row.documentUrl.trim();
            if (doc != null) {
                if (doc.isEmpty()) {
                    doc = null;
                } else if (doc.length() > 2048) {
                    throw new IllegalArgumentException("Certificate document URL too long");
                }
            }
            teacherCertificateRepository.save(TeacherCertificate.builder()
                    .teacher(teacher)
                    .title(title)
                    .issuer(issuer)
                    .year(year)
                    .description(description)
                    .documentUrl(doc)
                    .sortOrder(sortOrder++)
                    .build());
        }
    }

    private static String blankToNullShort(String raw, int maxLen) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > maxLen) {
            throw new IllegalArgumentException("Certificate field too long");
        }
        return t;
    }

    private void applyTeacherProfilePatch(User user, Dto.ProfilePatchRequest req) {
        if (req.teacherHeadline != null) {
            user.setTeacherHeadline(req.teacherHeadline.trim().isEmpty() ? null : req.teacherHeadline.trim());
        }
        if (req.teacherBio != null) {
            user.setTeacherBio(req.teacherBio.trim().isEmpty() ? null : req.teacherBio.trim());
        }
        if (req.teacherIntroVideoUrl != null) {
            user.setTeacherIntroVideoUrl(
                    req.teacherIntroVideoUrl.trim().isEmpty() ? null : req.teacherIntroVideoUrl.trim());
        }
        if (req.hourlyRate != null) {
            BigDecimal rate = req.hourlyRate;
            if (rate.signum() < 0 || rate.compareTo(new BigDecimal("99999.99")) > 0) {
                throw new IllegalArgumentException("Invalid hourly rate");
            }
            user.setHourlyRate(rate.signum() == 0 ? null : rate);
        }
        if (req.teachesLanguages != null) {
            user.setTeachesLanguages(req.teachesLanguages.trim().isEmpty() ? null : req.teachesLanguages.trim());
        }
        if (req.showInTeacherDirectory != null) {
            user.setShowInTeacherDirectory(req.showInTeacherDirectory);
        }
        if (req.teacherResume != null) {
            user.setTeacherResume(req.teacherResume.trim().isEmpty() ? null : req.teacherResume.trim());
        }
        if (req.teacherCancellationPolicy != null) {
            user.setTeacherCancellationPolicy(
                    req.teacherCancellationPolicy.trim().isEmpty() ? null : req.teacherCancellationPolicy.trim());
        }
        if (req.teacherPaymentInfo != null) {
            user.setTeacherPaymentInfo(
                    req.teacherPaymentInfo.trim().isEmpty() ? null : req.teacherPaymentInfo.trim());
        }
        if (req.offersTrialLesson != null) {
            user.setOffersTrialLesson(req.offersTrialLesson);
        }
    }

    private Dto.UserDTO mapToUserDTO(User user) {
        if (!user.canTeach()) {
            return Dto.UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .displayName(user.getDisplayName())
                    .avatarUrl(user.getAvatarUrl())
                    .role(user.getRole().name())
                    .createdAt(user.getCreatedAt())
                    .learningLanguage(user.getLearningLanguage())
                    .cefrLevel(user.getCefrLevel())
                    .learningGoalType(user.getLearningGoalType())
                    .learningGoalWeeks(user.getLearningGoalWeeks())
                    .learningGoalNotes(user.getLearningGoalNotes())
                    .build();
        }
        List<Dto.TeacherCertificateDTO> certs = teacherCertificateRepository.findByTeacherOrderBySortOrderAsc(user).stream()
                .map(c -> Dto.TeacherCertificateDTO.builder()
                        .id(c.getId())
                        .title(c.getTitle())
                        .issuer(c.getIssuer())
                        .year(c.getYear())
                        .description(c.getDescription())
                        .documentUrl(c.getDocumentUrl())
                        .build())
                .collect(Collectors.toList());
        return Dto.UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .learningLanguage(user.getLearningLanguage())
                .teacherHeadline(user.getTeacherHeadline())
                .teacherBio(user.getTeacherBio())
                .teacherResume(user.getTeacherResume())
                .teacherCertificates(certs)
                .teacherIntroVideoUrl(user.getTeacherIntroVideoUrl())
                .hourlyRate(user.getHourlyRate())
                .teachesLanguages(user.getTeachesLanguages())
                .showInTeacherDirectory(user.getShowInTeacherDirectory())
                .teacherCancellationPolicy(user.getTeacherCancellationPolicy())
                .teacherPaymentInfo(user.getTeacherPaymentInfo())
                .offersTrialLesson(user.getOffersTrialLesson())
                .cefrLevel(user.getCefrLevel())
                .learningGoalType(user.getLearningGoalType())
                .learningGoalWeeks(user.getLearningGoalWeeks())
                .learningGoalNotes(user.getLearningGoalNotes())
                .build();
    }

    /** Null if missing/blank; otherwise lower-case trimmed code (not validated). */
    private static String normalizeLearningLanguage(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim().toLowerCase();
        return t.isEmpty() ? null : t;
    }

    /** Only USER (learner) or TEACHER may be chosen at sign-up; ADMIN/PREMIUM are internal. */
    private User.Role resolveSignupRole(String accountType) {
        if (accountType == null || accountType.trim().isEmpty()) {
            return User.Role.USER;
        }
        String raw = accountType.trim().toUpperCase().replace('-', '_');
        if ("TEACHER".equals(raw) || "INSTRUCTOR".equals(raw)) {
            return User.Role.TEACHER;
        }
        if ("LEARNER".equals(raw) || "STUDENT".equals(raw) || "USER".equals(raw)) {
            return User.Role.USER;
        }
        throw new IllegalArgumentException("Invalid accountType");
    }
}
