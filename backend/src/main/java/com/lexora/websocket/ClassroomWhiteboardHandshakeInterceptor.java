package com.lexora.websocket;

import com.lexora.entity.User;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import com.lexora.security.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * JWT via {@code ?token=} + classroom participant check (same rule as REST classroom APIs).
 */
@Component
public class ClassroomWhiteboardHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ClassroomWhiteboardHandshakeInterceptor.class);

    @Autowired private JwtUtils jwtUtils;
    @Autowired private UserRepository userRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest)) {
            return false;
        }
        ServletServerHttpRequest servlet = (ServletServerHttpRequest) request;
        String path = servlet.getServletRequest().getRequestURI();
        Long linkId = ClassroomWhiteboardRoomService.parseLinkIdFromPath(path);
        if (linkId == null) {
            log.warn("Whiteboard handshake bad path: {}", path);
            return false;
        }
        String token = servlet.getServletRequest().getParameter("token");
        if (token == null || token.trim().isEmpty()) {
            log.warn("Whiteboard handshake missing token linkId={}", linkId);
            return false;
        }
        if (!jwtUtils.validateToken(token)) {
            return false;
        }
        String username;
        try {
            username = jwtUtils.getUsernameFromToken(token);
        } catch (Exception e) {
            return false;
        }
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return false;
        }
        boolean participant = teacherStudentRepository.findIdIfParticipant(linkId, user.getId()).isPresent();
        if (!participant) {
            log.warn("Whiteboard handshake denied user={} linkId={}", username, linkId);
            return false;
        }
        attributes.put("linkId", linkId);
        attributes.put("username", username);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}
