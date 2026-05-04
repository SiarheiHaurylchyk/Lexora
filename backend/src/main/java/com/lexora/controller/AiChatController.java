package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.User;
import com.lexora.repository.UserRepository;
import com.lexora.service.AiChatService;
import com.lexora.service.AiChatService.AiChatException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import javax.validation.Valid;
import java.io.IOException;
import java.util.Locale;

/**
 * AI conversation tutor — xAI Grok / Groq / Ollama (see application.properties).
 */
@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    @Autowired
    private AiChatService aiChatService;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.ai.require-login:true}")
    private boolean aiRequireLogin;

    @GetMapping("/status")
    public ResponseEntity<Dto.AiStatusResponse> status() {
        return ResponseEntity.ok(aiChatService.status());
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody Dto.AiChatRequest req, Authentication auth) {
        String learning = resolveLearningLanguage(auth, req);
        try {
            Dto.AiChatResponse res = aiChatService.chat(req, learning);
            return ResponseEntity.ok(res);
        } catch (AiChatException e) {
            return ResponseEntity.status(503).body(new Dto.MessageResponse(e.getMessage(), false));
        }
    }

    /** Multipart field {@code file} — webm/wav/mp3…; Whisper detects language automatically. */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> transcribe(@RequestParam("file") MultipartFile file, Authentication auth) {
        ensureAiCaller(auth);
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Empty audio file", false));
        }
        if (file.getSize() > 8L * 1024 * 1024) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Audio file too large (max 8 MB)", false));
        }
        try {
            String text = aiChatService.transcribeGroq(file.getBytes(), file.getOriginalFilename());
            return ResponseEntity.ok(Dto.TranscriptionResponse.builder().text(text).build());
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Could not read upload", false));
        } catch (AiChatException e) {
            return ResponseEntity.status(503).body(new Dto.MessageResponse(e.getMessage(), false));
        }
    }

    /** JSON body — WAV: xAI TTS при XAI_API_KEY, иначе Groq Orpheus. */
    @PostMapping(value = "/speech", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> speech(@Valid @RequestBody Dto.AiSpeechRequest req, Authentication auth) {
        ensureAiCaller(auth);
        try {
            byte[] wav = aiChatService.synthesizeNeuralTts(
                    req.getText(),
                    req.getLang(),
                    req.getSecondaryLang(),
                    Boolean.TRUE.equals(req.getMixed()));
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("audio/wav"))
                    .body(wav);
        } catch (AiChatException e) {
            return ResponseEntity.status(503).body(new Dto.MessageResponse(e.getMessage(), false));
        }
    }

    /** При {@code app.ai.require-login=true} гарантирует, что вызывающий — залогиненный пользователь Lexora. */
    private void ensureAiCaller(Authentication auth) {
        if (!aiRequireLogin) {
            return;
        }
        currentUser(auth);
    }

    /**
     * Язык из профиля (если есть JWT), иначе из тела запроса — нужно при {@code LEXORA_AI_REQUIRE_LOGIN=false}.
     */
    private String resolveLearningLanguage(Authentication auth, Dto.AiChatRequest req) {
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            try {
                User me = currentUser(auth);
                String learning = me.getLearningLanguage();
                if (learning != null && !learning.trim().isEmpty()) {
                    return learning.trim().toLowerCase(Locale.ROOT);
                }
            } catch (RuntimeException ignored) {
                /* пользователь не найден — берём из запроса */
            }
        }
        String fromReq = req.getLearningLanguage();
        if (fromReq != null && !fromReq.trim().isEmpty()) {
            return fromReq.trim().toLowerCase(Locale.ROOT);
        }
        return "en";
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
