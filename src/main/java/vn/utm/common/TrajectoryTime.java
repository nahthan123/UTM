package vn.utm.common;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
public final class TrajectoryTime {
    private TrajectoryTime() {}
    public static String normalize(String json, ObjectMapper mapper) {
        try {
            JsonNode points = mapper.readTree(json);
            if (points == null || !points.isArray()) throw new IllegalArgumentException("Trajectory must be an array");
            for (JsonNode point : points) ((ObjectNode) point).put("time", UtcTime.parse(point.path("time").asText()).toString());
            return mapper.writeValueAsString(points);
        } catch (java.io.IOException ex) { throw new IllegalArgumentException("Invalid trajectory JSON", ex); }
    }
}
