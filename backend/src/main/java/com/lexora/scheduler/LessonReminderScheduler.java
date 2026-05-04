package com.lexora.scheduler;

import com.lexora.entity.TeacherSlot;
import com.lexora.repository.TeacherSlotRepository;
import com.lexora.service.MailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sends one email per booked slot to teacher and student in the last hour before start.
 */
@Component
public class LessonReminderScheduler {

    @Autowired private TeacherSlotRepository slotRepository;
    @Autowired private MailNotificationService mailNotificationService;

    @Scheduled(fixedRateString = "${app.lesson-reminder.email-poll-ms:60000}")
    @Transactional
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        List<TeacherSlot> pending = slotRepository.findByStatusAndReminderEmailSentIsFalseAndStartTimeAfter(
                TeacherSlot.Status.BOOKED, now);

        for (TeacherSlot slot : pending) {
            LocalDateTime start = slot.getStartTime();
            if (!start.isAfter(now)) {
                continue;
            }
            LocalDateTime oneHourBefore = start.minusHours(1);
            if (now.isBefore(oneHourBefore)) {
                continue;
            }
            if (!now.isBefore(start)) {
                continue;
            }

            mailNotificationService.sendLessonReminderEmails(slot);
            slot.setReminderEmailSent(true);
            slotRepository.save(slot);
        }
    }
}
