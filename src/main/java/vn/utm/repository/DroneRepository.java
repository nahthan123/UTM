package vn.utm.repository;
import vn.utm.model.Drone;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface DroneRepository extends JpaRepository<Drone, UUID>, JpaSpecificationExecutor<Drone> {
    Optional<Drone> findBySerialNumber(String serialNumber);
    List<Drone> findByOwnerId(UUID ownerId);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Drone d where d.id = :id")
    Optional<Drone> findForScheduling(@org.springframework.data.repository.query.Param("id") UUID id);
}
