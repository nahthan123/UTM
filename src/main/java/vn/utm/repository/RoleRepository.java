package vn.utm.repository;
import vn.utm.model.Role;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface RoleRepository extends JpaRepository<Role, UUID>, JpaSpecificationExecutor<Role> {
    Optional<Role> findByCode(String code);
}
