package com.lexora.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory presence + last scene relay for classroom whiteboards (teacher ↔ student).
 */
@Service
public class ClassroomWhiteboardRoomService {

    private static final Logger log = LoggerFactory.getLogger(ClassroomWhiteboardRoomService.class);

    private static final String PREFIX = "/ws/classroom-whiteboard/";

    private final ConcurrentHashMap<Long, ConcurrentHashMap<String, WebSocketSession>> sessionsByLink = new ConcurrentHashMap<>();
    /** Latest payload JSON (same as client sends) for late joiners. */
    private final ConcurrentHashMap<Long, String> lastPayloadByLink = new ConcurrentHashMap<>();

    public static Long parseLinkIdFromPath(String path) {
        if (path == null || !path.startsWith(PREFIX)) {
            return null;
        }
        String tail = path.substring(PREFIX.length());
        int slash = tail.indexOf('/');
        String idPart = slash >= 0 ? tail.substring(0, slash) : tail;
        try {
            return Long.parseLong(idPart);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public void join(Long linkId, WebSocketSession session) {
        sessionsByLink.computeIfAbsent(linkId, k -> new ConcurrentHashMap<>()).put(session.getId(), session);
    }

    public void leave(Long linkId, WebSocketSession session) {
        ConcurrentHashMap<String, WebSocketSession> room = sessionsByLink.get(linkId);
        if (room == null) {
            return;
        }
        room.remove(session.getId());
        if (room.isEmpty()) {
            sessionsByLink.remove(linkId);
        }
    }

    public String getLastPayload(Long linkId) {
        return lastPayloadByLink.get(linkId);
    }

    public void rememberPayload(Long linkId, String payload) {
        lastPayloadByLink.put(linkId, payload);
    }

    /**
     * Sends to every session in the room except {@code excludeSessionId}.
     */
    public void broadcastExcept(Long linkId, String payload, String excludeSessionId) {
        ConcurrentHashMap<String, WebSocketSession> room = sessionsByLink.get(linkId);
        if (room == null || room.isEmpty()) {
            return;
        }
        TextMessage tm = new TextMessage(payload);
        for (WebSocketSession s : room.values()) {
            if (excludeSessionId != null && s.getId().equals(excludeSessionId)) {
                continue;
            }
            try {
                if (s.isOpen()) {
                    synchronized (s) {
                        s.sendMessage(tm);
                    }
                }
            } catch (IOException e) {
                log.debug("Whiteboard send failed session={}: {}", s.getId(), e.getMessage());
            }
        }
    }

    public void sendOne(WebSocketSession session, String payload) throws IOException {
        if (session != null && session.isOpen()) {
            synchronized (session) {
                session.sendMessage(new TextMessage(payload));
            }
        }
    }
}
