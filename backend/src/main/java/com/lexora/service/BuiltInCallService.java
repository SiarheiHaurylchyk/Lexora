package com.lexora.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Builds in-browser video room URLs (default: public Jitsi Meet). Suitable for 1:1 lessons;
 * chat and screen sharing live in the provider UI.
 */
@Component
public class BuiltInCallService {

    @Value("${lexora.jitsi-base-url:https://meet.jit.si}")
    private String jitsiBaseUrl;

    public String roomUrl(String callRoomId) {
        if (callRoomId == null || callRoomId.trim().isEmpty()) {
            return null;
        }
        String base = jitsiBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + callRoomId.trim();
    }
}
