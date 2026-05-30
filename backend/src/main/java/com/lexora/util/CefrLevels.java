package com.lexora.util;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Normalizes CEFR level strings stored on catalog decks (A1 … C2). */
public final class CefrLevels {

    private static final Set<String> KNOWN = new HashSet<>(
            Arrays.asList("A0", "A1", "A2", "B1", "B2", "C1", "C2"));

    private CefrLevels() {}

    /** Returns a canonical code (A1, B2, …) or null when empty/unknown. */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String compact = raw.trim().toUpperCase().replace("-", "").replace(" ", "");
        if (compact.isEmpty()) return null;
        if (KNOWN.contains(compact)) return compact;
        // Accept "A1+" style — store base band only
        if (compact.endsWith("+") && compact.length() > 1) {
            String base = compact.substring(0, compact.length() - 1);
            if (KNOWN.contains(base)) return base;
        }
        return compact.length() > 8 ? compact.substring(0, 8) : compact;
    }

    public static boolean isKnown(String code) {
        return code != null && KNOWN.contains(code);
    }
}
