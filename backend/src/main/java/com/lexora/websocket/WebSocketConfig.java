package com.lexora.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired private ClassroomWhiteboardWebSocketHandler classroomWhiteboardWebSocketHandler;
    @Autowired private ClassroomWhiteboardHandshakeInterceptor classroomWhiteboardHandshakeInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] patterns = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toArray(String[]::new);
        if (patterns.length == 0) {
            patterns = new String[] { "*" };
        }
        registry.addHandler(classroomWhiteboardWebSocketHandler, "/ws/classroom-whiteboard/{linkId}")
                .addInterceptors(classroomWhiteboardHandshakeInterceptor)
                .setAllowedOriginPatterns(patterns);
    }
}
