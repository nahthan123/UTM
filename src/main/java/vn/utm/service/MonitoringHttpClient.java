package vn.utm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.utm.common.enums.IntegrationTarget;
import vn.utm.model.IntegrationDelivery;

/** Server-to-server transport. A 2xx response alone is not a delivery receipt. */
@Component
public class MonitoringHttpClient {
    private final HttpClient client = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(3)).build();
    private final ObjectMapper mapper;
    private final String url;
    private final String simulationUrl;
    private final String token;

    public MonitoringHttpClient(ObjectMapper mapper, String url, String token, String mode) {
        this(mapper, url, "", token, mode);
    }

    @Autowired
    public MonitoringHttpClient(ObjectMapper mapper,
            @Value("${utm.integration.monitoring-url:}") String url,
            @Value("${utm.integration.simulation-url:}") String simulationUrl,
            @Value("${utm.integration.monitoring-token:}") String token,
            @Value("${utm.integration.mode:mock}") String mode) {
        this.mapper = mapper;
        this.url = url.trim();
        this.simulationUrl = simulationUrl == null ? "" : simulationUrl.trim();
        this.token = token.trim();
        if (mode.trim().equalsIgnoreCase("http")) {
            validateEndpoint(this.url, "monitoring-url");
            if (this.token.length() < 16)
                throw new IllegalArgumentException("Chế độ http cần monitoring-url HTTP(S) và monitoring-token ít nhất 16 ký tự");
            if (!this.simulationUrl.isBlank()) {
                validateEndpoint(this.simulationUrl, "simulation-url");
            }
        }
    }

    private void validateEndpoint(String endpointStr, String label) {
        URI endpoint = URI.create(endpointStr);
        if (!java.util.Set.of("http", "https").contains(endpoint.getScheme()) || endpoint.getHost() == null
                || endpoint.getUserInfo() != null)
            throw new IllegalArgumentException("Chế độ http cần " + label + " HTTP(S) hợp lệ");
    }

    public boolean supportsTarget(IntegrationTarget target) {
        if (target == null || target == IntegrationTarget.MONITORING) return true;
        if (target == IntegrationTarget.SIMULATION) return !simulationUrl.isBlank();
        return false;
    }

    public String send(IntegrationDelivery delivery) throws java.io.IOException, InterruptedException {
        IntegrationTarget target = delivery.getTarget() == null ? IntegrationTarget.MONITORING : delivery.getTarget();
        String endpoint = target == IntegrationTarget.SIMULATION ? simulationUrl : url;
        if (endpoint.isBlank())
            throw new IllegalArgumentException("Chưa cấu hình URL cho đầu nhận " + target);
        var request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .header("X-UTM-Integration-Key", token)
                .POST(HttpRequest.BodyPublishers.ofString(delivery.getPayloadJson())).build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String prefix = target == IntegrationTarget.MONITORING
                    ? "Máy chủ giám sát trả HTTP "
                    : "Máy chủ " + target.name() + " trả HTTP ";
            throw new java.io.IOException(prefix + response.statusCode());
        }
        var ack = mapper.readTree(response.body());
        var sent = mapper.readTree(delivery.getPayloadJson());
        if (ack == null || !ack.path("status").asText().equals("ACCEPTED")
                || !ack.path("eventId").asText().equals(sent.path("eventId").asText()))
            throw new java.io.IOException("Phản hồi " + target.name() + " thiếu ACK đúng eventId");
        return "HTTP: " + target.name() + " đã nhận " + delivery.getEventType() + "; eventId=" + ack.path("eventId").asText();
    }
}
