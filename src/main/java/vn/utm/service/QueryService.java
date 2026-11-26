package vn.utm.service;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.common.enums.FlightStatus;
import vn.utm.dto.response.PageResponse;
import vn.utm.model.*;
import vn.utm.repository.*;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class QueryService {
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final DroneRepository drones;
    private final FlightPlanRepository flights;
    private final SystemLogRepository logs;
    private final AuthService auth;

    public QueryService(UserAccountRepository users, RoleRepository roles, DroneRepository drones,
                        FlightPlanRepository flights, SystemLogRepository logs, AuthService auth) {
        this.users = users; this.roles = roles; this.drones = drones;
        this.flights = flights; this.logs = logs; this.auth = auth;
    }

    private Pageable pageable(Map<String, String> params, Set<String> allowedSorts) {
        int page = Integer.parseInt(params.getOrDefault("page", "0"));
        int size = Integer.parseInt(params.getOrDefault("size", "10"));
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("page >= 0, size từ 1 đến 100");
        String[] sort = params.getOrDefault("sort", "created_at,desc").split(",", -1);
        String field = switch (sort[0]) {
            case "created_at" -> "createdAt";
            case "updated_at" -> "updatedAt";
            case "serial_number" -> "serialNumber";
            case "full_name" -> "fullName";
            case "start_time" -> "startTime";
            default -> sort[0];
        };
        if (!allowedSorts.contains(field) || sort.length > 2) throw new IllegalArgumentException("Trường sắp xếp không hợp lệ");
        Sort.Direction direction = sort.length == 2 ? Sort.Direction.fromString(sort[1]) : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by("id")));
    }

    private boolean booleanParam(Map<String, String> params, String name) {
        String value = params.get(name);
        if (!Set.of("true", "false").contains(value)) throw new IllegalArgumentException(name + " phải là true/false");
        return Boolean.parseBoolean(value);
    }

    private <T extends BaseEntity> Specification<T> active(Map<String, String> params) {
        boolean enabled = !params.containsKey("isActive") || booleanParam(params, "isActive");
        return (root, query, cb) -> enabled
                ? cb.and(cb.isTrue(root.get("active")), cb.isNull(root.get("deletedAt")))
                : cb.isFalse(root.get("active"));
    }

    public PageResponse<UserAccount> users(Map<String, String> params, UserAccount actor) {
        auth.requireStaff(actor);
        Specification<UserAccount> spec = active(params);
        if (params.containsKey("keyword")) {
            String keyword = "%" + params.get("keyword").toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(cb.like(cb.lower(root.get("username")), keyword),
                    cb.like(cb.lower(root.get("fullName")), keyword), cb.like(cb.lower(root.get("email")), keyword)));
        }
        if (params.containsKey("isLocked")) {
            boolean locked = booleanParam(params, "isLocked");
            spec = spec.and((root, query, cb) -> cb.equal(root.get("locked"), locked));
        }
        return PageResponse.from(users.findAll(spec, pageable(params, Set.of("createdAt", "updatedAt", "username", "fullName", "email"))));
    }

    public PageResponse<Role> roles(Map<String, String> params) {
        return PageResponse.from(roles.findAll(active(params), pageable(params, Set.of("createdAt", "updatedAt", "code", "name"))));
    }

    public PageResponse<Drone> drones(Map<String, String> params, UUID ownerId, String serialNumber, UserAccount actor) {
        Specification<Drone> spec = active(params);
        if (!auth.isStaff(actor)) spec = spec.and((root, query, cb) -> cb.equal(root.get("owner").get("id"), actor.getId()));
        if (ownerId != null) {
            auth.requireOwner(ownerId, actor);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId));
        }
        if (serialNumber != null) {
            String keyword = "%" + serialNumber.toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("serialNumber")), keyword));
        }
        return PageResponse.from(drones.findAll(spec, pageable(params, Set.of("createdAt", "updatedAt", "serialNumber", "model"))));
    }

    public PageResponse<FlightPlan> flights(Map<String, String> params, UUID operatorId, boolean approvedOrActive, UserAccount actor) {
        Specification<FlightPlan> spec = active(params);
        if (!auth.isStaff(actor)) spec = spec.and((root, query, cb) -> cb.equal(root.get("operator").get("id"), actor.getId()));
        if (operatorId != null) {
            auth.requireOwner(operatorId, actor);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("operator").get("id"), operatorId));
        }
        if (approvedOrActive) spec = spec.and((root, query, cb) -> root.get("status").in(FlightStatus.APPROVED, FlightStatus.ACTIVE));
        if (params.containsKey("status")) {
            FlightStatus status = FlightStatus.valueOf(params.get("status"));
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        return PageResponse.from(flights.findAll(spec, pageable(params, Set.of("createdAt", "updatedAt", "startTime", "status"))));
    }

    public PageResponse<SystemLog> logs(Map<String, String> params, UUID userId, String actionType, UserAccount actor) {
        auth.requireStaff(actor);
        Specification<SystemLog> spec = active(params);
        if (userId != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), userId));
        if (actionType != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("actionType"), actionType));
        return PageResponse.from(logs.findAll(spec, pageable(params, Set.of("createdAt", "updatedAt", "actionType"))));
    }

    public PageResponse<SystemLog> myLogs(Map<String, String> params, UserAccount actor) {
        Specification<SystemLog> spec = active(params);
        spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), actor.getId()));
        String actionType = params.get("type");
        if (actionType != null && !actionType.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("actionType"), actionType.trim()));
        }
        return PageResponse.from(logs.findAll(spec, pageable(params, Set.of("createdAt", "updatedAt", "actionType"))));
    }

    public String exportFlightsCsv(UserAccount actor) {
        Specification<FlightPlan> spec = (root, query, cb) -> cb.and(cb.isTrue(root.get("active")), cb.isNull(root.get("deletedAt")));
        if (!auth.isStaff(actor)) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("operator").get("id"), actor.getId()));
        }
        List<FlightPlan> rows = flights.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")));
        StringBuilder sb = new StringBuilder("\uFEFF");
        sb.append("flight_id,serial_number,operator,departure,destination,start_time_utc,end_time_utc,altitude_ref,status,review_note\n");
        for (FlightPlan f : rows) {
            sb.append(csvCell(f.getId())).append(',')
              .append(csvCell(f.getDrone().getSerialNumber())).append(',')
              .append(csvCell(f.getOperator().displayName())).append(',')
              .append(csvCell(f.getDepartureName())).append(',')
              .append(csvCell(f.getDestinationName())).append(',')
              .append(csvCell(f.getStartTime())).append(',')
              .append(csvCell(f.getEndTime())).append(',')
              .append(csvCell(f.getAltitudeReference())).append(',')
              .append(csvCell(f.getStatus())).append(',')
              .append(csvCell(f.getReviewNote())).append('\n');
        }
        return sb.toString();
    }

    private String csvCell(Object val) {
        if (val == null) return "";
        String s = String.valueOf(val);
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return '"' + s.replace("\"", "\"\"") + '"';
        }
        return s;
    }
}
