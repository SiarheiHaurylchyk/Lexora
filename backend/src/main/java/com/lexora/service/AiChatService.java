package com.lexora.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lexora.dto.Dto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Proxies chat to an LLM: xAI Grok, Groq, DeepSeek (OpenAI-compatible), or Ollama locally.
 */
@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private static final Map<String, String> LANG_NAMES = new HashMap<String, String>() {{
        put("en", "English");
        put("ru", "Russian");
        put("de", "German");
        put("es", "Spanish");
        put("fr", "French");
        put("it", "Italian");
        put("pt", "Portuguese");
        put("zh", "Chinese");
        put("ja", "Japanese");
        put("ko", "Korean");
        put("ar", "Arabic");
        put("tr", "Turkish");
        put("pl", "Polish");
        put("uk", "Ukrainian");
    }};

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.ai.provider:mock}")
    private String provider;

    @Value("${app.ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.ai.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${app.ai.groq.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqUrl;

    /**
     * Groq is behind Cloudflare; Java’s default User-Agent is often rejected with HTTP 403 “error code: 1010”.
     */
    @Value("${app.ai.groq.userAgent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Lexora/1.0}")
    private String groqUserAgent;

    @Value("${app.ai.groq.transcription-url:https://api.groq.com/openai/v1/audio/transcriptions}")
    private String groqTranscriptionUrl;

    @Value("${app.ai.groq.transcription-model:whisper-large-v3-turbo}")
    private String groqTranscriptionModel;

    @Value("${app.ai.groq.tts-url:https://api.groq.com/openai/v1/audio/speech}")
    private String groqTtsUrl;

    @Value("${app.ai.groq.tts-model-en:canopylabs/orpheus-v1-english}")
    private String groqTtsModelEn;

    @Value("${app.ai.groq.tts-model-ar:canopylabs/orpheus-arabic-saudi}")
    private String groqTtsModelAr;

    @Value("${app.ai.groq.tts-voice-en:austin}")
    private String groqTtsVoiceEn;

    @Value("${app.ai.groq.tts-voice-ar:abdullah}")
    private String groqTtsVoiceAr;

    /**
     * Groq Orpheus hard-limit is 200 chars per request; stay under to avoid HTTP 400.
     * Docs: https://console.groq.com/docs/text-to-speech/orpheus
     */
    private static final int GROQ_TTS_MAX_INPUT_CHARS = 190;

    @Value("${app.ai.ollama.base-url:http://127.0.0.1:11434}")
    private String ollamaBaseUrl;

    @Value("${app.ai.ollama.model:llama3.2}")
    private String ollamaModel;

    @Value("${app.ai.deepseek.api-key:}")
    private String deepseekApiKey;

    @Value("${app.ai.deepseek.model:deepseek-chat}")
    private String deepseekModel;

    @Value("${app.ai.deepseek.url:https://api.deepseek.com/v1/chat/completions}")
    private String deepseekUrl;

    @Value("${app.ai.deepseek.max-output-tokens:4096}")
    private int deepseekMaxOutputTokens;

    @Value("${app.ai.xai.api-key:}")
    private String xaiApiKey;

    @Value("${app.ai.xai.chat-url:https://api.x.ai/v1/chat/completions}")
    private String xaiChatUrl;

    @Value("${app.ai.xai.chat-model:grok-4.3}")
    private String xaiChatModel;

    @Value("${app.ai.xai.chat-max-output-tokens:8192}")
    private int xaiChatMaxOutputTokens;

    @Value("${app.ai.xai.tts-url:https://api.x.ai/v1/tts}")
    private String xaiTtsUrl;

    @Value("${app.ai.xai.tts-voice:eve}")
    private String xaiTtsVoice;

    /** Optional Russian-only xAI voice; empty → same as {@link #xaiTtsVoice}. */
    @Value("${app.ai.xai.tts-voice-ru:}")
    private String xaiTtsVoiceRu;

    @Value("${app.ai.http.userAgent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Lexora/1.0}")
    private String lexoraHttpUserAgent;

    @PostConstruct
    public void logAiStartup() {
        xaiApiKey = normalizeApiSecret(xaiApiKey);
        groqApiKey = normalizeApiSecret(groqApiKey);
        deepseekApiKey = normalizeApiSecret(deepseekApiKey);

        String p = normalizeProvider(provider);
        if ("groq".equals(p)) {
            log.info(
                    "AI Groq enabled: model={}, userAgentLength={}, httpStack=Apache HttpComponents (rebuild backend image if Cloudflare 1010 persists).",
                    groqModel,
                    groqUserAgent != null ? groqUserAgent.length() : 0);
        } else if ("xai".equals(p)) {
            log.info("AI xAI Grok chat enabled: model={}", xaiChatModel != null ? xaiChatModel.trim() : "");
            logXaiKeyDiagnostics();
        } else if ("deepseek".equals(p)) {
            log.info("AI DeepSeek-compatible chat enabled: model={}, url={}",
                    deepseekModel != null ? deepseekModel.trim() : "",
                    deepseekUrl != null ? deepseekUrl.trim() : "");
        }
        if (groqApiKey != null && !groqApiKey.trim().isEmpty() && !"groq".equals(normalizeProvider(provider))) {
            log.info("Groq Whisper STT available alongside chat provider {} (set GROQ_API_KEY for multilingual mic).",
                    normalizeProvider(provider));
        }
    }

    public Dto.AiStatusResponse status() {
        String p = normalizeProvider(provider);
        boolean configured;
        if ("groq".equals(p)) {
            configured = groqApiKey != null && !groqApiKey.trim().isEmpty();
        } else if ("xai".equals(p)) {
            configured = xaiApiKey != null && !xaiApiKey.trim().isEmpty();
        } else if ("deepseek".equals(p)) {
            configured = deepseekApiKey != null && !deepseekApiKey.trim().isEmpty();
        } else if ("ollama".equals(p)) {
            configured = true;
        } else {
            configured = false;
        }
        /* Whisper works whenever GROQ_API_KEY is set — regardless of chat provider (browser STT is poor for Russian). */
        boolean whisper = groqApiKey != null && !groqApiKey.trim().isEmpty();
        boolean xaiTts = xaiApiKey != null && !xaiApiKey.trim().isEmpty();
        /* Orpheus only when Groq chat provider, key present, and no xAI key (see synthesizeNeuralTts). */
        boolean groqTts = groqApiKey != null && !groqApiKey.trim().isEmpty()
                && "groq".equals(p) && !xaiTts;
        return Dto.AiStatusResponse.builder()
                .configured(configured)
                .provider(p)
                .whisperTranscription(whisper)
                .xaiTts(xaiTts)
                .groqTts(groqTts)
                .build();
    }

    /**
     * Нейро-озвучка: при {@code XAI_API_KEY} — xAI TTS ({@code POST /v1/tts});
     * иначе при Groq-провайдере и ключе — Orpheus.
     *
     * <p>The client already detects the dominant / secondary language of the
     * reply text so the voice engine is never misled by the learner profile
     * alone. The backend additionally re-detects the dominant script as a
     * safety net — if the hint and the text disagree, the text wins.</p>
     */
    public byte[] synthesizeNeuralTts(String text, String langHintCode,
                                      String secondaryLangHintCode, boolean mixedHint)
            throws AiChatException {
        DetectedLangs langs = reconcileLanguages(text, langHintCode, secondaryLangHintCode, mixedHint);
        if (xaiApiKey != null && !xaiApiKey.trim().isEmpty()) {
            return synthesizeXaiTts(text, langs);
        }
        if ("groq".equals(normalizeProvider(provider)) && groqApiKey != null && !groqApiKey.trim().isEmpty()) {
            // Orpheus models are monolingual. The client is expected to route
            // mixed or non-supported languages to the browser before reaching
            // this path; we still map the detected primary to the model here.
            return synthesizeGroqOrpheusTts(text, langs.primary);
        }
        throw new AiChatException(
                "Neural TTS unavailable: set XAI_API_KEY, or LEXORA_AI_PROVIDER=groq with GROQ_API_KEY.");
    }

    /** Back-compat overload for callers that still pass a single lang hint. */
    public byte[] synthesizeNeuralTts(String text, String langHintCode) throws AiChatException {
        return synthesizeNeuralTts(text, langHintCode, null, false);
    }

    /**
     * xAI Text-to-Speech — unary {@code POST /v1/tts}, WAV для браузера.
     *
     * @see <a href="https://docs.x.ai/docs/guides/text-to-speech">xAI TTS</a>
     */
    private byte[] synthesizeXaiTts(String text, DetectedLangs langs) throws AiChatException {
        if (xaiApiKey == null || xaiApiKey.trim().isEmpty()) {
            throw new AiChatException("xAI TTS requires XAI_API_KEY / app.ai.xai.api-key.");
        }
        String t = text == null ? "" : text.trim();
        if (t.isEmpty()) {
            throw new AiChatException("Empty text");
        }
        if (t.length() > 15000) {
            t = t.substring(0, 15000);
        }

        String language = resolveXaiTtsLanguage(langs);
        String voiceId = selectXaiVoice(langs.primary);

        Map<String, Object> outputFormat = new LinkedHashMap<>();
        outputFormat.put("codec", "wav");
        outputFormat.put("sample_rate", 24000);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", t);
        body.put("voice_id", voiceId);
        body.put("language", language);
        body.put("output_format", outputFormat);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(xaiApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, lexoraHttpUserAgent.trim());
        headers.set(HttpHeaders.ACCEPT, "*/*");

        String url = xaiTtsUrl == null ? "" : xaiTtsUrl.trim();
        if (url.isEmpty()) {
            throw new AiChatException("app.ai.xai.tts-url / XAI_TTS_URL is empty.");
        }

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<byte[]> res = restTemplate.postForEntity(url, entity, byte[].class);
            byte[] audio = res.getBody();
            if (audio == null || audio.length < 12) {
                throw new AiChatException("xAI TTS returned empty audio");
            }
            if (audio.length >= 4
                    && audio[0] == 'R'
                    && audio[1] == 'I'
                    && audio[2] == 'F'
                    && audio[3] == 'F') {
                return audio;
            }
            /* Likely JSON error body returned as 200 — surface a short hint */
            String maybeJson = new String(audio, StandardCharsets.UTF_8);
            log.warn("xAI TTS unexpected payload: {}", trimLog(maybeJson));
            throw new AiChatException("xAI TTS returned non-WAV audio");
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("xAI TTS HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            throw new AiChatException("xAI TTS: HTTP " + e.getStatusCode().value()
                    + (rb == null || rb.isEmpty() ? "" : " — " + trimLog(rb))
                    + xaiAuthErrorHint(e.getStatusCode().value(), rb));
        } catch (RestClientException e) {
            log.warn("xAI TTS failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("xAI TTS failed: " + e.getMessage());
        } catch (AiChatException e) {
            throw e;
        } catch (Exception e) {
            log.warn("xAI TTS failed", e);
            throw new AiChatException("xAI TTS failed: " + e.getMessage());
        }
    }

    /**
     * xAI accepts BCP-47 codes ({@code ru}, {@code en}, …) or {@code auto}.
     * Unsupported ISO codes fall back to {@code auto}.
     */
    private static String langToXaiTtsLanguage(String lang) {
        if (lang == null || lang.isEmpty()) {
            return "auto";
        }
        switch (lang.toLowerCase(Locale.ROOT)) {
            case "ru":
                return "ru";
            case "en":
                return "en";
            case "ar":
                return "ar-SA";
            case "de":
                return "de";
            case "fr":
                return "fr";
            case "es":
                return "es-ES";
            case "it":
                return "it";
            case "pt":
                return "pt-BR";
            case "zh":
                return "zh";
            case "ja":
                return "ja";
            case "ko":
                return "ko";
            case "tr":
                return "tr";
            case "hi":
                return "hi";
            case "id":
                return "id";
            case "vi":
                return "vi";
            case "bn":
                return "bn";
            case "pl":
            case "uk":
            default:
                return "auto";
        }
    }

    private static String resolveXaiTtsLanguage(DetectedLangs langs) {
        if (langs.mixed && langs.secondary != null) {
            return "auto";
        }
        return langToXaiTtsLanguage(langs.primary);
    }

    private String selectXaiVoice(String primaryLang) {
        if ("ru".equals(primaryLang)
                && xaiTtsVoiceRu != null
                && !xaiTtsVoiceRu.trim().isEmpty()) {
            return xaiTtsVoiceRu.trim().toLowerCase(Locale.ROOT);
        }
        return xaiTtsVoice == null ? "eve" : xaiTtsVoice.trim().toLowerCase(Locale.ROOT);
    }

    /** Groq Orpheus — OpenAI-совместимый {@code /audio/speech}, один ключ с чатом и Whisper. */
    private byte[] synthesizeGroqOrpheusTts(String text, String langHintCode) throws AiChatException {
        String t = normalizeTextForGroqTts(text == null ? "" : text);
        if (t.isEmpty()) {
            throw new AiChatException("Empty text");
        }
        if (t.length() > 8000) {
            t = t.substring(0, 8000);
        }

        String lang = langHintCode == null ? "" : langHintCode.trim().toLowerCase(Locale.ROOT);
        boolean useArabic = "ar".equals(lang);
        String model = useArabic ? groqTtsModelAr.trim() : groqTtsModelEn.trim();
        String voice = useArabic ? groqTtsVoiceAr.trim() : groqTtsVoiceEn.trim();

        List<String> pieces = splitForGroqTts(t, GROQ_TTS_MAX_INPUT_CHARS);
        List<byte[]> wavChunks = new ArrayList<>(pieces.size());
        for (String piece : pieces) {
            String p = piece.trim();
            if (p.isEmpty()) {
                continue;
            }
            if (p.length() > 200) {
                // Should never happen if split + limit are correct; Groq returns 400 if over limit.
                p = p.substring(0, 200);
            }
            wavChunks.add(callGroqSpeechChunk(model, voice, p));
        }
        if (wavChunks.isEmpty()) {
            throw new AiChatException("Groq TTS: no speakable segments after normalization");
        }
        if (wavChunks.size() == 1) {
            return wavChunks.get(0);
        }
        return mergeGroqWavChunks(wavChunks);
    }

    private byte[] callGroqSpeechChunk(String model, String voice, String input) throws AiChatException {
        Map<String, Object> reqBody = new LinkedHashMap<>();
        reqBody.put("model", model.trim());
        reqBody.put("input", input);
        // Voice IDs are lowercase in Groq docs; mis-cased values yield HTTP 400.
        reqBody.put("voice", voice.trim().toLowerCase(Locale.ROOT));
        reqBody.put("response_format", "wav");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, groqUserAgent.trim());
        headers.set(HttpHeaders.ACCEPT, "*/*");

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(reqBody, headers);
            ResponseEntity<byte[]> res = restTemplate.postForEntity(groqTtsUrl.trim(), entity, byte[].class);
            byte[] wav = res.getBody();
            if (wav == null || wav.length < 44) {
                throw new AiChatException("Groq TTS returned empty audio");
            }
            return wav;
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("Groq TTS HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            String detail = (rb == null || rb.isEmpty()) ? "" : " — " + trimLog(rb);
            throw new AiChatException("Groq TTS: HTTP " + e.getStatusCode() + detail);
        } catch (RestClientException e) {
            log.warn("Groq TTS failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("Groq TTS failed: " + e.getMessage());
        }
    }

    /**
     * Groq is picky about newlines and some punctuation; long replies must be chunked
     * strictly under their character cap or the API returns 400 and the app falls back
     * to robotic browser SpeechSynthesis.
     */
    private static String normalizeTextForGroqTts(String raw) {
        String s = raw.trim();
        if (s.isEmpty()) {
            return "";
        }
        s = s.replace('\uFEFF', ' ');
        // Smart quotes / apostrophes → ASCII (models trained on plain punctuation)
        s = s.replace('\u201c', '"').replace('\u201d', '"');
        s = s.replace('\u2018', '\'').replace('\u2019', '\'').replace('\u02BC', '\'');
        s = s.replace('\u2013', '-').replace('\u2014', '-');
        // Java 8: only replace(CharSequence, CharSequence) accepts a string replacement — no replace(char, String).
        s = s.replace("\r\n", "\n").replace("\r", "\n");
        s = s.replace("\n", " ");
        s = s.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", " ");
        s = s.replace("**", "");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    private static List<String> splitForGroqTts(String text, int maxChars) {
        List<String> out = new ArrayList<>();
        String remaining = text.trim();
        int hardCap = Math.min(maxChars, 200);
        while (!remaining.isEmpty()) {
            if (remaining.length() <= hardCap) {
                out.add(remaining);
                break;
            }
            int cut = hardCap;
            int lastSpace = remaining.lastIndexOf(' ', hardCap);
            if (lastSpace > hardCap / 3) {
                cut = lastSpace;
            }
            String piece = remaining.substring(0, cut).trim();
            if (piece.isEmpty()) {
                piece = remaining.substring(0, hardCap).trim();
                remaining = remaining.substring(hardCap).trim();
                if (!piece.isEmpty()) {
                    out.add(piece);
                }
                continue;
            }
            out.add(piece);
            remaining = remaining.substring(cut).trim();
        }
        return out;
    }

    private static final class ParsedWav {
        final int audioFormat;
        final int channels;
        final int sampleRate;
        final int bitsPerSample;
        final byte[] pcm;

        ParsedWav(int audioFormat, int channels, int sampleRate, int bitsPerSample, byte[] pcm) {
            this.audioFormat = audioFormat;
            this.channels = channels;
            this.sampleRate = sampleRate;
            this.bitsPerSample = bitsPerSample;
            this.pcm = pcm;
        }
    }

    private static ParsedWav parseWavExtractPcm(byte[] wav) throws AiChatException {
        if (wav.length < 36) {
            throw new AiChatException("Invalid WAV (too short)");
        }
        if (wav[0] != 'R' || wav[1] != 'I' || wav[2] != 'F' || wav[3] != 'F') {
            throw new AiChatException("Invalid WAV (not RIFF)");
        }
        ByteBuffer bb = ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN);
        int offset = 12;
        Integer audioFormat = null;
        Integer channels = null;
        Integer sampleRate = null;
        Integer bitsPerSample = null;
        byte[] pcm = null;

        while (offset + 8 <= wav.length) {
            if (offset + 8 > wav.length) {
                break;
            }
            String chunkId = new String(wav, offset, 4, StandardCharsets.US_ASCII);
            int chunkSize = bb.getInt(offset + 4);
            int dataStart = offset + 8;
            if (chunkSize < 0 || dataStart > wav.length || dataStart + chunkSize > wav.length) {
                throw new AiChatException("Corrupt WAV chunk");
            }
            if ("fmt ".equals(chunkId)) {
                if (chunkSize < 16) {
                    throw new AiChatException("Corrupt WAV fmt chunk");
                }
                ByteBuffer fmt = ByteBuffer.wrap(wav, dataStart, chunkSize).order(ByteOrder.LITTLE_ENDIAN);
                audioFormat = (int) fmt.getShort() & 0xffff;
                channels = (int) fmt.getShort() & 0xffff;
                sampleRate = fmt.getInt();
                fmt.getInt();
                fmt.getShort();
                bitsPerSample = (int) fmt.getShort() & 0xffff;
            } else if ("data".equals(chunkId)) {
                pcm = Arrays.copyOfRange(wav, dataStart, dataStart + chunkSize);
            }
            offset += 8 + chunkSize;
            if ((chunkSize & 1) == 1) {
                offset++;
            }
        }

        if (pcm == null || audioFormat == null || channels == null || sampleRate == null || bitsPerSample == null) {
            throw new AiChatException("Could not parse WAV (missing fmt or data)");
        }
        return new ParsedWav(audioFormat, channels, sampleRate, bitsPerSample, pcm);
    }

    private static byte[] mergeGroqWavChunks(List<byte[]> chunks) throws AiChatException {
        ParsedWav first = parseWavExtractPcm(chunks.get(0));
        if (first.audioFormat != 1) {
            throw new AiChatException("Groq TTS: only PCM WAV is supported");
        }
        ByteArrayOutputStream pcmOut = new ByteArrayOutputStream(first.pcm.length * chunks.size());
        pcmOut.write(first.pcm, 0, first.pcm.length);
        for (int i = 1; i < chunks.size(); i++) {
            ParsedWav next = parseWavExtractPcm(chunks.get(i));
            if (next.audioFormat != first.audioFormat
                    || next.channels != first.channels
                    || next.sampleRate != first.sampleRate
                    || next.bitsPerSample != first.bitsPerSample) {
                throw new AiChatException("Groq TTS chunk format mismatch");
            }
            pcmOut.write(next.pcm, 0, next.pcm.length);
        }
        return pcmToWav(pcmOut.toByteArray(), first.sampleRate, first.channels, first.bitsPerSample);
    }

    private static String trimLog(String s) {
        if (s == null) return "";
        return s.length() > 500 ? s.substring(0, 500) + "…" : s;
    }

    /** Trim, strip BOM and outer quotes — common .env / editor paste issues. */
    private static String normalizeApiSecret(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        if (!s.isEmpty() && s.charAt(0) == '\uFEFF') {
            s = s.substring(1).trim();
        }
        if (s.length() >= 2) {
            char open = s.charAt(0);
            char close = s.charAt(s.length() - 1);
            if ((open == '"' && close == '"') || (open == '\'' && close == '\'')) {
                s = s.substring(1, s.length() - 1).trim();
            }
        }
        /* Некоторые копируют в .env уже с префиксом Bearer — Spring добавит второй раз. */
        if (s.length() > 7 && s.regionMatches(true, 0, "Bearer ", 0, 7)) {
            s = s.substring(7).trim();
        }
        return s;
    }

    /**
     * Logs common misconfiguration — does not print the secret.
     * Spring Boot does not read {@code .env} unless you use Docker/env vars / IDE Run Configuration.
     */
    private void logXaiKeyDiagnostics() {
        if (xaiApiKey == null || xaiApiKey.isEmpty()) {
            log.warn(
                    "XAI_API_KEY is empty. With Docker use root .env + restart backend; with IDE set env var XAI_API_KEY in Run Configuration (Spring does not auto-load .env).");
            return;
        }
        if (xaiApiKey.startsWith("gsk_")) {
            log.error(
                    "XAI_API_KEY starts with gsk_: that is a Groq key. Create an API key at https://console.x.ai/ (API Keys) and put it in XAI_API_KEY.");
        }
        if (xaiApiKey.startsWith("AIza")) {
            log.error(
                    "XAI_API_KEY looks like a Google Gemini key (AIza…). xAI expects a key from https://console.x.ai/");
        }
        log.info(
                "xAI API key is set (length {} chars). If requests fail with Incorrect API key, revoke and create a new key at console.x.ai, paste into XAI_API_KEY without quotes, restart backend.",
                xaiApiKey.length());
    }

    /** Короткая подсказка по телу ответа xAI (биллинг, ключ, …). */
    private static String xaiAuthErrorHint(int httpStatus, String responseBody) {
        if (responseBody == null || responseBody.isEmpty()) {
            return "";
        }
        String low = responseBody.toLowerCase(Locale.ROOT);

        /* Новая команда без баланса / лицензий на API — ключ уже подходит. */
        if (httpStatus == 403
                && (low.contains("credits") || low.contains("licenses"))
                && (low.contains("purchase") || low.contains("permission") || low.contains("does not have"))) {
            return " — Ключ верный, но у команды в xAI нет оплаченных кредитов или лицензий на API. Откройте https://console.x.ai/ → ваш team → оплата/пополнение (ссылка есть в JSON от xAI выше). После появления баланса запросы заработают.";
        }

        boolean mentionsKey = low.contains("api key") || low.contains("api_key");
        if (!mentionsKey) {
            return "";
        }
        if (httpStatus == 401
                || low.contains("incorrect api key")
                || low.contains("invalid api key")
                || low.contains("invalid_api_key")) {
            return " — Укажите действующий XAI_API_KEY из https://console.x.ai/ (раздел API Keys). В .env одна строка без кавычек; перезапустите backend. Если запускаете Spring из IDE, добавьте XAI_API_KEY в Run Configuration — файл .env сам по себе не подхватывается. Ключ Groq (gsk_…) сюда не подходит; при ошибке создайте новый ключ в консоли xAI.";
        }
        return "";
    }

    /** PCM little-endian → WAV (формат 1), для браузерного {@code Audio}. */
    private static byte[] pcmToWav(byte[] pcm, int sampleRate, int channels, int bitsPerSample) {
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        short blockAlign = (short) (channels * bitsPerSample / 8);
        int dataSize = pcm.length;
        int riffChunkSize = 36 + dataSize;

        ByteBuffer bb = ByteBuffer.allocate(44 + dataSize).order(ByteOrder.LITTLE_ENDIAN);
        bb.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        bb.putInt(riffChunkSize);
        bb.put("WAVE".getBytes(StandardCharsets.US_ASCII));
        bb.put("fmt ".getBytes(StandardCharsets.US_ASCII));
        bb.putInt(16);
        bb.putShort((short) 1);
        bb.putShort((short) channels);
        bb.putInt(sampleRate);
        bb.putInt(byteRate);
        bb.putShort(blockAlign);
        bb.putShort((short) bitsPerSample);
        bb.put("data".getBytes(StandardCharsets.US_ASCII));
        bb.putInt(dataSize);
        bb.put(pcm);
        return bb.array();
    }

    /**
     * Whisper on Groq — multilingual; omit {@code language} so the model detects it automatically.
     */
    public String transcribeGroq(byte[] audioBytes, String originalFilename) throws AiChatException {
        if (groqApiKey == null || groqApiKey.trim().isEmpty()) {
            throw new AiChatException("Speech transcription requires GROQ_API_KEY (Whisper). Chat uses your configured AI provider separately.");
        }
        if (audioBytes == null || audioBytes.length < 500) {
            throw new AiChatException("Audio too short.");
        }
        if (audioBytes.length > 8 * 1024 * 1024) {
            throw new AiChatException("Audio larger than 8 MB.");
        }

        final String fname = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename
                : "speech.webm";

        ByteArrayResource audioResource = new ByteArrayResource(audioBytes) {
            @Override
            public String getFilename() {
                return fname;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model", groqTranscriptionModel);
        body.add("file", audioResource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(groqApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, groqUserAgent.trim());
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);

        try {
            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(groqTranscriptionUrl, entity, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            String text = root.path("text").asText(null);
            if (text == null || text.trim().isEmpty()) {
                throw new AiChatException("Empty transcription text");
            }
            return text.trim();
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("Groq transcribe HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            throw new AiChatException("Groq transcription: HTTP " + e.getStatusCode());
        } catch (RestClientException e) {
            log.warn("Groq transcribe failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("Groq transcription failed: " + e.getMessage());
        } catch (AiChatException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Groq transcribe parse failed", e);
            throw new AiChatException("Failed to parse transcription response");
        }
    }

    public Dto.AiChatResponse chat(Dto.AiChatRequest req, String learningLanguage) throws AiChatException {
        validateMessages(req.getMessages());
        String lang = (learningLanguage == null || learningLanguage.trim().isEmpty()) ? "en" : learningLanguage.trim().toLowerCase(Locale.ROOT);
        String targetName = LANG_NAMES.getOrDefault(lang, lang);
        String scenario = req.getScenario() == null ? "FREE" : req.getScenario().trim().toUpperCase(Locale.ROOT);
        String ui = req.getUiLocale() == null ? "en" : req.getUiLocale().trim().toLowerCase(Locale.ROOT);
        if (!"ru".equals(ui)) {
            ui = "en";
        }
        String system = buildSystemPrompt(targetName, scenario);

        String p = normalizeProvider(provider);
        if ("xai".equals(p)) {
            if (xaiApiKey == null || xaiApiKey.trim().isEmpty()) {
                throw new AiChatException("AI is set to xAI Grok but XAI_API_KEY / app.ai.xai.api-key is empty.");
            }
            String reply = callXai(system, req.getMessages());
            return Dto.AiChatResponse.builder().reply(reply).provider("xai").build();
        }
        if ("groq".equals(p)) {
            if (groqApiKey == null || groqApiKey.trim().isEmpty()) {
                throw new AiChatException("AI is set to Groq but GROQ_API_KEY / app.ai.groq.api-key is empty.");
            }
            String reply = callGroq(system, req.getMessages());
            return Dto.AiChatResponse.builder().reply(reply).provider("groq").build();
        }
        if ("ollama".equals(p)) {
            String reply = callOllama(system, req.getMessages());
            return Dto.AiChatResponse.builder().reply(reply).provider("ollama").build();
        }
        if ("deepseek".equals(p)) {
            if (deepseekApiKey == null || deepseekApiKey.trim().isEmpty()) {
                throw new AiChatException("AI is set to DeepSeek but DEEPSEEK_API_KEY / app.ai.deepseek.api-key is empty.");
            }
            String reply = callDeepseekCompatible(system, req.getMessages());
            return Dto.AiChatResponse.builder().reply(reply).provider("deepseek").build();
        }
        String reply = mockReply(ui);
        return Dto.AiChatResponse.builder().reply(reply).provider("mock").build();
    }

    private static String normalizeProvider(String raw) {
        if (raw == null) return "mock";
        String p = raw.trim().toLowerCase(Locale.ROOT);
        if ("grok".equals(p)) {
            return "xai";
        }
        return p;
    }

    private void validateMessages(List<Dto.AiChatMessage> messages) throws AiChatException {
        if (messages == null || messages.isEmpty()) {
            throw new AiChatException("messages required");
        }
        Dto.AiChatMessage last = messages.get(messages.size() - 1);
        if (!"user".equalsIgnoreCase(last.getRole())) {
            throw new AiChatException("Last message must be from user");
        }
        for (Dto.AiChatMessage m : messages) {
            String r = m.getRole() == null ? "" : m.getRole().trim().toLowerCase(Locale.ROOT);
            if (!"user".equals(r) && !"assistant".equals(r)) {
                throw new AiChatException("Invalid role: only user and assistant allowed");
            }
        }
    }

    private String buildSystemPrompt(String targetLanguageName, String scenario) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are Lexora, a friendly, patient language-practice partner. The learner is studying ");
        sb.append(targetLanguageName);
        sb.append(". ");
        sb.append("Hold the conversation primarily in ");
        sb.append(targetLanguageName);
        sb.append(", matching the learner's level from their messages. ");
        sb.append("Infer a rough CEFR band (A0 through C1) from their vocabulary and sentence complexity: ");
        sb.append("for A0–A1 use very short sentences, basic vocabulary, and more scaffolding; ");
        sb.append("for B2–C1 allow longer turns, nuance, and idioms while staying clear. ");
        sb.append("Keep replies concise (2–6 short sentences) unless they ask for detail. ");
        sb.append("Error correction (mandatory): If their latest message has mistakes in ");
        sb.append(targetLanguageName);
        sb.append(", fix them right away in the same reply — do not wait for them to ask. ");
        sb.append("Give a brief natural reaction in ");
        sb.append(targetLanguageName);
        sb.append(", then immediately the corrected sentence or phrase in ");
        sb.append(targetLanguageName);
        sb.append(", then one short line that names what was wrong and why (tense, article, word order, collocation, etc.) — ");
        sb.append("that explanation line must also be written in ");
        sb.append(targetLanguageName);
        sb.append(". ");
        sb.append("Translation into another language is NOT an error-correction trigger: only correct language form unless they asked for a translation. ");
        sb.append("Ask a follow-up question occasionally to keep the dialogue going, but not on every turn. ");

        appendScenarioInstructions(sb, scenario);

        sb.append("Explanation language policy: Write grammar tips, corrections, and structural breakdowns in ");
        sb.append(targetLanguageName);
        sb.append(" — the language they are learning. ");
        sb.append("Do NOT switch explanations to Russian (or any other language) just because the learner uses a Russian UI or typed a Russian side remark; ");
        sb.append("the app interface locale must NOT influence explanation language. ");
        sb.append("Use Russian in your reply only when they explicitly ask for Russian ");
        sb.append("(e.g. «переведи на русский», «объясни по-русски», «на русском», \"in Russian\", \"translate to Russian\"). ");

        sb.append("If the learner switches to another language in their latest message, answer mainly in that language for natural dialogue, then gently steer practice back toward ");
        sb.append(targetLanguageName);
        sb.append(" when it helps. ");

        sb.append("Translation requests are a hard exception: if the learner explicitly asks you to translate into another language ");
        sb.append("(e.g. «переведи на русский», «переведи ответ на русский», «переведи то что ты сказал», \"translate into Russian\", \"translate your answer\", \"translate what you just said\", \"in Spanish please\"), ");
        sb.append("you must satisfy the request first. ");
        sb.append("Translation scope (critical): Unless they clearly point at something else (\"translate MY last message\", \"translate the word X\"), ");
        sb.append("they mean YOUR immediately preceding assistant message — the full reply you gave last turn. ");
        sb.append("Translate that assistant text faithfully (same meaning, same tone, same dialogue role): do NOT substitute the learner's user message, ");
        sb.append("do NOT translate a different older turn, do NOT summarise or paraphrase loosely unless they asked for a summary. ");
        sb.append("Put the complete translation at the very start of your reply in the requested language, using that language's own script (Cyrillic for Russian, Hangul for Korean, etc.). ");
        sb.append("Translations must be idiomatic and natural — not word-for-word calques, not mixed alphabets inside one word, and no nonsense hybrids (never write broken tokens like Latin roots glued to Cyrillic endings). ");
        sb.append("Do NOT refuse, hedge, or insist on staying in ");
        sb.append(targetLanguageName);
        sb.append(" before translating. After the translation you may add one short follow-up in ");
        sb.append(targetLanguageName);
        sb.append(" to continue practice. ");

        sb.append("Continuation cues: If they say things like «давай продолжим», «продолжай», «дальше», \"let's continue\", \"go on\", \"carry on\", or similar without changing topic, ");
        sb.append("they want you to resume the current lesson / scenario — do NOT reset to small talk or a new theme. ");
        sb.append("Continue naturally: if your previous assistant message asked a question they never answered, repeat or gently rephrase that question first; ");
        sb.append("if they already answered, advance to the next realistic step in the scenario or the next practice prompt. ");
        sb.append("Stay in role when the scenario calls for it (café staff, receptionist, etc.). ");

        // Code-switching / pronunciation discipline — this is what keeps the TTS clean.
        sb.append("Pronunciation discipline for any reply that includes foreign-language material: ");
        sb.append("quote foreign words, phrases, proper nouns and example sentences in their native script (e.g. English inside a Russian reply stays in Latin letters; Russian inside an English reply stays in Cyrillic). ");
        sb.append("Do NOT transliterate foreign words into the surrounding language's alphabet — e.g. never write English as 'хеллоу' or Russian as 'privet'. ");
        sb.append("Inside a Cyrillic Russian sentence, never insert Latin-letter syllables except inside clearly quoted foreign phrases or brand names — ");
        sb.append("always choose normal Russian vocabulary instead (e.g. for 'sit down / take a seat' use «присядьте», «сядьте», «присаживайтесь», not invented Latin-Cyrillic mash-ups). ");
        sb.append("This lets the voice engine pronounce each phrase in its real language. ");
        sb.append("Avoid Markdown, bullet lists, emojis, stage directions and sound effects — the text will be read aloud. ");

        sb.append("Never claim to browse the web or access real-time data.");
        return sb.toString();
    }

    private void appendScenarioInstructions(StringBuilder sb, String scenario) {
        switch (scenario == null ? "" : scenario) {
            case "AIRPORT":
                sb.append("Scenario: airport — check-in, security, gate, boarding, luggage, delays and rebooking. Play the role of airline staff, security officer or a fellow traveler as fits the turn. ");
                break;
            case "CAFE":
                sb.append("Scenario: café — ordering drinks and food, modifications (no sugar, oat milk), paying, splitting bills, small talk with the barista. ");
                break;
            case "RESTAURANT":
                sb.append("Scenario: restaurant — booking a table, reading the menu, recommending dishes, handling allergies, ordering wine, asking for the bill and tipping norms. ");
                break;
            case "HOTEL":
                sb.append("Scenario: hotel — check-in and check-out, keycard issues, room problems (noise, heating, towels), ordering room service, late checkout, directions from reception. ");
                break;
            case "SHOP":
                sb.append("Scenario: shop / clothing store — sizes and fits, colors, trying on, prices and discounts, refunds and exchanges, paying by card or cash. ");
                break;
            case "DOCTOR":
                sb.append("Scenario: doctor's office — describing symptoms, duration, allergies and medications, understanding a diagnosis, basic prescriptions. Stay calm and use approachable medical vocabulary, not graphic detail. ");
                break;
            case "PHARMACY":
                sb.append("Scenario: pharmacy — asking for over-the-counter remedies, dosage, interactions, prescription pickup, insurance. ");
                break;
            case "TAXI":
                sb.append("Scenario: taxi / rideshare — booking a ride, giving an address, route preferences, price estimates, paying and tipping, small talk with the driver. ");
                break;
            case "BANK":
                sb.append("Scenario: bank — opening an account, wiring money, lost card, ATM problems, exchanging currency, explaining fees. ");
                break;
            case "JOB_INTERVIEW":
                sb.append("Scenario: job interview — self-introduction, experience and skills, motivation for the role, strengths and weaknesses, questions about the company, salary expectations. Play the interviewer. ");
                break;
            case "DIRECTIONS":
                sb.append("Scenario: asking for directions — streets, turns, public transport, landmarks, distance, ETA. Include realistic city vocabulary. ");
                break;
            case "SMALL_TALK":
                sb.append("Scenario: friendly small talk — weekend plans, weather, hobbies, travel stories, favourite food, recent shows. Keep the tone light and curious. ");
                break;
            case "PHONE_CALL":
                sb.append("Scenario: phone call — answering and introducing yourself, asking to speak to someone, leaving and taking messages, scheduling, polite hold phrases. Text-only, but behave as if on the phone (no visual cues). ");
                break;
            case "EMERGENCY":
                sb.append("Scenario: emergency — calling 112 / 911, reporting an accident or theft, describing a location and injuries, following dispatcher instructions. Use urgent but calm phrasing. ");
                break;
            case "BUSINESS_MEETING":
                sb.append("Scenario: business meeting — agenda, status updates, disagreement politely, proposing next steps, action items. Use a professional register. ");
                break;
            case "POST_OFFICE":
                sb.append("Scenario: post office — sending a parcel or letter, choosing shipping speed, customs forms, tracking, pickup. ");
                break;
            case "FREE":
            default:
                sb.append("Scenario: open conversation — everyday topics the learner picks, with gentle suggestions when they hesitate. ");
        }
    }

    private String mockReply(String uiLocale) {
        if ("ru".equals(uiLocale)) {
            return "Режим демонстрации: задайте LEXORA_AI_PROVIDER=xai (или grok) и XAI_API_KEY, либо GROQ_API_KEY с LEXORA_AI_PROVIDER=groq, "
                    + "либо DEEPSEEK_API_KEY с LEXORA_AI_PROVIDER=deepseek, либо Ollama (LEXORA_AI_PROVIDER=ollama). Подробности — application.properties.";
        }
        return "Demo mode: set LEXORA_AI_PROVIDER=xai (or grok) with XAI_API_KEY, or GROQ_API_KEY with LEXORA_AI_PROVIDER=groq, "
                + "or DEEPSEEK_API_KEY with LEXORA_AI_PROVIDER=deepseek, or run Ollama (LEXORA_AI_PROVIDER=ollama). See application.properties.";
    }

    /**
     * xAI Grok — OpenAI-совместимый {@code /v1/chat/completions}.
     *
     * @see <a href="https://docs.x.ai/docs/guides/chat-completions">xAI chat completions</a>
     */
    private String callXai(String system, List<Dto.AiChatMessage> messages) throws AiChatException {
        if (xaiApiKey == null || xaiApiKey.trim().isEmpty()) {
            throw new AiChatException("xAI Grok chat requires XAI_API_KEY.");
        }

        List<Map<String, String>> openAi = new ArrayList<>();
        Map<String, String> sys = new LinkedHashMap<>();
        sys.put("role", "system");
        sys.put("content", system);
        openAi.add(sys);
        for (Dto.AiChatMessage m : messages) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("role", m.getRole().trim().toLowerCase(Locale.ROOT));
            row.put("content", m.getContent());
            openAi.add(row);
        }

        int maxTok = xaiChatMaxOutputTokens;
        if (maxTok < 256) {
            maxTok = 256;
        }
        if (maxTok > 8192) {
            maxTok = 8192;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", xaiChatModel == null ? "grok-4.3" : xaiChatModel.trim());
        body.put("messages", openAi);
        body.put("max_tokens", maxTok);
        body.put("temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(xaiApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, lexoraHttpUserAgent.trim());
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);

        String url = xaiChatUrl == null ? "" : xaiChatUrl.trim();
        if (url.isEmpty()) {
            throw new AiChatException("app.ai.xai.chat-url / XAI_CHAT_URL is empty.");
        }

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode choice0 = root.path("choices").path(0);
            String text = choice0.path("message").path("content").asText(null);
            if (text == null || text.trim().isEmpty()) {
                log.warn("xAI Grok empty content: {}", trimLog(res.getBody()));
                throw new AiChatException("Model returned an empty reply");
            }
            return text.trim();
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("xAI chat HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            String hint = xaiAuthErrorHint(e.getStatusCode().value(), rb);
            throw new AiChatException("xAI Grok: HTTP " + e.getStatusCode().value()
                    + (rb == null || rb.isEmpty() ? "" : " — " + trimLog(rb))
                    + hint);
        } catch (RestClientException e) {
            log.warn("xAI chat failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("xAI Grok request failed: " + e.getMessage());
        } catch (AiChatException e) {
            throw e;
        } catch (Exception e) {
            log.warn("xAI chat parse failed", e);
            throw new AiChatException("Failed to read xAI Grok response");
        }
    }

    private String callGroq(String system, List<Dto.AiChatMessage> messages) throws AiChatException {
        List<Map<String, String>> openAi = new ArrayList<>();
        Map<String, String> sys = new LinkedHashMap<>();
        sys.put("role", "system");
        sys.put("content", system);
        openAi.add(sys);
        for (Dto.AiChatMessage m : messages) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("role", m.getRole().trim().toLowerCase(Locale.ROOT));
            row.put("content", m.getContent());
            openAi.add(row);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", groqModel);
        body.put("messages", openAi);
        body.put("max_tokens", 1024);
        body.put("temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, groqUserAgent.trim());
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        headers.set(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9");

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(groqUrl, entity, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode choice0 = root.path("choices").path(0);
            String text = choice0.path("message").path("content").asText(null);
            if (text == null || text.trim().isEmpty()) {
                log.warn("Groq empty content: {}", res.getBody());
                throw new AiChatException("Model returned an empty reply");
            }
            return text.trim();
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("Groq HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            String hint = "";
            int code = e.getStatusCode().value();
            if (code == 403 && rb != null && rb.contains("1010")) {
                hint = "Cloudflare 1010: обновите образ backend (Apache HttpClient + User-Agent). Если снова 403 — IP/регион/VPN или Ollama.";
            } else if (code == 403) {
                hint = "Проверьте GROQ_API_KEY и ограничения аккаунта/региона.";
            }
            throw new AiChatException("Groq: HTTP " + code + (hint.isEmpty() ? "" : " — " + hint));
        } catch (RestClientException e) {
            log.warn("Groq request failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("Groq request failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Groq parse failed", e);
            throw new AiChatException("Failed to read Groq response");
        }
    }

    /**
     * OpenAI-compatible chat completions (DeepSeek cloud, LM Studio, vLLM, etc.).
     */
    private String callDeepseekCompatible(String system, List<Dto.AiChatMessage> messages) throws AiChatException {
        List<Map<String, String>> openAi = new ArrayList<>();
        Map<String, String> sys = new LinkedHashMap<>();
        sys.put("role", "system");
        sys.put("content", system);
        openAi.add(sys);
        for (Dto.AiChatMessage m : messages) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("role", m.getRole().trim().toLowerCase(Locale.ROOT));
            row.put("content", m.getContent());
            openAi.add(row);
        }

        int maxTok = deepseekMaxOutputTokens;
        if (maxTok < 256) {
            maxTok = 256;
        }
        if (maxTok > 8192) {
            maxTok = 8192;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", deepseekModel.trim());
        body.put("messages", openAi);
        body.put("max_tokens", maxTok);
        body.put("temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(deepseekApiKey.trim());
        headers.set(HttpHeaders.USER_AGENT, lexoraHttpUserAgent != null ? lexoraHttpUserAgent.trim() : "Lexora/1.0");
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);

        String url = deepseekUrl != null ? deepseekUrl.trim() : "";
        if (url.isEmpty()) {
            throw new AiChatException("app.ai.deepseek.url / DEEPSEEK_API_URL is empty.");
        }

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode choice0 = root.path("choices").path(0);
            String text = choice0.path("message").path("content").asText(null);
            if (text == null || text.trim().isEmpty()) {
                log.warn("DeepSeek-compatible empty content: {}", trimLog(res.getBody()));
                throw new AiChatException("Model returned an empty reply");
            }
            return text.trim();
        } catch (HttpStatusCodeException e) {
            String rb = "";
            try {
                rb = e.getResponseBodyAsString();
            } catch (Exception ignored) {
                /* empty */
            }
            log.warn("DeepSeek-compatible HTTP {}: {}", e.getStatusCode(),
                    rb != null && rb.length() > 400 ? rb.substring(0, 400) + "…" : rb);
            throw new AiChatException("DeepSeek-compatible: HTTP " + e.getStatusCode().value());
        } catch (RestClientException e) {
            log.warn("DeepSeek-compatible request failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AiChatException("DeepSeek-compatible request failed: " + e.getMessage());
        } catch (AiChatException e) {
            throw e;
        } catch (Exception e) {
            log.warn("DeepSeek-compatible parse failed", e);
            throw new AiChatException("Failed to read DeepSeek-compatible response");
        }
    }

    private String callOllama(String system, List<Dto.AiChatMessage> messages) throws AiChatException {
        List<Map<String, String>> ollamaMsgs = new ArrayList<>();
        Map<String, String> sys = new LinkedHashMap<>();
        sys.put("role", "system");
        sys.put("content", system);
        ollamaMsgs.add(sys);
        for (Dto.AiChatMessage m : messages) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("role", m.getRole().trim().toLowerCase(Locale.ROOT));
            row.put("content", m.getContent());
            ollamaMsgs.add(row);
        }

        String url = ollamaBaseUrl.replaceAll("/$", "") + "/api/chat";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", ollamaModel);
        body.put("messages", ollamaMsgs);
        body.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            String text = root.path("message").path("content").asText(null);
            if (text == null || text.trim().isEmpty()) {
                log.warn("Ollama empty content: {}", res.getBody());
                throw new AiChatException("Model returned an empty reply. Is the model pulled? ollama pull " + ollamaModel);
            }
            return text.trim();
        } catch (RestClientException e) {
            log.warn("Ollama request failed: {}", e.getMessage());
            throw new AiChatException("Ollama request failed (is it running on " + ollamaBaseUrl + "?): " + e.getMessage());
        } catch (AiChatException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Ollama parse failed", e);
            throw new AiChatException("Failed to read Ollama response");
        }
    }

    // ------------------------------------------------------------------
    // Language detection + TTS prompt helpers
    // ------------------------------------------------------------------

    /**
     * Reconciled language info for a single TTS request. The detector is used
     * as a safety net: if the caller's hint contradicts the actual text
     * (e.g. hint=en, text is pure Cyrillic), the text wins.
     */
    private static final class DetectedLangs {
        final String primary;
        /** Nullable — only populated for code-switched replies. */
        final String secondary;
        final boolean mixed;

        DetectedLangs(String primary, String secondary, boolean mixed) {
            this.primary = primary;
            this.secondary = secondary;
            this.mixed = mixed;
        }
    }

    private static DetectedLangs reconcileLanguages(String text,
                                                    String primaryHintCode,
                                                    String secondaryHintCode,
                                                    boolean mixedHint) {
        int[] counts = countScripts(text == null ? "" : text);
        int latin = counts[0];
        int cyr = counts[1];
        int arab = counts[2];
        int han = counts[3];
        int kana = counts[4];
        int hangul = counts[5];
        int total = latin + cyr + arab + han + kana + hangul;

        String hint = normalizeLang(primaryHintCode);
        String secHint = normalizeLang(secondaryHintCode);

        if (total == 0) {
            return new DetectedLangs(hint == null ? "en" : hint, secHint, mixedHint);
        }

        String[] ordered = rankScripts(latin, cyr, arab, han, kana, hangul);
        String dominantScript = ordered[0];
        String runnerUp = ordered[1];
        int dominantCount = countFor(dominantScript, latin, cyr, arab, han, kana, hangul);
        int runnerUpCount = runnerUp == null ? 0 : countFor(runnerUp, latin, cyr, arab, han, kana, hangul);

        String primary = scriptToLang(dominantScript, hint, text);
        String secondary = null;
        boolean mixed = mixedHint;
        if (runnerUpCount > 0 && ((double) runnerUpCount) / total >= 0.15) {
            secondary = scriptToLang(runnerUp, secHint, text);
            mixed = true;
        } else if (secHint != null && !secHint.equals(primary)) {
            secondary = secHint;
        }

        if (secondary != null && secondary.equals(primary)) {
            secondary = null;
        }
        return new DetectedLangs(primary, secondary, mixed && secondary != null);
    }

    private static int[] countScripts(String text) {
        int latin = 0, cyr = 0, arab = 0, han = 0, kana = 0, hangul = 0;
        int len = text.length();
        int i = 0;
        while (i < len) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (isLatinLetter(cp)) latin++;
            else if (cp >= 0x0400 && cp <= 0x052F) cyr++;
            else if (isArabicLetter(cp)) arab++;
            else if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)) han++;
            else if ((cp >= 0x3040 && cp <= 0x309F) || (cp >= 0x30A0 && cp <= 0x30FF)) kana++;
            else if ((cp >= 0xAC00 && cp <= 0xD7AF) || (cp >= 0x1100 && cp <= 0x11FF)) hangul++;
        }
        return new int[] { latin, cyr, arab, han, kana, hangul };
    }

    private static boolean isLatinLetter(int cp) {
        return (cp >= 0x0041 && cp <= 0x005A)
                || (cp >= 0x0061 && cp <= 0x007A)
                || (cp >= 0x00C0 && cp <= 0x024F)
                || (cp >= 0x1E00 && cp <= 0x1EFF);
    }

    private static boolean isArabicLetter(int cp) {
        return (cp >= 0x0600 && cp <= 0x06FF)
                || (cp >= 0x0750 && cp <= 0x077F)
                || (cp >= 0x08A0 && cp <= 0x08FF)
                || (cp >= 0xFB50 && cp <= 0xFDFF)
                || (cp >= 0xFE70 && cp <= 0xFEFF);
    }

    private static String[] rankScripts(int latin, int cyr, int arab, int han, int kana, int hangul) {
        String[] names = { "latin", "cyr", "arab", "han", "kana", "hangul" };
        int[] values = { latin, cyr, arab, han, kana, hangul };
        for (int i = 0; i < values.length; i++) {
            int maxIdx = i;
            for (int j = i + 1; j < values.length; j++) {
                if (values[j] > values[maxIdx]) maxIdx = j;
            }
            if (maxIdx != i) {
                int tv = values[i]; values[i] = values[maxIdx]; values[maxIdx] = tv;
                String tn = names[i]; names[i] = names[maxIdx]; names[maxIdx] = tn;
            }
        }
        return new String[] { values[0] > 0 ? names[0] : "latin", values[1] > 0 ? names[1] : null };
    }

    private static int countFor(String script, int latin, int cyr, int arab, int han, int kana, int hangul) {
        if (script == null) return 0;
        switch (script) {
            case "latin": return latin;
            case "cyr": return cyr;
            case "arab": return arab;
            case "han": return han;
            case "kana": return kana;
            case "hangul": return hangul;
            default: return 0;
        }
    }

    private static String scriptToLang(String script, String hint, String text) {
        if (script == null) return hint != null ? hint : "en";
        switch (script) {
            case "cyr":
                return (text != null && text.matches("(?s).*[іїєґІЇЄҐ].*")) ? "uk" : "ru";
            case "arab": return "ar";
            case "han":  return "zh";
            case "kana": return "ja";
            case "hangul": return "ko";
            case "latin":
            default: {
                if (hint != null) {
                    switch (hint) {
                        case "en": case "de": case "es": case "fr": case "it":
                        case "pt": case "pl": case "tr":
                            return hint;
                        default: break;
                    }
                }
                return "en";
            }
        }
    }

    private static String normalizeLang(String code) {
        if (code == null) return null;
        String c = code.trim().toLowerCase(Locale.ROOT);
        return c.isEmpty() ? null : c;
    }

    /** Checked exception mapped to HTTP by the controller. */
    public static class AiChatException extends Exception {
        public AiChatException(String message) {
            super(message);
        }
    }
}
