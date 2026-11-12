package vn.utm.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.utm.model.FlightRequest;

import java.util.List;

public interface FlightRepository extends JpaRepository<FlightRequest, Long> {
    List<FlightRequest> findAllByOrderByCreatedAtDesc();

    List<FlightRequest> findAllByCompanyIdOrderByCreatedAtDesc(Long companyId);
}
