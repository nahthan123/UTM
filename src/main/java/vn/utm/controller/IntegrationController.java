package vn.utm.controller;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.utm.dto.response.IntegrationDeliveryResponse;
import vn.utm.model.UserAccount;
import vn.utm.service.*;

@RestController
@RequestMapping("/api")
@Transactional(readOnly = true)
public class IntegrationController {
    private final FlightIntegrationService integration;
    private final UtmService utm;
    private final AuthService auth;

    public IntegrationController(FlightIntegrationService integration, UtmService utm, AuthService auth) {
        this.integration = integration; this.utm = utm; this.auth = auth;
    }

    @GetMapping("/integrations")
    public List<IntegrationDeliveryResponse> list(@RequestParam(required = false) String status, HttpSession session) {
        return integration.list(status, auth.requireAccount(session)).stream().map(IntegrationDeliveryResponse::from).toList();
    }

    @GetMapping("/flights/{id}/integration")
    public List<IntegrationDeliveryResponse> forFlight(@PathVariable UUID id, HttpSession session) {
        UserAccount actor = auth.requireAccount(session);
        return integration.forFlight(utm.flight(id, actor), actor).stream().map(IntegrationDeliveryResponse::from).toList();
    }

    @GetMapping("/flights/{id}/accepted-plan")
    public JsonNode acceptedPlan(@PathVariable UUID id, HttpSession session) {
        UserAccount actor = auth.requireAccount(session);
        return integration.acceptedPlan(utm.flight(id, actor), actor);
    }

    @PostMapping("/integrations/{id}/retry")
    @Transactional
    public IntegrationDeliveryResponse retry(@PathVariable UUID id, HttpSession session) {
        return IntegrationDeliveryResponse.from(integration.retry(id, auth.requireAccount(session)));
    }
}
