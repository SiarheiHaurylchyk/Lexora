package com.lexora.service;

import com.lexora.dto.Dto;
import com.lexora.entity.Deck;
import com.lexora.entity.TeacherCertificate;
import com.lexora.entity.TeacherReview;
import com.lexora.entity.TeacherSlot;
import com.lexora.entity.User;
import com.lexora.repository.CardRepository;
import com.lexora.repository.DeckRepository;
import com.lexora.repository.LessonRepository;
import com.lexora.repository.TeacherCertificateRepository;
import com.lexora.repository.TeacherFavoriteRepository;
import com.lexora.repository.TeacherReviewRepository;
import com.lexora.repository.TeacherSlotRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import com.lexora.repository.UserSpecifications;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TeacherDirectoryService {

    @Autowired private UserRepository userRepository;
    @Autowired private DeckRepository deckRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private TeacherCertificateRepository teacherCertificateRepository;
    @Autowired private TeacherReviewRepository teacherReviewRepository;
    @Autowired private TeacherSlotRepository teacherSlotRepository;
    @Autowired private TeacherFavoriteRepository teacherFavoriteRepository;

    public Page<Dto.TeacherDirectoryEntryDTO> list(
            String lang,
            String q,
            String speaks,
            BigDecimal minRate,
            BigDecimal maxRate,
            Boolean hasVideo,
            String specialties,
            Boolean trialOnly,
            Pageable pageable) {
        return userRepository
                .findAll(UserSpecifications.publicTeachers(lang, q, speaks, minRate, maxRate, hasVideo, specialties,
                        trialOnly),
                        pageable)
                .map(this::toEntry);
    }

    public Optional<Dto.TeacherDetailDTO> findPublicTeacher(Long id, Authentication auth) {
        return userRepository.findById(id).filter(this::isListedTeacher).map(u -> toDetail(u, resolveViewer(auth)));
    }

    private User resolveViewer(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private boolean isListedTeacher(User u) {
        return u.getRole() == User.Role.TEACHER
                && (u.getShowInTeacherDirectory() == null || Boolean.TRUE.equals(u.getShowInTeacherDirectory()));
    }

    private Dto.TeacherDirectoryEntryDTO toEntry(User u) {
        List<String> langs = mergeLanguages(u);
        long decks = deckRepository.countByOwnerAndVisibility(u, Deck.Visibility.PUBLIC);
        long students = teacherStudentRepository.countByTeacher(u);
        long lessons = lessonRepository.countByTeacher(u);
        String headline = blankToNull(u.getTeacherHeadline());
        String bio = u.getTeacherBio();
        String preview = bio == null || bio.trim().isEmpty() ? null : truncate(bio.trim(), 140);

        return Dto.TeacherDirectoryEntryDTO.builder()
                .id(u.getId())
                .displayName(u.getDisplayName() != null ? u.getDisplayName() : u.getUsername())
                .username(u.getUsername())
                .avatarUrl(u.getAvatarUrl())
                .headline(headline)
                .bioPreview(preview)
                .introVideoUrl(blankToNull(u.getTeacherIntroVideoUrl()))
                .hourlyRate(u.getHourlyRate())
                .languages(langs)
                .publicDeckCount(decks)
                .studentCount(students)
                .lessonCount(lessons)
                .offersTrialLesson(Boolean.TRUE.equals(u.getOffersTrialLesson()))
                .build();
    }

    private Dto.TeacherDetailDTO toDetail(User u, User viewer) {
        Dto.TeacherDirectoryEntryDTO base = toEntry(u);
        List<Dto.TeacherPublicDeckDTO> samples = deckRepository.findByOwnerOrderByUpdatedAtDesc(u).stream()
                .filter(d -> d.getVisibility() == Deck.Visibility.PUBLIC)
                .limit(8)
                .map(d -> Dto.TeacherPublicDeckDTO.builder()
                        .id(d.getId())
                        .title(d.getTitle())
                        .emoji(d.getEmoji())
                        .coverColor(d.getCoverColor())
                        .sourceLanguage(d.getSourceLanguage())
                        .targetLanguage(d.getTargetLanguage())
                        .cardCount((int) cardRepository.countByDeck(d))
                        .build())
                .collect(Collectors.toList());

        List<Dto.TeacherCertificateDTO> certs = teacherCertificateRepository.findByTeacherOrderBySortOrderAsc(u).stream()
                .map(this::toCertDto)
                .collect(Collectors.toList());

        long reviewCount = teacherReviewRepository.countByTeacher(u);
        Double avgRaw = teacherReviewRepository.averageRatingForTeacher(u.getId());
        Double averageRating = avgRaw == null ? null : Math.round(avgRaw * 10.0) / 10.0;

        long conducted = teacherSlotRepository.countByTeacherAndStatusAndEndTimeBefore(
                u, TeacherSlot.Status.BOOKED, LocalDateTime.now());

        List<TeacherReview> recentEntities =
                teacherReviewRepository.findByTeacherOrderByCreatedAtDesc(u, PageRequest.of(0, 10));
        Long viewerId = viewer != null ? viewer.getId() : null;
        List<Dto.TeacherReviewDTO> recentReviews = recentEntities.stream()
                .map(r -> toReviewDto(r, viewerId != null && viewerId.equals(r.getStudent().getId())))
                .collect(Collectors.toList());

        Dto.TeacherReviewDTO viewerReview = null;
        if (viewer != null && !viewer.getId().equals(u.getId())) {
            viewerReview = teacherReviewRepository.findByTeacherAndStudent(u, viewer)
                    .map(r -> toReviewDto(r, true))
                    .orElse(null);
        }

        Boolean favorited = null;
        if (viewer != null && !viewer.getId().equals(u.getId())) {
            favorited = teacherFavoriteRepository.existsByStudentAndTeacher(viewer, u);
        }

        return Dto.TeacherDetailDTO.builder()
                .id(base.id)
                .displayName(base.displayName)
                .username(base.username)
                .avatarUrl(base.avatarUrl)
                .headline(base.headline)
                .bio(u.getTeacherBio())
                .resume(u.getTeacherResume())
                .certificates(certs)
                .introVideoUrl(base.introVideoUrl)
                .hourlyRate(base.hourlyRate)
                .languages(base.languages)
                .publicDeckCount(base.publicDeckCount)
                .studentCount(base.studentCount)
                .lessonCount(base.lessonCount)
                .conductedSessionsCount(conducted)
                .averageRating(averageRating)
                .reviewCount(reviewCount)
                .recentReviews(recentReviews)
                .viewerReview(viewerReview)
                .sampleDecks(samples)
                .cancellationPolicy(u.getTeacherCancellationPolicy())
                .paymentInfo(u.getTeacherPaymentInfo())
                .offersTrialLesson(Boolean.TRUE.equals(u.getOffersTrialLesson()))
                .favoritedByMe(favorited)
                .build();
    }

    private Dto.TeacherCertificateDTO toCertDto(TeacherCertificate c) {
        return Dto.TeacherCertificateDTO.builder()
                .id(c.getId())
                .title(c.getTitle())
                .issuer(c.getIssuer())
                .year(c.getYear())
                .description(c.getDescription())
                .documentUrl(c.getDocumentUrl())
                .build();
    }

    private static Dto.TeacherReviewDTO toReviewDto(TeacherReview r, boolean mine) {
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

    private List<String> mergeLanguages(User u) {
        LinkedHashSet<String> set = new LinkedHashSet<>();
        if (u.getTeachesLanguages() != null && !u.getTeachesLanguages().trim().isEmpty()) {
            for (String part : u.getTeachesLanguages().split(",")) {
                String t = part.trim().toLowerCase(Locale.ROOT);
                if (!t.isEmpty()) {
                    set.add(t);
                }
            }
        }
        for (Deck d : deckRepository.findByOwnerOrderByUpdatedAtDesc(u)) {
            if (d.getVisibility() == Deck.Visibility.PUBLIC) {
                set.add(d.getSourceLanguage().toLowerCase(Locale.ROOT));
                set.add(d.getTargetLanguage().toLowerCase(Locale.ROOT));
            }
        }
        return new ArrayList<>(set);
    }

    private static String blankToNull(String s) {
        if (s == null || s.trim().isEmpty()) {
            return null;
        }
        return s.trim();
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max - 1) + "…";
    }
}
