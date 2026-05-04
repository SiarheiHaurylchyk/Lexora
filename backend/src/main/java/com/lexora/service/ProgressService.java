package com.lexora.service;

import com.lexora.dto.Dto;
import com.lexora.entity.StudySession;
import com.lexora.entity.User;
import com.lexora.repository.CardProgressRepository;
import com.lexora.repository.StudySessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Computes streaks, totals, daily heatmap and earned badges from {@link StudySession} rows.
 */
@Service
public class ProgressService {

    @Autowired private StudySessionRepository sessionRepository;
    @Autowired private CardProgressRepository progressRepository;

    /** Number of days that the heatmap covers. ~1 year fits a calendar grid like italki. */
    private static final int HEATMAP_DAYS = 364;

    /** All badge thresholds used to compute /progress badges. Keep in sync with i18n keys. */
    private enum Badge {
        FIRST_STEP("first_step", BadgeKind.SESSIONS, 1),
        TEN_SESSIONS("ten_sessions", BadgeKind.SESSIONS, 10),
        FIFTY_SESSIONS("fifty_sessions", BadgeKind.SESSIONS, 50),
        HUNDRED_SESSIONS("hundred_sessions", BadgeKind.SESSIONS, 100),
        WEEK_STREAK("week_streak", BadgeKind.STREAK, 7),
        MONTH_STREAK("month_streak", BadgeKind.STREAK, 30),
        QUARTER_STREAK("quarter_streak", BadgeKind.STREAK, 90),
        FIFTY_CORRECT("fifty_correct", BadgeKind.CORRECT, 50),
        FIVE_HUNDRED_CORRECT("five_hundred_correct", BadgeKind.CORRECT, 500),
        FIVE_THOUSAND_CORRECT("five_thousand_correct", BadgeKind.CORRECT, 5000),
        TEN_MASTERED("ten_mastered", BadgeKind.MASTERED, 10),
        HUNDRED_MASTERED("hundred_mastered", BadgeKind.MASTERED, 100);

        final String key;
        final BadgeKind kind;
        final int target;
        Badge(String key, BadgeKind kind, int target) {
            this.key = key;
            this.kind = kind;
            this.target = target;
        }
    }

    private enum BadgeKind { SESSIONS, STREAK, CORRECT, MASTERED }

    @Transactional(readOnly = true)
    public Dto.ProgressDTO compute(User user) {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(HEATMAP_DAYS - 1);
        LocalDateTime fromTs = from.atStartOfDay();

        List<StudySession> recent =
                sessionRepository.findByUserAndStartedAtAfterOrderByStartedAtAsc(user, fromTs);

        Map<LocalDate, Integer> byDay = new TreeMap<LocalDate, Integer>();
        for (StudySession s : recent) {
            if (s.getStartedAt() == null) continue;
            LocalDate d = s.getStartedAt().atZone(ZoneId.systemDefault()).toLocalDate();
            Integer prev = byDay.get(d);
            byDay.put(d, prev == null ? 1 : prev + 1);
        }

        List<Dto.HeatmapDayDTO> heatmap = new ArrayList<Dto.HeatmapDayDTO>(HEATMAP_DAYS);
        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE;
        for (int i = 0; i < HEATMAP_DAYS; i++) {
            LocalDate d = from.plusDays(i);
            Integer c = byDay.get(d);
            heatmap.add(Dto.HeatmapDayDTO.builder()
                    .date(d.format(iso))
                    .count(c == null ? 0 : c)
                    .build());
        }

        int currentStreak = computeCurrentStreak(byDay, today);
        int longestStreak = computeLongestStreak(byDay);

        long totalSessions = sessionRepository.countByUser(user);
        Long correct = sessionRepository.totalCorrectAnswers(user);
        long correctTotal = correct == null ? 0 : correct;
        long mastered = progressRepository.countMasteredByUser(user);
        long studiedDays = byDay.size();

        LocalDate lastDate = byDay.isEmpty() ? null : ((TreeMap<LocalDate, Integer>) byDay).lastKey();

        List<Dto.BadgeDTO> badges = new ArrayList<Dto.BadgeDTO>();
        for (Badge b : Badge.values()) {
            int progressValue = progressFor(b, totalSessions, longestStreak, correctTotal, mastered);
            badges.add(Dto.BadgeDTO.builder()
                    .key(b.key)
                    .earned(progressValue >= b.target)
                    .progress(Math.min(progressValue, b.target))
                    .target(b.target)
                    .build());
        }

        return Dto.ProgressDTO.builder()
                .currentStreak(currentStreak)
                .longestStreak(longestStreak)
                .totalSessions(totalSessions)
                .totalCorrectAnswers(correctTotal)
                .studiedDays(studiedDays)
                .lastActivityDate(lastDate == null ? null : lastDate.format(iso))
                .heatmap(heatmap)
                .badges(badges)
                .build();
    }

    private static int progressFor(Badge b,
                                   long sessions, int longestStreak,
                                   long correct, long mastered) {
        switch (b.kind) {
            case SESSIONS: return (int) Math.min(sessions, Integer.MAX_VALUE);
            case STREAK: return longestStreak;
            case CORRECT: return (int) Math.min(correct, Integer.MAX_VALUE);
            case MASTERED: return (int) Math.min(mastered, Integer.MAX_VALUE);
            default: return 0;
        }
    }

    private static int computeCurrentStreak(Map<LocalDate, Integer> byDay, LocalDate today) {
        if (byDay.isEmpty()) return 0;
        LocalDate cursor = today;
        if (!byDay.containsKey(cursor)) {
            cursor = cursor.minusDays(1);
            if (!byDay.containsKey(cursor)) return 0;
        }
        int streak = 0;
        while (byDay.containsKey(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private static int computeLongestStreak(Map<LocalDate, Integer> byDay) {
        if (byDay.isEmpty()) return 0;
        List<LocalDate> days = new ArrayList<LocalDate>(byDay.keySet());
        Collections.sort(days);
        int best = 1;
        int run = 1;
        for (int i = 1; i < days.size(); i++) {
            if (days.get(i - 1).plusDays(1).equals(days.get(i))) {
                run++;
                if (run > best) best = run;
            } else {
                run = 1;
            }
        }
        return best;
    }
}
