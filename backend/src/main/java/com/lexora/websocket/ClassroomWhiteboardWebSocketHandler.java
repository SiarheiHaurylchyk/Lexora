package com.lexora.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

@Component
public class ClassroomWhiteboardWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ClassroomWhiteboardWebSocketHandler.class);

    @Autowired private ClassroomWhiteboardRoomService roomService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long linkId = attrLinkId(session);
        if (linkId == null) {
            closeQuietly(session);
            return;
        }
        roomService.join(linkId, session);
        String replay = roomService.getLastPayload(linkId);
        if (replay != null && !replay.isEmpty()) {
            try {
                roomService.sendOne(session, replay);
            } catch (IOException e) {
                log.debug("Whiteboard replay failed: {}", e.getMessage());
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Long linkId = attrLinkId(session);
        if (linkId == null) {
            return;
        }
        String payload = message.getPayload();
        if (payload == null || payload.isEmpty()) {
            return;
        }
        roomService.rememberPayload(linkId, payload);
        roomService.broadcastExcept(linkId, payload, session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long linkId = attrLinkId(session);
        if (linkId != null) {
            roomService.leave(linkId, session);
        }
    }

    private static Long attrLinkId(WebSocketSession session) {
        Object v = session.getAttributes().get("linkId");
        if (v instanceof Long) {
            return (Long) v;
        }
        return null;
    }

    private static void closeQuietly(WebSocketSession session) {
        try {
            session.close(CloseStatus.NOT_ACCEPTABLE);
        } catch (IOException ignored) {
            // ignore
        }
    }
}
