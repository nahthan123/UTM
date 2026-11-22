package vn.utm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.utm.common.enums.*;
import vn.utm.model.*;
import vn.utm.repository.*;
import vn.utm.service.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MonitoringDeliveryTests {
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test void realHttpTransportRequiresMatchingAckAndSendsServiceKey() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        String eventId = UUID.randomUUID().toString();
        var delivery = new IntegrationDelivery();
        delivery.setEventType("flightplan.accepted");
        delivery.setPayloadJson(mapper.writeValueAsString(Map.of("eventId", eventId)));
        var received = new java.util.concurrent.atomic.AtomicReference<String>();
        var header = new java.util.concurrent.atomic.AtomicReference<String>();
        var ackId = new java.util.concurrent.atomic.AtomicReference<>(eventId);
        server.createContext("/plans", exchange -> {
            header.set(exchange.getRequestHeaders().getFirst("X-UTM-Integration-Key"));
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = mapper.writeValueAsBytes(Map.of("status", "ACCEPTED", "eventId", ackId.get()));
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        try {
            var client = new MonitoringHttpClient(mapper, "http://127.0.0.1:" + server.getAddress().getPort() + "/plans",
                    "integration-test-token", "http");
            assertTrue(client.send(delivery).contains(eventId));
            assertEquals("integration-test-token", header.get());
            assertEquals(delivery.getPayloadJson(), received.get());
            ackId.set(UUID.randomUUID().toString());
            assertThrows(java.io.IOException.class, () -> client.send(delivery));
        } finally { server.stop(0); }
    }

    @Test void workerRecordsSuccessFailureAndSupersedesCancelledApproval() throws Exception {
        var deliveries = mock(IntegrationDeliveryRepository.class);
        var flights = mock(FlightPlanRepository.class);
        var client = mock(MonitoringHttpClient.class);
        var service = new FlightIntegrationService(deliveries, flights, mock(SystemLogRepository.class),
                mock(AuthService.class), mapper, "http", client);
        UUID id = UUID.randomUUID(), flightId = UUID.randomUUID();
        var flight = new FlightPlan(); flight.setStatus(FlightStatus.APPROVED);
        var delivery = new IntegrationDelivery();
        delivery.setFlight(flight); delivery.setFlightStatus(FlightStatus.APPROVED);
        delivery.setTarget(IntegrationTarget.MONITORING); delivery.setEventType("flightplan.accepted");
        when(deliveries.findFlightIdById(id)).thenReturn(Optional.of(flightId));
        when(deliveries.findLockedById(id)).thenReturn(Optional.of(delivery));
        when(flights.findForUpdate(flightId)).thenReturn(Optional.of(flight));
        when(client.send(delivery)).thenThrow(new java.io.IOException("connection refused"));
        service.deliverMonitoring(id);
        assertEquals(DeliveryStatus.FAILED, delivery.getStatus());
        assertEquals(1, delivery.getAttempts()); assertNull(delivery.getDeliveredAt());
        doReturn("ACK").when(client).send(delivery);
        service.deliverMonitoring(id);
        assertEquals(DeliveryStatus.DELIVERED, delivery.getStatus());
        assertEquals(2, delivery.getAttempts()); assertNotNull(delivery.getDeliveredAt());
        assertNull(delivery.getLastError());
        service.deliverMonitoring(id);
        verify(client, times(2)).send(delivery);

        delivery.setStatus(DeliveryStatus.PENDING); flight.setStatus(FlightStatus.CANCELLED);
        service.deliverMonitoring(id);
        assertEquals(DeliveryStatus.SUPERSEDED, delivery.getStatus());
        verifyNoMoreInteractions(client);
    }

    @Test void httpConfigurationRejectsMissingCredentials() {
        assertThrows(IllegalArgumentException.class,
                () -> new MonitoringHttpClient(mapper, "http://localhost:8000/plans", "", "http"));
    }
}
