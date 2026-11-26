package vn.utm.service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

/** Thread-safe in-memory store for outbound monitoring updates & tactical decisions from Khối 4 (:3000). */
@Service
public class MonitoringFeedbackService {
    private static final int MAX_HISTORY = 50;
    private final ConcurrentHashMap<String, Map<String, Object>> latestProgressByKey = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<Map<String, Object>> recentDecisions = new ConcurrentLinkedDeque<>();
    private final AtomicLong progressCount = new AtomicLong(0);
    private final AtomicLong decisionCount = new AtomicLong(0);

    public Map<String, Object> recordProgress(Map<String, Object> payload) {
        String receivedAt = Instant.now().toString();
        Map<String, Object> entry = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        entry.put("receivedAtUtc", receivedAt);

        String droneId = String.valueOf(entry.getOrDefault("droneId", "unknown"));
        String flightId = String.valueOf(entry.getOrDefault("flightId", "UNLINKED"));
        latestProgressByKey.put(flightId + ":" + droneId, entry);
        long total = progressCount.incrementAndGet();

        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("status", "ACCEPTED");
        ack.put("eventType", "monitoring.progress");
        ack.put("receivedAt", receivedAt);
        ack.put("totalProgressReceived", total);
        return ack;
    }

    public Map<String, Object> recordDecision(Map<String, Object> payload) {
        String receivedAt = Instant.now().toString();
        Map<String, Object> entry = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        entry.put("receivedAtUtc", receivedAt);

        recentDecisions.addFirst(entry);
        while (recentDecisions.size() > MAX_HISTORY) {
            recentDecisions.pollLast();
        }
        long total = decisionCount.incrementAndGet();

        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("status", "ACCEPTED");
        ack.put("eventType", "monitoring.decision");
        ack.put("receivedAt", receivedAt);
        ack.put("totalDecisionsReceived", total);
        return ack;
    }

    public Map<String, Object> snapshot() {
        return snapshot(null, null, "ALL_SYSTEM");
    }

    public Map<String, Object> snapshot(Set<String> allowedUavIds, Set<String> allowedFlightIds, String scopeLabel) {
        boolean filter = allowedUavIds != null || allowedFlightIds != null;
        Set<String> safeUavs = allowedUavIds == null ? Set.of() : allowedUavIds;
        Set<String> safeFlights = allowedFlightIds == null ? Set.of() : allowedFlightIds;

        List<Map<String, Object>> activeUavs = new ArrayList<>();
        for (Map<String, Object> item : latestProgressByKey.values()) {
            if (!filter || matchesScope(item, safeUavs, safeFlights)) {
                activeUavs.add(item);
            }
        }
        activeUavs.sort((a, b) -> String.valueOf(b.getOrDefault("receivedAtUtc", ""))
                .compareTo(String.valueOf(a.getOrDefault("receivedAtUtc", ""))));

        List<Map<String, Object>> decisions = new ArrayList<>();
        for (Map<String, Object> dec : recentDecisions) {
            if (!filter || matchesScope(dec, safeUavs, safeFlights)) {
                decisions.add(dec);
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("scope", scopeLabel);
        res.put("activeUavs", activeUavs);
        res.put("recentDecisions", decisions);
        res.put("totalProgressReceived", progressCount.get());
        res.put("totalDecisionsReceived", decisionCount.get());
        res.put("serverTimeUtc", Instant.now().toString());
        return res;
    }

    private boolean matchesScope(Map<String, Object> entry, Set<String> allowedUavIds, Set<String> allowedFlightIds) {
        String droneId = String.valueOf(entry.getOrDefault("droneId", ""));
        String callsign = String.valueOf(entry.getOrDefault("callsign", ""));
        String flightId = String.valueOf(entry.getOrDefault("flightId", ""));
        return allowedUavIds.contains(droneId)
                || (!callsign.isBlank() && allowedUavIds.contains(callsign))
                || (!flightId.isBlank() && allowedFlightIds.contains(flightId));
    }
}
