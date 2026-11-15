package vn.utm.repository;
import vn.utm.model.Drone;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface DroneRepository extends JpaRepository<Drone, UUID>, JpaSpecificationExecutor<Drone> {
    Optional<Drone> findBySerialNumber(String serialNumber);
}
