package vn.utm.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.utm.domain.CompanyProfile;

public interface CompanyRepository extends JpaRepository<CompanyProfile, Long> {
    boolean existsByTaxCode(String taxCode);
}
