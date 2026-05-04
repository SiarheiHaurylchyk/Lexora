package com.lexora.repository;

import com.lexora.entity.Deck;
import com.lexora.entity.User;

import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** JPA {@link Specification} helpers for {@link User} queries. */
public final class UserSpecifications {

    private UserSpecifications() {}

    /**
     * Teachers listed in the directory: role TEACHER, visible flag, optional primary language,
     * optional “also speaks”, search query, hourly rate bounds, intro video, specialty keywords.
     */
    public static Specification<User> publicTeachers(
            String lang,
            String q,
            String speaks,
            BigDecimal minRate,
            BigDecimal maxRate,
            Boolean hasVideo,
            String specialties,
            Boolean trialOnly) {
        return (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("role"), User.Role.TEACHER));
            preds.add(cb.or(
                    cb.isNull(root.get("showInTeacherDirectory")),
                    cb.isTrue(root.get("showInTeacherDirectory"))
            ));

            if (q != null && !q.trim().isEmpty()) {
                String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("displayName"), root.get("username"))), like),
                        cb.like(cb.lower(root.get("username")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("teacherHeadline"), cb.literal(""))), like),
                        cb.like(cb.lower(cb.coalesce(root.get("teacherBio"), cb.literal(""))), like)
                ));
            }

            if (lang != null && !lang.trim().isEmpty()) {
                String lc = lang.toLowerCase(Locale.ROOT);
                Join<User, Deck> decks = root.join("decks", JoinType.LEFT);
                Predicate fromProfile = cb.like(
                        cb.lower(cb.coalesce(root.get("teachesLanguages"), cb.literal(""))),
                        "%" + lc + "%");
                Predicate fromDeck = cb.and(
                        cb.equal(decks.get("visibility"), Deck.Visibility.PUBLIC),
                        cb.or(
                                cb.equal(decks.get("sourceLanguage"), lc),
                                cb.equal(decks.get("targetLanguage"), lc)
                        )
                );
                preds.add(cb.or(fromProfile, fromDeck));
            }

            if (speaks != null && !speaks.trim().isEmpty()) {
                String lc = speaks.toLowerCase(Locale.ROOT);
                Join<User, Deck> decksSpeak = root.join("decks", JoinType.LEFT);
                Predicate fromProfile = cb.like(
                        cb.lower(cb.coalesce(root.get("teachesLanguages"), cb.literal(""))),
                        "%" + lc + "%");
                Predicate fromDeck = cb.and(
                        cb.equal(decksSpeak.get("visibility"), Deck.Visibility.PUBLIC),
                        cb.or(
                                cb.equal(decksSpeak.get("sourceLanguage"), lc),
                                cb.equal(decksSpeak.get("targetLanguage"), lc)
                        )
                );
                preds.add(cb.or(fromProfile, fromDeck));
            }

            if (minRate != null) {
                preds.add(cb.and(
                        cb.isNotNull(root.get("hourlyRate")),
                        cb.ge(root.get("hourlyRate"), minRate)
                ));
            }
            if (maxRate != null) {
                preds.add(cb.and(
                        cb.isNotNull(root.get("hourlyRate")),
                        cb.le(root.get("hourlyRate"), maxRate)
                ));
            }

            if (Boolean.TRUE.equals(hasVideo)) {
                preds.add(cb.and(
                        cb.isNotNull(root.get("teacherIntroVideoUrl")),
                        cb.notEqual(root.get("teacherIntroVideoUrl"), "")
                ));
            }

            if (specialties != null && !specialties.trim().isEmpty()) {
                List<Predicate> tokenPreds = new ArrayList<>();
                for (String raw : specialties.split(",")) {
                    String kw = raw.trim().toLowerCase(Locale.ROOT);
                    if (kw.isEmpty()) {
                        continue;
                    }
                    String like = "%" + kw + "%";
                    tokenPreds.add(cb.or(
                            cb.like(cb.lower(cb.coalesce(root.get("teacherHeadline"), cb.literal(""))), like),
                            cb.like(cb.lower(cb.coalesce(root.get("teacherBio"), cb.literal(""))), like)
                    ));
                }
                if (!tokenPreds.isEmpty()) {
                    preds.add(cb.or(tokenPreds.toArray(new Predicate[0])));
                }
            }

            if (Boolean.TRUE.equals(trialOnly)) {
                preds.add(cb.isTrue(root.get("offersTrialLesson")));
            }

            return cb.and(preds.toArray(new Predicate[0]));
        };
    }
}
