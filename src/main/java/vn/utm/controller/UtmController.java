package vn.utm.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.utm.dto.request.FlightRequestDto;
import vn.utm.model.CompanyProfile;
import vn.utm.model.FlightRequest;
import vn.utm.service.UtmService;
import vn.utm.service.AuthService;

import java.util.*;

@RestController
@RequestMapping("/api")
public class UtmController {
    private final UtmService service;
    private final AuthService auth;

    public UtmController(UtmService service, AuthService auth) {
        this.service = service;
        this.auth = auth;
    }

    @GetMapping("/companies")
    public List<CompanyProfile> companies(jakarta.servlet.http.HttpSession session) {
        return service.getCompanies(auth.requireAccount(session).getOperatorProfile().getId());
    }

    @GetMapping("/flights")
    public List<FlightRequest> flights(jakarta.servlet.http.HttpSession session) {
        return service.getFlights(auth.requireAccount(session).getOperatorProfile().getId());
    }

    @PostMapping("/flights")
    @ResponseStatus(HttpStatus.CREATED)
    public FlightRequest createFlight(@Valid @RequestBody FlightRequestDto request,
            jakarta.servlet.http.HttpSession session) {
        return service.createFlight(request, auth.requireAccount(session).getOperatorProfile().getId());
    }

    @PostMapping("/flights/{id}/send")
    public FlightRequest send(@PathVariable Long id, jakarta.servlet.http.HttpSession session) {
        return service.sendToSimulator(id, auth.requireAccount(session).getOperatorProfile().getId());
    }

    @GetMapping("/flights/{id}/monitoring")
    public Map<String, Object> monitoring(@PathVariable Long id, jakarta.servlet.http.HttpSession session) {
        return service.monitoring(id, auth.requireAccount(session).getOperatorProfile().getId());
    }
}
