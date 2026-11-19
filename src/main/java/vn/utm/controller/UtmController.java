package vn.utm.controller;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.utm.dto.request.*;
import vn.utm.dto.response.*;
import vn.utm.model.*;
import vn.utm.service.*;
import java.util.*;

@RestController
@RequestMapping("/api")
public class UtmController {
    private final UtmService service;
    private final QueryService queries;
    private final AuthService auth;

    public UtmController(UtmService service, QueryService queries, AuthService auth) {
        this.service = service; this.queries = queries; this.auth = auth;
    }

    @GetMapping("/users")
    public PageResponse<UserAccountResponse> users(@RequestParam Map<String, String> params, HttpSession session) {
        return queries.users(params, auth.requireAccount(session)).map(UserAccountResponse::from);
    }

    @GetMapping("/users/{id}")
    public UserAccountResponse user(@PathVariable UUID id, HttpSession session) {
        return UserAccountResponse.from(service.user(id, auth.requireAccount(session)));
    }

    @GetMapping("/roles")
    public PageResponse<RoleResponse> roles(@RequestParam Map<String, String> params, HttpSession session) {
        auth.requireAccount(session);
        return queries.roles(params).map(RoleResponse::from);
    }

    @GetMapping("/roles/{id}")
    public RoleResponse role(@PathVariable UUID id, HttpSession session) {
        auth.requireAccount(session);
        return RoleResponse.from(service.role(id));
    }

    @GetMapping("/drones")
    public PageResponse<DroneResponse> drones(@RequestParam Map<String, String> params, HttpSession session) {
        return queries.drones(params, null, null, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/drones/{id}")
    public DroneResponse drone(@PathVariable UUID id, HttpSession session) {
        return DroneResponse.from(service.drone(id, auth.requireAccount(session)));
    }

    @GetMapping("/drones/owner/{ownerId}")
    public PageResponse<DroneResponse> ownerDrones(@PathVariable UUID ownerId, @RequestParam Map<String, String> params, HttpSession session) {
        return queries.drones(params, ownerId, null, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/drones/search")
    public PageResponse<DroneResponse> searchDrone(@RequestParam String serialNumber, @RequestParam Map<String, String> params, HttpSession session) {
        return queries.drones(params, null, serialNumber, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/flights")
    public PageResponse<FlightPlanResponse> flights(@RequestParam Map<String, String> params, HttpSession session) {
        return queries.flights(params, null, false, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/flights/{id}")
    public FlightPlanResponse flight(@PathVariable UUID id, HttpSession session) {
        return FlightPlanResponse.from(service.flight(id, auth.requireAccount(session)));
    }

    @GetMapping("/flights/operator/{operatorId}")
    public PageResponse<FlightPlanResponse> operatorFlights(@PathVariable UUID operatorId, @RequestParam Map<String, String> params, HttpSession session) {
        return queries.flights(params, operatorId, false, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/flights/active-or-approved")
    public PageResponse<FlightPlanResponse> activeFlights(@RequestParam Map<String, String> params, HttpSession session) {
        return queries.flights(params, null, true, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/logs")
    public PageResponse<SystemLogResponse> logs(@RequestParam Map<String, String> params, HttpSession session) {
        return queries.logs(params, null, null, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping("/logs/{id}")
    public SystemLogResponse log(@PathVariable UUID id, HttpSession session) {
        return SystemLogResponse.from(service.log(id, auth.requireAccount(session)));
    }

    @GetMapping("/logs/user/{userId}")
    public PageResponse<SystemLogResponse> userLogs(@PathVariable UUID userId, @RequestParam Map<String, String> params, HttpSession session) {
        return queries.logs(params, userId, null, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping("/logs/action")
    public PageResponse<SystemLogResponse> actionLogs(@RequestParam String type, @RequestParam Map<String, String> params, HttpSession session) {
        return queries.logs(params, null, type, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserAccountResponse createUser(@Valid @RequestBody UserRequest request, HttpSession session) {
        return UserAccountResponse.from(service.saveUser(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}")
    public UserAccountResponse updateUser(@PathVariable UUID id, @Valid @RequestBody UserRequest request, HttpSession session) {
        return UserAccountResponse.from(service.saveUser(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}/lock")
    public UserAccountResponse lock(@PathVariable UUID id, HttpSession session) {
        return UserAccountResponse.from(service.lock(id, true, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}/unlock")
    public UserAccountResponse unlock(@PathVariable UUID id, HttpSession session) {
        return UserAccountResponse.from(service.lock(id, false, auth.requireAccount(session)));
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse createRole(@Valid @RequestBody RoleRequest request, HttpSession session) {
        return RoleResponse.from(service.saveRole(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/roles/{id}")
    public RoleResponse updateRole(@PathVariable UUID id, @Valid @RequestBody RoleRequest request, HttpSession session) {
        return RoleResponse.from(service.saveRole(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/roles/{id}/restore")
    public RoleResponse restoreRole(@PathVariable UUID id, HttpSession session) {
        return RoleResponse.from(service.changeRole(id, true, auth.requireAccount(session)));
    }

    @PostMapping("/drones")
    @ResponseStatus(HttpStatus.CREATED)
    public DroneResponse createDrone(@Valid @RequestBody DroneRequest request, HttpSession session) {
        return DroneResponse.from(service.saveDrone(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/drones/{id}")
    public DroneResponse updateDrone(@PathVariable UUID id, @Valid @RequestBody DroneRequest request, HttpSession session) {
        return DroneResponse.from(service.saveDrone(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/drones/{id}/restore")
    public DroneResponse restoreDrone(@PathVariable UUID id, HttpSession session) {
        return DroneResponse.from(service.changeDrone(id, true, auth.requireAccount(session)));
    }

    @PostMapping("/flights")
    @ResponseStatus(HttpStatus.CREATED)
    public FlightPlanResponse createFlight(@Valid @RequestBody FlightRequestDto request, HttpSession session) {
        return FlightPlanResponse.from(service.createFlight(request, auth.requireAccount(session)));
    }

    @PutMapping("/flights/{id}/status")
    public FlightPlanResponse flightStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest request, HttpSession session) {
        return FlightPlanResponse.from(service.status(id, request.status(), request.reviewNote(), auth.requireAccount(session)));
    }

    @PostMapping("/flights/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<FlightPlanResponse> createFlightBatch(@Valid @RequestBody BatchFlightRequest request, HttpSession session) {
        return service.createFlightBatch(request, auth.requireAccount(session)).stream().map(FlightPlanResponse::from).toList();
    }

    @PutMapping("/flights/{id}/cancel")
    public FlightPlanResponse cancel(@PathVariable UUID id, HttpSession session) {
        return FlightPlanResponse.from(service.cancel(id, auth.requireAccount(session)));
    }

    @PutMapping("/flights/{id}/restore")
    public FlightPlanResponse restoreFlight(@PathVariable UUID id, HttpSession session) {
        return FlightPlanResponse.from(service.restoreFlight(id, auth.requireAccount(session)));
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable UUID id, HttpSession session) {
        service.deleteUser(id, auth.requireAccount(session));
    }

    @DeleteMapping("/roles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable UUID id, HttpSession session) {
        service.changeRole(id, false, auth.requireAccount(session));
    }

    @DeleteMapping("/drones/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDrone(@PathVariable UUID id, HttpSession session) {
        service.changeDrone(id, false, auth.requireAccount(session));
    }

    @DeleteMapping("/logs/clear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearLogs(HttpSession session) {
        service.clearLogs(auth.requireAccount(session));
    }
}
