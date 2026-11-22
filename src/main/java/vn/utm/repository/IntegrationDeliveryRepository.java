package vn.utm.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.utm.common.enums.*;
import vn.utm.model.IntegrationDelivery;

public interface IntegrationDeliveryRepository extends JpaRepository<IntegrationDelivery, UUID> {
    Optional<IntegrationDelivery> findByFlightIdAndTargetAndEventTypeAndFlightStatus(
            UUID flightId, IntegrationTarget target, String eventType, FlightStatus flightStatus);
    List<IntegrationDelivery> findTop100ByOrderByCreatedAtDesc();
    List<IntegrationDelivery> findTop100ByStatusOrderByCreatedAtDesc(DeliveryStatus status);
    List<IntegrationDelivery> findTop100ByFlightIdOrderByCreatedAtDesc(UUID flightId);
    List<IntegrationDelivery> findTop20ByTargetAndStatusInAndAttemptsLessThanOrderByCreatedAtAsc(
            IntegrationTarget target, Collection<DeliveryStatus> statuses, int attempts);

    @Query("select delivery.flight.id from IntegrationDelivery delivery where delivery.id = :id")
    Optional<UUID> findFlightIdById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select delivery from IntegrationDelivery delivery where delivery.id = :id")
    Optional<IntegrationDelivery> findLockedById(@Param("id") UUID id);
}
