package vn.utm.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.common.enums.*;
import vn.utm.dto.request.CompanyRequest;
import vn.utm.dto.request.FlightRequestDto;
import vn.utm.model.CompanyProfile;
import vn.utm.model.FlightRequest;
import vn.utm.repository.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class UtmService {
    private final CompanyRepository companies;
    private final FlightRepository flights;

    public UtmService(CompanyRepository companies, FlightRepository flights) {
        this.companies = companies;
        this.flights = flights;
    }

    public List<CompanyProfile> getCompanies() {
        return companies.findAll();
    }

    public List<FlightRequest> getFlights() {
        return flights.findAllByOrderByCreatedAtDesc();
    }

    public List<CompanyProfile> getCompanies(Long profileId) {
        return List.of(getCompany(profileId));
    }

    public List<FlightRequest> getFlights(Long profileId) {
        return flights.findAllByCompanyIdOrderByCreatedAtDesc(profileId);
    }

    public CompanyProfile createCompany(CompanyRequest request) {
        if (companies.existsByTaxCode(request.taxCode()))
            throw new IllegalArgumentException("Mã số thuế đã được đăng ký");
        CompanyProfile company = new CompanyProfile();
        company.setCompanyName(request.companyName());
        company.setTaxCode(request.taxCode());
        company.setRepresentative(request.representative());
        company.setEmail(request.email());
        company.setPhone(request.phone());
        company.setAddress(request.address());
        company.setLicenseNumber(request.licenseNumber());
        return companies.save(company);
    }

    public FlightRequest createFlight(FlightRequestDto request) {
        CompanyProfile company = companies.findById(request.companyId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hồ sơ doanh nghiệp"));
        FlightRequest flight = new FlightRequest();
        flight.setFlightCode("FL-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd")) + "-"
                + String.format("%04d", flights.count() + 1));
        flight.setCompany(company);
        flight.setMissionName(request.missionName());
        flight.setDepartureLocation(request.departureLocation());
        flight.setDestinationLocation(request.destinationLocation());
        flight.setDroneType(request.droneType());
        flight.setScheduledAt(request.scheduledAt());
        flight.setAltitude(request.altitude());
        flight.setEstimatedDuration(request.estimatedDuration());
        return flights.save(flight);
    }

    public FlightRequest createFlight(FlightRequestDto request, Long profileId) {
        if (!profileId.equals(request.companyId()))
            throw new AuthRequiredException("Bạn không có quyền sử dụng hồ sơ này");
        return createFlight(request);
    }

    @Transactional
    public FlightRequest sendToSimulator(Long id) {
        FlightRequest flight = getFlight(id);
        if (flight.getStatus() != FlightStatus.REGISTERED)
            throw new IllegalStateException("Chuyến bay đã được gửi trước đó");
        flight.setStatus(FlightStatus.SIMULATING);
        flight.setSentAt(LocalDateTime.now());
        return flight;
    }

    @Transactional
    public FlightRequest sendToSimulator(Long id, Long profileId) {
        requireOwnership(getFlight(id), profileId);
        return sendToSimulator(id);
    }

    public FlightRequest getFlight(Long id) {
        return flights.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy chuyến bay"));
    }

    public Map<String, Object> monitoring(Long id) {
        FlightRequest flight = getFlight(id);
        boolean active = flight.getStatus() == FlightStatus.SIMULATING;
        long elapsed = flight.getSentAt() == null ? 0
                : Duration.between(flight.getSentAt(), LocalDateTime.now()).toSeconds();
        double progress = active ? Math.min(96, 7 + elapsed * 0.8)
                : flight.getStatus() == FlightStatus.COMPLETED ? 100 : 0;
        double wave = Math.sin(elapsed / 3.0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("flightId", flight.getId());
        result.put("flightCode", flight.getFlightCode());
        result.put("status", flight.getStatus());
        result.put("progress", Math.round(progress));
        result.put("altitude",
                active ? Math.max(12, Math.round(flight.getAltitude() * Math.min(1, progress / 20.0) + wave * 2)) : 0);
        result.put("speed",
                active ? Math.round((flight.getDroneType() == DroneType.FIXED_WING ? 68 : 42) + wave * 4) : 0);
        result.put("battery", active ? Math.max(18, 100 - Math.round(progress * .55)) : 100);
        result.put("signal", active ? 94 + Math.round(wave * 3) : 100);
        result.put("updatedAt", LocalDateTime.now());
        return result;
    }

    public Map<String, Object> monitoring(Long id, Long profileId) {
        requireOwnership(getFlight(id), profileId);
        return monitoring(id);
    }

    private CompanyProfile getCompany(Long id) {
        return companies.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy hồ sơ đơn vị bay"));
    }

    private void requireOwnership(FlightRequest flight, Long profileId) {
        if (!flight.getCompany().getId().equals(profileId))
            throw new AuthRequiredException("Bạn không có quyền truy cập chuyến bay này");
    }
}
