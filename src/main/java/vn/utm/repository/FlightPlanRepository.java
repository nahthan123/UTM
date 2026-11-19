package vn.utm.repository;
import vn.utm.model.FlightPlan;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface FlightPlanRepository extends JpaRepository<FlightPlan, UUID>, JpaSpecificationExecutor<FlightPlan> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FlightPlan f where f.id = :id")
    Optional<FlightPlan> findForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
