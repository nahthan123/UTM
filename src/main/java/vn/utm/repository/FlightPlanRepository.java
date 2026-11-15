package vn.utm.repository;
import vn.utm.model.FlightPlan;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface FlightPlanRepository extends JpaRepository<FlightPlan, UUID>, JpaSpecificationExecutor<FlightPlan> {

}
