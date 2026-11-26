package vn.utm.repository;

import java.util.*;
import org.springframework.data.jpa.repository.*;
import vn.utm.model.Geozone;

public interface GeozoneRepository extends JpaRepository<Geozone, UUID>, JpaSpecificationExecutor<Geozone> {
    Optional<Geozone> findByCodeIgnoreCase(String code);
}
