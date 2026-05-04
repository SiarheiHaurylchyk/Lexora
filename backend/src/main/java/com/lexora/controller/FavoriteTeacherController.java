package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.TeacherFavorite;
import com.lexora.entity.User;
import com.lexora.repository.TeacherFavoriteRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Learners bookmark teachers from the directory (heart icon).
 * Lexora does not notify the teacher when someone favourites them — keeps noise low.
 */
@RestController
@RequestMapping("/api/me/favorite-teachers")
public class FavoriteTeacherController {

    @Autowired private TeacherFavoriteRepository favoriteRepository;
    @Autowired private UserRepository userRepository;

    @PostMapping("/{teacherId}")
    @Transactional
    public ResponseEntity<?> addFavorite(@PathVariable Long teacherId, Authentication auth) {
        User me = currentUser(auth);
        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher == null || !teacher.canTeach()) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Not a teacher", false));
        }
        if (teacher.getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Cannot favourite yourself", false));
        }
        if (!favoriteRepository.existsByStudentAndTeacher(me, teacher)) {
            favoriteRepository.save(TeacherFavorite.builder()
                    .student(me)
                    .teacher(teacher)
                    .build());
        }
        return ResponseEntity.ok(new Dto.MessageResponse("Saved", true));
    }

    @DeleteMapping("/{teacherId}")
    @Transactional
    public ResponseEntity<?> removeFavorite(@PathVariable Long teacherId, Authentication auth) {
        User me = currentUser(auth);
        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher == null) {
            return ResponseEntity.notFound().build();
        }
        favoriteRepository.deleteByStudentAndTeacher(me, teacher);
        return ResponseEntity.ok(new Dto.MessageResponse("Removed", true));
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
