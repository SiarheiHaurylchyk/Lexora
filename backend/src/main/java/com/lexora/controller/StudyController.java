package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.*;
import com.lexora.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    @Autowired private StudySessionRepository sessionRepository;
    @Autowired private CardProgressRepository progressRepository;
    @Autowired private DeckRepository deckRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private com.lexora.service.ProgressService progressService;

    @PostMapping("/start")
    @Transactional
    public ResponseEntity<?> startSession(@RequestBody Dto.StudySessionRequest request, Authentication auth) {
        User user = getUser(auth);
        Deck deck = deckRepository.findById(request.deckId)
                .orElseThrow(() -> new RuntimeException("Deck not found"));

        deck.setStudyCount(deck.getStudyCount() != null ? deck.getStudyCount() + 1 : 1);
        deckRepository.save(deck);

        int totalCards = (int) cardRepository.countByDeck(deck);

        StudySession.StudyMode studyMode = parseStudyMode(request.mode);
        if (studyMode == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new Dto.MessageResponse("Unknown study mode: " + request.mode, false));
        }

        StudySession session = StudySession.builder()
                .user(user)
                .deck(deck)
                .mode(studyMode)
                .totalCards(totalCards)
                .correctAnswers(0)
                .incorrectAnswers(0)
                .build();

        StudySession saved = sessionRepository.save(session);
        return ResponseEntity.ok(Dto.StudySessionResponse.builder()
                .id(saved.getId())
                .deckId(deck.getId())
                .deckTitle(deck.getTitle())
                .mode(saved.getMode().name())
                .startedAt(saved.getStartedAt())
                .totalCards(saved.getTotalCards())
                .correctAnswers(0)
                .incorrectAnswers(0)
                .accuracy(0)
                .build());
    }

    @PostMapping("/sessions/{sessionId}/answer")
    @Transactional
    public ResponseEntity<?> recordAnswer(@PathVariable Long sessionId,
                                           @RequestBody Dto.CardAnswerRequest request,
                                           Authentication auth) {
        User user = getUser(auth);
        StudySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (request.correct) {
            session.setCorrectAnswers(session.getCorrectAnswers() + 1);
        } else {
            session.setIncorrectAnswers(session.getIncorrectAnswers() + 1);
        }

        Card card = cardRepository.findById(request.cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

        Optional<CardProgress> existingProgress = progressRepository
                .findByUserAndCardId(user, request.cardId);

        CardProgress progress = existingProgress.orElseGet(() -> CardProgress.builder()
                .user(user)
                .session(session)
                .card(card)
                .easeFactor(250)
                .interval(0)
                .repetitions(0)
                .attempts(0)
                .build());

        int rating = request.correct ? Math.max(3, request.rating) : Math.min(2, request.rating);
        applySpacedRepetition(progress, rating);

        if (request.correct) {
            if (progress.getRepetitions() >= 5) progress.setStatus(CardProgress.Status.MASTERED);
            else if (progress.getRepetitions() >= 3) progress.setStatus(CardProgress.Status.KNOWN);
            else if (progress.getRepetitions() >= 1) progress.setStatus(CardProgress.Status.FAMILIAR);
            else progress.setStatus(CardProgress.Status.LEARNING);
        } else {
            progress.setStatus(CardProgress.Status.LEARNING);
        }

        progressRepository.save(progress);
        sessionRepository.save(session);

        return ResponseEntity.ok(new Dto.MessageResponse("Answer recorded", true));
    }

    @PostMapping("/sessions/{sessionId}/complete")
    @Transactional
    public ResponseEntity<?> completeSession(@PathVariable Long sessionId, Authentication auth) {
        StudySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(session);

        int total = orZero(session.getCorrectAnswers()) + orZero(session.getIncorrectAnswers());
        double accuracy = total > 0 ? (double) orZero(session.getCorrectAnswers()) / total * 100 : 0;

        return ResponseEntity.ok(Dto.StudySessionResponse.builder()
                .id(session.getId())
                .deckId(session.getDeck().getId())
                .deckTitle(session.getDeck().getTitle())
                .mode(session.getMode().name())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .totalCards(session.getTotalCards())
                .correctAnswers(orZero(session.getCorrectAnswers()))
                .incorrectAnswers(orZero(session.getIncorrectAnswers()))
                .accuracy(accuracy)
                .build());
    }

    @GetMapping("/history")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getHistory(Authentication auth) {
        User user = getUser(auth);
        List<StudySession> sessions = sessionRepository.findByUserOrderByStartedAtDesc(user);
        return ResponseEntity.ok(sessions.stream().map(s -> {
            int total = orZero(s.getCorrectAnswers()) + orZero(s.getIncorrectAnswers());
            double accuracy = total > 0 ? (double) orZero(s.getCorrectAnswers()) / total * 100 : 0;
            return Dto.StudySessionResponse.builder()
                    .id(s.getId())
                    .deckId(s.getDeck().getId())
                    .deckTitle(s.getDeck().getTitle())
                    .mode(s.getMode().name())
                    .startedAt(s.getStartedAt())
                    .completedAt(s.getCompletedAt())
                    .totalCards(s.getTotalCards())
                    .correctAnswers(orZero(s.getCorrectAnswers()))
                    .incorrectAnswers(orZero(s.getIncorrectAnswers()))
                    .accuracy(accuracy)
                    .build();
        }).collect(Collectors.toList()));
    }

    @GetMapping("/due-cards")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getDueCards(Authentication auth) {
        User user = getUser(auth);
        List<CardProgress> due = progressRepository.findDueCards(user, LocalDate.now());
        return ResponseEntity.ok(due.stream()
                .filter(cp -> cp.getCard() != null)
                .map(cp -> cp.getCard().getId())
                .collect(Collectors.toList()));
    }

    /** Streak, daily heatmap, and earned badges. Used by the Progress page on the SPA. */
    @GetMapping("/progress")
    public ResponseEntity<?> getProgress(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(progressService.compute(user));
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getStats(Authentication auth) {
        User user = getUser(auth);
        long mastered = progressRepository.countMasteredByUser(user);
        Long totalCorrect = sessionRepository.totalCorrectAnswers(user);
        long studyDays = sessionRepository.countStudyDays(user, LocalDateTime.now().minusDays(30));

        return ResponseEntity.ok(Dto.StatsDTO.builder()
                .masteredCards(mastered)
                .totalCorrectAnswers(totalCorrect != null ? totalCorrect : 0)
                .studyStreak(studyDays)
                .build());
    }

    private void applySpacedRepetition(CardProgress p, int rating) {
        p.setAttempts(orZero(p.getAttempts()) + 1);

        if (rating < 3) {
            p.setRepetitions(0);
            p.setInterval(1);
        } else {
            int reps = orZero(p.getRepetitions());
            if (reps == 0) p.setInterval(1);
            else if (reps == 1) p.setInterval(6);
            else p.setInterval((int) Math.round(orZero(p.getInterval()) * orZero(p.getEaseFactor()) / 100.0));
            p.setRepetitions(reps + 1);
        }

        int newEF = orZero(p.getEaseFactor()) + (int) ((13 - 9 * rating + 2 * rating * rating) * 10);
        p.setEaseFactor(Math.max(130, newEF));
        p.setNextReview(LocalDate.now().plusDays(orZero(p.getInterval())));
    }

    private int orZero(Integer v) { return v != null ? v : 0; }

    private StudySession.StudyMode parseStudyMode(String mode) {
        if (mode == null || mode.trim().isEmpty()) {
            return null;
        }
        try {
            return StudySession.StudyMode.valueOf(mode.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private User getUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
