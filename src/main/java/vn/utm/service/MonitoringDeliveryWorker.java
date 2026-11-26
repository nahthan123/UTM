package vn.utm.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import vn.utm.common.enums.*;
import vn.utm.repository.IntegrationDeliveryRepository;
import java.util.List;

/** Reads only committed outbox rows; a receiver outage never rolls back an approval. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "utm.integration.mode", havingValue = "http")
public class MonitoringDeliveryWorker {
    static final int MAX_ATTEMPTS = 5;
    private final IntegrationDeliveryRepository deliveries;
    private final FlightIntegrationService integration;

    public MonitoringDeliveryWorker(IntegrationDeliveryRepository deliveries, FlightIntegrationService integration) {
        this.deliveries = deliveries; this.integration = integration;
    }

    @Scheduled(initialDelayString = "${utm.integration.poll-ms:3000}", fixedDelayString = "${utm.integration.poll-ms:3000}")
    public void deliver() {
        for (IntegrationTarget target : List.of(IntegrationTarget.MONITORING, IntegrationTarget.SIMULATION)) {
            for (var delivery : deliveries.findTop20ByTargetAndStatusInAndAttemptsLessThanOrderByCreatedAtAsc(
                    target, List.of(DeliveryStatus.PENDING, DeliveryStatus.FAILED), MAX_ATTEMPTS)) {
                integration.deliverMonitoring(delivery.getId());
            }
        }
    }
}
