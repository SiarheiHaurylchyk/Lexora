package com.lexora.service;

import com.lexora.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-classroom stopwatch (in-memory). Teacher starts/stops; student reads last result via GET.
 */
@Service
public class ClassroomTimerService {

    private static final String PHASE_IDLE = "IDLE";
    private static final String PHASE_RUNNING = "RUNNING";
    private static final String PHASE_STOPPED = "STOPPED";

    private static final class MutableTimer {
        volatile String phase = PHASE_IDLE;
        volatile long startedAtMs;
        volatile long stoppedAtMs;
    }

    private final ConcurrentHashMap<Long, MutableTimer> rooms = new ConcurrentHashMap<>();

    public Dto.ClassroomTimerDTO snapshot(long linkId) {
        long now = System.currentTimeMillis();
        MutableTimer t = rooms.get(linkId);
        if (t == null || PHASE_IDLE.equals(t.phase)) {
            return build(PHASE_IDLE, null, null, null, now);
        }
        if (PHASE_RUNNING.equals(t.phase)) {
            return build(PHASE_RUNNING, t.startedAtMs, null, null, now);
        }
        long elapsed = Math.max(0L, t.stoppedAtMs - t.startedAtMs);
        return build(PHASE_STOPPED, t.startedAtMs, t.stoppedAtMs, elapsed, now);
    }

    /** Teacher only (caller must enforce). Starts a new run; replaces previous stopped session. */
    public Dto.ClassroomTimerDTO start(long linkId) {
        long now = System.currentTimeMillis();
        rooms.compute(linkId, (k, v) -> {
            MutableTimer m = v != null ? v : new MutableTimer();
            m.phase = PHASE_RUNNING;
            m.startedAtMs = now;
            m.stoppedAtMs = 0L;
            return m;
        });
        return snapshot(linkId);
    }

    /** Teacher only. No-op if not running. */
    public Dto.ClassroomTimerDTO stop(long linkId) {
        long now = System.currentTimeMillis();
        rooms.computeIfPresent(linkId, (k, t) -> {
            if (PHASE_RUNNING.equals(t.phase)) {
                t.phase = PHASE_STOPPED;
                t.stoppedAtMs = now;
            }
            return t;
        });
        return snapshot(linkId);
    }

    /** Teacher only. Clears idle state so student no longer sees a stopped result. */
    public Dto.ClassroomTimerDTO reset(long linkId) {
        rooms.remove(linkId);
        return snapshot(linkId);
    }

    private static Dto.ClassroomTimerDTO build(String phase, Long startedAtMs, Long stoppedAtMs, Long elapsedMs, long serverNowMs) {
        return Dto.ClassroomTimerDTO.builder()
                .phase(phase)
                .startedAtMs(startedAtMs)
                .stoppedAtMs(stoppedAtMs)
                .elapsedMs(elapsedMs)
                .serverNowMs(serverNowMs)
                .build();
    }
}
