package com.lexora.service;

import com.lexora.entity.TeacherSlot;
import com.lexora.entity.User;
import com.lexora.repository.TeacherStudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends transactional emails when SMTP is configured; otherwise logs the intent.
 */
@Service
public class MailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MailNotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    @Autowired private TeacherStudentRepository teacherStudentRepository;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public MailNotificationService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    /** One hour before a booked slot starts — notify teacher and learner. */
    public void sendLessonReminderEmails(TeacherSlot slot) {
        User teacher = slot.getTeacher();
        User student = slot.getBookedBy();
        if (teacher == null || student == null) {
            log.warn("Skipping lesson reminder: missing teacher or student on slot {}", slot.getId());
            return;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        String start = slot.getStartTime().toString();
        String end = slot.getEndTime().toString();

        if (sender == null || fromAddress == null || fromAddress.trim().isEmpty()) {
            log.info("[mail disabled] Lesson reminder for slot {} {}–{} — teacher {} student {}",
                    slot.getId(), start, end, teacher.getEmail(), student.getEmail());
            return;
        }

        String subject = "Lexora — upcoming lesson reminder";
        String classLine = classroomLine(teacher, student);
        send(sender, teacher.getEmail(), subject, bodyFor(teacher, student, slot, true, classLine));
        send(sender, student.getEmail(), subject, bodyFor(teacher, student, slot, false, classLine));
    }

    private String classroomLine(User teacher, User student) {
        return teacherStudentRepository.findByTeacherAndStudent(teacher, student)
                .map(link -> "\nShared classroom (video + homework): sign in to Lexora → Students → Open class (link id "
                        + link.getId() + ").\n")
                .orElse("\nSign in to Lexora to manage this lesson.\n");
    }

    private static String bodyFor(User teacher, User student, TeacherSlot slot, boolean recipientIsTeacher,
                                   String classLine) {
        String other = recipientIsTeacher
                ? displayName(student)
                : displayName(teacher);
        return "Hi,\n\n"
                + "This is a reminder about your Lexora lesson with " + other + ".\n"
                + "Start: " + slot.getStartTime() + "\n"
                + "End:   " + slot.getEndTime() + "\n"
                + classLine
                + "\nPlease sign in to Lexora to join or manage the booking.\n";
    }

    private static String displayName(User u) {
        if (u.getDisplayName() != null && !u.getDisplayName().trim().isEmpty()) {
            return u.getDisplayName().trim();
        }
        return u.getUsername();
    }

    private void send(JavaMailSender sender, String to, String subject, String text) {
        if (to == null || to.trim().isEmpty()) {
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(to.trim());
            msg.setSubject(subject);
            msg.setText(text);
            sender.send(msg);
        } catch (RuntimeException ex) {
            log.error("Failed to send mail to {}", to, ex);
        }
    }
}
