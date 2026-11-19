package vn.utm.service;

import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.common.enums.FlightStatus;
import vn.utm.dto.request.*;
import vn.utm.model.*;
import vn.utm.repository.*;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@Transactional
public class UtmService {
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final DroneRepository drones;
    private final FlightPlanRepository flights;
    private final SystemLogRepository logs;
    private final AuthService auth;
    private final ObjectMapper mapper;
    private final FlightIntegrationService integration;

    public UtmService(UserAccountRepository users, RoleRepository roles, DroneRepository drones,
                      FlightPlanRepository flights, SystemLogRepository logs, AuthService auth, ObjectMapper mapper,
                      FlightIntegrationService integration) {
        this.users = users; this.roles = roles; this.drones = drones;
        this.flights = flights; this.logs = logs; this.auth = auth; this.mapper = mapper;
        this.integration = integration;
    }

    private <T extends BaseEntity> T live(T entity) {
        if (!entity.isActive() || entity.getDeletedAt() != null)
            throw new NoSuchElementException("Bản ghi không còn hoạt động");
        return entity;
    }

    public UserAccount user(UUID id, UserAccount actor) {
        auth.requireOwner(id, actor);
        return users.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));
    }

    public Role role(UUID id) {
        return roles.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy vai trò"));
    }

    public Drone drone(UUID id, UserAccount actor) {
        Drone drone = drones.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy drone"));
        auth.requireOwner(drone.getOwner().getId(), actor);
        return drone;
    }

    public FlightPlan flight(UUID id, UserAccount actor) {
        FlightPlan flight = flights.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy kế hoạch bay"));
        auth.requireOwner(flight.getOperator().getId(), actor);
        return flight;
    }

    private FlightPlan editableFlight(UUID id, UserAccount actor) {
        FlightPlan flight = flights.findForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy kế hoạch bay"));
        auth.requireOwner(flight.getOperator().getId(), actor);
        return live(flight);
    }

    private void log(UserAccount actor, String action, String details) {
        SystemLog log = new SystemLog();
        log.setUser(actor); log.setActionType(action); log.setDetails(details); log.recordActor(actor.getId());
        logs.save(log);
    }

    public UserAccount saveUser(UUID id, UserRequest request, UserAccount actor) {
        auth.requireAdmin(actor);
        UserAccount user = id == null ? new UserAccount() : live(user(id, actor));
        if (users.findByUsernameIgnoreCase(request.username()).filter(u -> !u.getId().equals(id)).isPresent()
                || users.findByEmailIgnoreCase(request.email().trim()).filter(u -> !u.getId().equals(id)).isPresent())
            throw new IllegalArgumentException("Tên đăng nhập hoặc email đã được sử dụng");
        Role role = live(role(request.roleId()));
        if (actor.getId().equals(id) && !role.getCode().equals("ADMIN"))
            throw new IllegalArgumentException("Không tự hạ quyền quản trị");
        user.setRole(role); user.setUsername(request.username()); user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase(Locale.ROOT)); user.setPhone(request.phone().trim());
        user.setAvatarUrl(request.avatarUrl());
        if (request.password() != null) user.setPasswordHash(auth.hash(request.password()));
        if (user.getPasswordHash() == null) throw new IllegalArgumentException("Mật khẩu là bắt buộc khi tạo người dùng");
        user.recordActor(actor.getId()); users.save(user); log(actor, "USER_SAVE", user.getUsername());
        return user;
    }

    public void deleteUser(UUID id, UserAccount actor) {
        auth.requireAdmin(actor);
        if (actor.getId().equals(id)) throw new IllegalArgumentException("Không tự xóa tài khoản");
        live(user(id, actor)).softDelete(actor.getId()); log(actor, "USER_DELETE", id.toString());
    }

    public UserAccount lock(UUID id, boolean locked, UserAccount actor) {
        auth.requireAdmin(actor);
        if (actor.getId().equals(id)) throw new IllegalArgumentException("Không tự khóa tài khoản");
        UserAccount user = live(user(id, actor));
        user.setLocked(locked);
        if (!locked) user.setLoginFailCount(0);
        user.recordActor(actor.getId()); log(actor, locked ? "USER_LOCK" : "USER_UNLOCK", id.toString());
        return user;
    }

    public Role saveRole(UUID id, RoleRequest request, UserAccount actor) {
        auth.requireAdmin(actor);
        Role role = id == null ? new Role() : live(role(id));
        if (role.isSystem() && !role.getCode().equals(request.code()))
            throw new IllegalArgumentException("Không đổi mã vai trò hệ thống");
        if (roles.findByCode(request.code()).filter(r -> !r.getId().equals(id)).isPresent())
            throw new IllegalArgumentException("Mã vai trò đã tồn tại");
        role.setCode(request.code()); role.setName(request.name().trim()); role.setDescription(request.description());
        role.recordActor(actor.getId()); roles.save(role); log(actor, "ROLE_SAVE", role.getCode());
        return role;
    }

    public Role changeRole(UUID id, boolean restore, UserAccount actor) {
        auth.requireAdmin(actor);
        Role role = role(id);
        if (!restore && role.isSystem()) throw new IllegalArgumentException("Không xóa vai trò hệ thống");
        if (restore) role.restore(actor.getId()); else role.softDelete(actor.getId());
        log(actor, restore ? "ROLE_RESTORE" : "ROLE_DELETE", id.toString());
        return role;
    }

    public Drone saveDrone(UUID id, DroneRequest request, UserAccount actor) {
        if (id == null) auth.requireOperator(actor);
        Drone drone = id == null ? new Drone() : live(drone(id, actor));
        UUID ownerId = request.ownerId() != null ? request.ownerId()
                : id == null ? actor.getId() : drone.getOwner().getId();
        auth.requireOwner(ownerId, actor);
        UserAccount owner = live(user(ownerId, actor));
        if (owner.isLocked()) throw new IllegalArgumentException("Chủ sở hữu đang bị khóa");
        if (drones.findBySerialNumber(request.serialNumber().trim()).filter(d -> !d.getId().equals(id)).isPresent())
            throw new IllegalArgumentException("Số sê-ri đã tồn tại");
        if (id != null && !drone.getOwner().getId().equals(ownerId) && hasOpenFlight(id))
            throw new IllegalArgumentException("Drone còn kế hoạch bay chưa kết thúc");
        if (!Double.isFinite(request.maxSpeed())) throw new IllegalArgumentException("Tốc độ không hợp lệ");
        drone.setOwner(owner); drone.setSerialNumber(request.serialNumber().trim()); drone.setModel(request.model().trim());
        // Legacy clients may omit type; do not guess or erase an existing classification.
        if (request.droneType() != null) drone.setDroneType(request.droneType());
        drone.setMaxFlightTime(request.maxFlightTime()); drone.setMaxSpeed(request.maxSpeed());
        drone.recordActor(actor.getId()); drones.save(drone); log(actor, "DRONE_SAVE", drone.getSerialNumber());
        return drone;
    }

    private boolean hasOpenFlight(UUID droneId) {
        return flights.exists((root, query, cb) -> cb.and(cb.equal(root.get("drone").get("id"), droneId),
                cb.isNull(root.get("deletedAt")), root.get("status").in(FlightStatus.PENDING, FlightStatus.APPROVED, FlightStatus.ACTIVE)));
    }

    public Drone changeDrone(UUID id, boolean restore, UserAccount actor) {
        Drone drone = drone(id, actor);
        if (restore) { live(drone.getOwner()); drone.restore(actor.getId()); }
        else {
            live(drone);
            if (hasOpenFlight(id)) throw new IllegalArgumentException("Drone còn kế hoạch bay chưa kết thúc");
            drone.softDelete(actor.getId());
        }
        log(actor, restore ? "DRONE_RESTORE" : "DRONE_DELETE", id.toString());
        return drone;
    }

    public FlightPlan createFlight(FlightRequestDto request, UserAccount actor) {
        auth.requireOperator(actor);
        validateTrajectory(request);
        return saveFlight(request, actor, UUID.randomUUID(), 1);
    }

    public List<FlightPlan> createFlightBatch(BatchFlightRequest request, UserAccount actor) {
        auth.requireOperator(actor);
        if (new HashSet<>(request.droneIds()).size() != request.droneIds().size())
            throw new IllegalArgumentException("Danh sách UAV bị trùng");
        UUID submissionId = UUID.randomUUID();
        // Lock in a fixed order, so overlapping submissions cannot deadlock each other.
        List<UUID> ids = request.droneIds().stream().sorted().toList();
        List<FlightPlan> result = new ArrayList<>();
        FlightRequestDto common = new FlightRequestDto(ids.getFirst(), request.startTime(), request.endTime(),
                request.trajectoryJson(), request.departureName(), request.destinationName());
        validateTrajectory(common);
        for (UUID id : ids) {
            result.add(saveFlight(new FlightRequestDto(id, request.startTime(), request.endTime(),
                    request.trajectoryJson(), request.departureName(), request.destinationName()),
                    actor, submissionId, ids.size()));
        }
        return result;
    }

    private FlightPlan saveFlight(FlightRequestDto request, UserAccount actor, UUID submissionId, int uavCount) {
        Drone drone = live(drones.findForScheduling(request.droneId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy drone")));
        // A submitted plan always belongs to the authenticated operator, never a client-supplied ID.
        if (!drone.getOwner().getId().equals(actor.getId())) auth.deny();
        if (!request.endTime().isAfter(request.startTime())) throw new IllegalArgumentException("Hạ cánh phải sau cất cánh");
        if (Duration.between(request.startTime(), request.endTime()).compareTo(Duration.ofMinutes(drone.getMaxFlightTime())) > 0)
            throw new IllegalArgumentException("Thời lượng vượt khả năng bay của drone");
        if (drone.getDroneType() == null) throw new IllegalArgumentException("Vui lòng khai báo loại UAV trước khi nộp kế hoạch");
        if (!request.startTime().isAfter(Instant.now())) throw new IllegalArgumentException("Cất cánh phải ở tương lai");
        if (hasOverlappingFlight(drone.getId(), request.startTime(), request.endTime()))
            throw new IllegalArgumentException("UAV " + drone.getSerialNumber() + " đã có kế hoạch trùng thời gian");
        FlightPlan flight = new FlightPlan();
        flight.setDrone(drone); flight.setOperator(actor); flight.setStartTime(request.startTime());
        flight.setSubmissionId(submissionId); flight.setUavCount(uavCount);
        flight.setDepartureName(trimToNull(request.departureName()));
        flight.setDestinationName(trimToNull(request.destinationName()));
        flight.setAltitudeReference("AGL");
        flight.setEndTime(request.endTime()); flight.setTrajectoryJson(vn.utm.common.TrajectoryTime.normalize(request.trajectoryJson(), mapper));
        flight.recordActor(actor.getId()); flights.save(flight); log(actor, "FLIGHT_SUBMIT", flight.getId().toString());
        return flight;
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private boolean hasOverlappingFlight(UUID droneId, Instant startTime, Instant endTime) {
        return flights.exists((root, query, cb) -> cb.and(
                cb.equal(root.get("drone").get("id"), droneId), cb.isTrue(root.get("active")),
                cb.isNull(root.get("deletedAt")),
                root.get("status").in(FlightStatus.PENDING, FlightStatus.APPROVED, FlightStatus.ACTIVE),
                cb.lessThan(root.get("startTime"), endTime), cb.greaterThan(root.get("endTime"), startTime)));
    }

    private void validateTrajectory(FlightRequestDto request) {
        try {
            JsonNode points = mapper.readTree(request.trajectoryJson());
            if (points == null || !points.isArray() || points.size() < 2 || points.size() > 10000)
                throw new IllegalArgumentException("Cần từ 2 đến 10000 waypoint");
            Instant previous = null;
            for (JsonNode point : points) {
                for (String field : List.of("latitude", "longitude", "altitude")) {
                    if (!point.path(field).isNumber() || !Double.isFinite(point.path(field).asDouble()))
                        throw new IllegalArgumentException("Waypoint thiếu tọa độ hợp lệ");
                }
                if (Math.abs(point.get("latitude").asDouble()) > 90 || Math.abs(point.get("longitude").asDouble()) > 180
                        || point.get("altitude").asDouble() < 0 || point.get("altitude").asDouble() > 120)
                    throw new IllegalArgumentException("Waypoint cần tọa độ hợp lệ và độ cao 0–120 m AGL trong mô phỏng");
                Instant time = vn.utm.common.UtcTime.parse(point.path("time").asText());
                if (time.isBefore(request.startTime()) || time.isAfter(request.endTime()) || (previous != null && !time.isAfter(previous)))
                    throw new IllegalArgumentException("Thời gian waypoint phải tăng và nằm trong khoảng bay");
                previous = time;
            }
            if (!vn.utm.common.UtcTime.parse(points.get(0).path("time").asText()).equals(request.startTime())
                    || !previous.equals(request.endTime()))
                throw new IllegalArgumentException("Waypoint đầu/cuối phải khớp thời gian cất/hạ cánh");
        } catch (java.io.IOException | DateTimeParseException exception) {
            throw new IllegalArgumentException("Quỹ đạo JSON hoặc thời gian waypoint không hợp lệ");
        }
    }

    public FlightPlan status(UUID id, FlightStatus next, UserAccount actor) {
        return status(id, next, null, actor);
    }

    public FlightPlan status(UUID id, FlightStatus next, String reviewNote, UserAccount actor) {
        auth.requireStaff(actor);
        if (next == FlightStatus.APPROVED || next == FlightStatus.REJECTED) auth.requireAdmin(actor);
        FlightPlan flight = editableFlight(id, actor);
        boolean valid = switch (flight.getStatus()) {
            case PENDING -> next == FlightStatus.APPROVED || next == FlightStatus.REJECTED;
            case APPROVED -> next == FlightStatus.ACTIVE;
            case ACTIVE -> next == FlightStatus.COMPLETED;
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException("Chuyển trạng thái không hợp lệ");
        if (next == FlightStatus.APPROVED || next == FlightStatus.ACTIVE) {
            live(flight.getDrone()); live(flight.getOperator());
            if (flight.getOperator().isLocked()) throw new IllegalArgumentException("Người vận hành đang bị khóa");
            if (!flight.getEndTime().isAfter(Instant.now()) || (next == FlightStatus.APPROVED && !flight.getStartTime().isAfter(Instant.now())))
                throw new IllegalArgumentException("Kế hoạch đã quá thời gian phê duyệt/kích hoạt");
        }
        if (next == FlightStatus.APPROVED || next == FlightStatus.REJECTED) {
            flight.setReviewedAt(Instant.now()); flight.setReviewedBy(actor.getId());
            flight.setReviewNote(trimToNull(reviewNote));
        }
        flight.setStatus(next); flight.recordActor(actor.getId()); log(actor, "FLIGHT_STATUS", id + ":" + next);
        if (next == FlightStatus.APPROVED) integration.publish(flight, "flightplan.accepted");
        else if (next == FlightStatus.ACTIVE || next == FlightStatus.COMPLETED) integration.publish(flight, "flightplan.status.changed");
        return flight;
    }

    public FlightPlan cancel(UUID id, UserAccount actor) {
        auth.requireOperator(actor);
        FlightPlan flight = editableFlight(id, actor);
        if (!flight.getOperator().getId().equals(actor.getId())) auth.deny();
        if (!flight.getStartTime().isAfter(Instant.now())
                || !Set.of(FlightStatus.PENDING, FlightStatus.APPROVED).contains(flight.getStatus()))
            throw new IllegalArgumentException("Chỉ hủy kế hoạch chờ duyệt/đã duyệt trước cất cánh");
        boolean wasApproved = flight.getStatus() == FlightStatus.APPROVED;
        flight.setStatus(FlightStatus.CANCELLED); flight.recordActor(actor.getId()); log(actor, "FLIGHT_CANCEL", id.toString());
        if (wasApproved) integration.publish(flight, "flightplan.cancelled");
        return flight;
    }

    public FlightPlan restoreFlight(UUID id, UserAccount actor) {
        auth.requireStaff(actor);
        FlightPlan flight = flight(id, actor); live(flight.getDrone()); live(flight.getOperator());
        flight.restore(actor.getId()); log(actor, "FLIGHT_RESTORE", id.toString());
        return flight;
    }

    public SystemLog log(UUID id, UserAccount actor) {
        auth.requireStaff(actor);
        return logs.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhật ký"));
    }

    public void clearLogs(UserAccount actor) {
        auth.requireAdmin(actor);
        logs.findAll((root, query, cb) -> cb.isNull(root.get("deletedAt"))).forEach(l -> l.softDelete(actor.getId()));
        log(actor, "LOG_CLEAR", "Xóa mềm nhật ký");
    }
}
