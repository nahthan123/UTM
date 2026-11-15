package vn.utm.repository;
import vn.utm.model.SystemLog;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface SystemLogRepository extends JpaRepository<SystemLog, UUID>, JpaSpecificationExecutor<SystemLog> {

}
