package com.lexora.config;

import com.lexora.entity.Lesson;
import com.lexora.entity.LessonBlock;
import com.lexora.entity.LessonSection;
import com.lexora.repository.LessonBlockRepository;
import com.lexora.repository.LessonRepository;
import com.lexora.repository.LessonSectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Creates one section per lesson and attaches legacy blocks (before lesson_section_id existed).
 */
@Component
@Order(100)
public class LessonSectionBackfillRunner implements ApplicationRunner {

    @Autowired private LessonRepository lessonRepository;
    @Autowired private LessonSectionRepository lessonSectionRepository;
    @Autowired private LessonBlockRepository lessonBlockRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Lesson> lessons = lessonRepository.findAll();
        for (Lesson lesson : lessons) {
            List<LessonSection> existing = lessonSectionRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId());
            if (!existing.isEmpty()) {
                LessonSection first = existing.get(0);
                for (LessonBlock b : lessonBlockRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId())) {
                    if (b.getSection() == null) {
                        b.setSection(first);
                        lessonBlockRepository.save(b);
                    }
                }
                continue;
            }
            LessonSection sec = LessonSection.builder()
                    .lesson(lesson)
                    .title("Section 1")
                    .sortOrder(0)
                    .build();
            lessonSectionRepository.save(sec);
            for (LessonBlock b : lessonBlockRepository.findByLesson_IdOrderBySortOrderAsc(lesson.getId())) {
                b.setSection(sec);
                lessonBlockRepository.save(b);
            }
        }
    }
}
