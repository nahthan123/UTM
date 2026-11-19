package vn.utm;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import vn.utm.model.*;
import vn.utm.repository.*;
import vn.utm.service.AuthService;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:utm-v2-test;DB_CLOSE_DELAY=-1",
        "spring.config.import=", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "utm.integration.mode=mock",
        "utm.bootstrap.username=", "utm.bootstrap.password=",
        "logging.level.root=WARN", "debug=false"})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class UtmApplicationTests {
    private static final ZoneId WEB_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserAccountRepository users;
    @Autowired RoleRepository roles;
    @Autowired DroneRepository drones;
    @Autowired FlightPlanRepository flights;
    @Autowired AuthService auth;

    private record Account(String id, String username, MockHttpSession session) {}

    @Test void swaggerUiAndClientConfigurationAreAvailableWithoutLogin() throws Exception {
        mvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/swagger-ui/index.html"));
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Swagger UI")));
        mvc.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/v3/api-docs"))
                .andExpect(jsonPath("$.withCredentials").value(true));
    }

    @Test void openApiDescribesSessionAuthenticationAndBusinessEndpoints() throws Exception {
        MvcResult result = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("SkyPermit UTM API"))
                .andExpect(jsonPath("$.components.securitySchemes.sessionCookie.type").value("apiKey"))
                .andExpect(jsonPath("$.components.securitySchemes.sessionCookie.in").value("cookie"))
                .andExpect(jsonPath("$.components.securitySchemes.sessionCookie.name").value("JSESSIONID"))
                .andReturn();
        JsonNode document = mapper.readTree(result.getResponse().getContentAsString());
        JsonNode paths = document.path("paths");
        assertTrue(paths.has("/api/flights/batch"));
        assertTrue(paths.has("/api/flights/{id}/accepted-plan"));
        assertTrue(paths.has("/api/integrations/{id}/retry"));
        assertFalse(paths.has("/error"));
        assertEquals(0, paths.path("/api/auth/login").path("post").path("security").size());
        assertTrue(paths.path("/api/auth/login").path("post").has("security"),
                "Public login must explicitly override global session authentication");
        assertTrue(paths.path("/api/auth/register").path("post").has("security"));
        assertEquals(0, paths.path("/api/auth/register").path("post").path("security").size());
        assertTrue(document.path("security").get(0).has("sessionCookie"));
        Set<String> queryNames = new HashSet<>();
        paths.path("/api/flights").path("get").path("parameters")
                .forEach(parameter -> queryNames.add(parameter.path("name").asText()));
        assertEquals(Set.of("page", "size", "sort", "isActive", "status"), queryNames,
                "Swagger must expose usable filters instead of a raw Map or HttpSession");
        assertTrue(document.path("components").path("schemas").path("LoginRequest")
                .path("properties").path("password").path("writeOnly").asBoolean());
    }

    @Test void swaggerDocumentationDoesNotBypassSessionAuthentication() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        Account account = register();
        mvc.perform(get("/api/auth/me").session(account.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(account.username));
    }

    private Account register() throws Exception {
        String name = "operator" + UUID.randomUUID().toString().substring(0, 8);
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", name, "fullName", "Nguyễn Văn An",
                        "email", name + "@example.vn", "phone", "0901234567", "password", "Matkhau@123",
                        "roleId", roles.findByCode("ADMIN").orElseThrow().getId()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("OPERATOR"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andReturn();
        String id = mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        assertNotNull(users.findById(UUID.fromString(id)).orElseThrow().getCreatedBy());
        return new Account(id, name, (MockHttpSession) result.getRequest().getSession(false));
    }

    private MockHttpSession staff(String role) {
        UserAccount user = new UserAccount();
        user.setUsername("staff" + UUID.randomUUID().toString().substring(0, 8));
        user.setEmail(user.getUsername() + "@example.vn"); user.setFullName("Staff"); user.setPhone("0901234567");
        user.setPasswordHash(auth.hash("Matkhau@123")); user.setRole(roles.findByCode(role).orElseThrow());
        users.saveAndFlush(user);
        MockHttpSession session = new MockHttpSession(); session.setAttribute(AuthService.SESSION_ACCOUNT_ID, user.getId());
        return session;
    }

    private String createDrone(Account account) throws Exception {
        return createDrone(account, "MULTIROTOR");
    }

    private String createLegacyDrone(Account account) throws Exception {
        return createDrone(account, null);
    }

    private String createDrone(Account account, String type) throws Exception {
        Map<String, Object> request = new HashMap<>(Map.of("serialNumber", "RID-" + UUID.randomUUID(),
                "model", "UAV Việt Nam", "maxFlightTime", 45, "maxSpeed", 20));
        if (type != null) request.put("droneType", type);
        MvcResult result = mvc.perform(post("/api/drones").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.owner.passwordHash").doesNotExist()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    private Map<String, Object> plan(String droneId) throws Exception {
        LocalDateTime start = LocalDateTime.now(WEB_TIME_ZONE).plusDays(1).withNano(0), end = start.plusMinutes(20);
        return Map.of("droneId", droneId, "startTime", start.toString(), "endTime", end.toString(),
                "trajectoryJson", mapper.writeValueAsString(List.of(
                        Map.of("latitude", 10.8, "longitude", 106.7, "altitude", 50, "time", start.toString()),
                        Map.of("latitude", 10.81, "longitude", 106.71, "altitude", 60, "time", end.toString()))));
    }

    private String submit(Account account, Map<String, Object> plan) throws Exception {
        MvcResult result = mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(plan))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.trajectoryJson").isString()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test void droneClassificationPersistsAndLegacyUpdatesPreserveType() throws Exception {
        Account account = register();
        for (String type : List.of("MULTIROTOR", "FIXED_WING", "HYBRID")) {
            Map<String, Object> request = new HashMap<>(Map.of("serialNumber", "SN-" + UUID.randomUUID(),
                    "model", "Demo UAV", "droneType", type, "maxFlightTime", 45, "maxSpeed", 15.5));
            var result = mvc.perform(post("/api/drones").session(account.session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(request))).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.droneType").value(type)).andReturn();
            String id = mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
            assertEquals(type, drones.findById(UUID.fromString(id)).orElseThrow().getDroneType().name());
            request.remove("droneType");
            mvc.perform(put("/api/drones/{id}", id).session(account.session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(request))).andExpect(status().isOk())
                    .andExpect(jsonPath("$.droneType").value(type));
        }
        String legacy = createLegacyDrone(account);
        assertNull(drones.findById(UUID.fromString(legacy)).orElseThrow().getDroneType());
    }

    @Test void legacyDroneMustDeclareTypeBeforeSubmittingPlan() throws Exception {
        Account account = register(); String droneId = createLegacyDrone(account);
        Map<String, Object> plan = plan(droneId);
        mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(plan))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/flights").session(account.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
        Drone legacy = drones.findById(UUID.fromString(droneId)).orElseThrow();
        assertNull(legacy.getDroneType());
        mvc.perform(put("/api/drones/{id}", droneId).session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("serialNumber", legacy.getSerialNumber(),
                        "model", legacy.getModel(), "droneType", "MULTIROTOR",
                        "maxFlightTime", legacy.getMaxFlightTime(), "maxSpeed", legacy.getMaxSpeed()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.droneType").value("MULTIROTOR"));
        submit(account, plan);
    }

    @Test void droneRejectsInvalidClassificationAndPerformance() throws Exception {
        Account account = register();
        Map<String, Object> valid = Map.of("serialNumber", "SN-" + UUID.randomUUID(), "model", "Demo",
                "droneType", "HYBRID", "maxFlightTime", 45, "maxSpeed", 15.5);
        for (Map<String, Object> patch : List.of(
                Map.<String, Object>of("droneType", "UNKNOWN"), Map.<String, Object>of("maxFlightTime", 0),
                Map.<String, Object>of("maxFlightTime", 1.5), Map.<String, Object>of("maxSpeed", 0),
                Map.<String, Object>of("maxSpeed", -1), Map.<String, Object>of("serialNumber", "   "))) {
            var request = new HashMap<>(valid); request.putAll(patch);
            mvc.perform(post("/api/drones").session(account.session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        }
    }

    @Test void legacyAndOffsetRequestsReturnSameUtcInstant() throws Exception {
        Account account = register(); String droneId = createDrone(account);
        Map<String, Object> legacy = plan(droneId);
        String id = submit(account, legacy);
        String expected = vn.utm.common.UtcTime.parse((String) legacy.get("startTime")).toString();
        mvc.perform(get("/api/flights/{id}", id).session(account.session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.startTime").value(expected))
                .andExpect(jsonPath("$.createdAt").value(org.hamcrest.Matchers.endsWith("Z")))
                .andExpect(jsonPath("$.operator.passwordHash").doesNotExist());
        Map<String, Object> offset = new HashMap<>(legacy);
        offset.put("droneId", createDrone(account));
        offset.put("startTime", legacy.get("startTime") + "+07:00");
        offset.put("endTime", vn.utm.common.UtcTime.parse((String) legacy.get("endTime")).toString());
        String second = submit(account, offset);
        mvc.perform(get("/api/flights/{id}", second).session(account.session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.startTime").value(expected));
        assertTrue(mapper.readTree(flights.findById(UUID.fromString(second)).orElseThrow().getTrajectoryJson())
                .get(0).get("time").asText().endsWith("Z"));
    }

    @Test void rejectsOverlappingPlansForSameDrone() throws Exception {
        Account account = register(); String droneId = createDrone(account);
        Map<String, Object> request = plan(droneId);
        String id = submit(account, request);
        mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/flights").session(account.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(id));
    }

    @Test void rejectsInvalidOffsetAndPastInstant() throws Exception {
        Account account = register(); String droneId = createDrone(account);
        Map<String, Object> invalid = new HashMap<>(plan(droneId));
        invalid.put("startTime", "2030-01-01T09:00:00+25:00");
        mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        invalid.put("startTime", "2020-01-01T09:00:00Z");
        mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(invalid))).andExpect(status().isBadRequest());
    }

    @Test void operatorCanSubmitApprovalAndCancelWithSoftDeletion() throws Exception {
        mvc.perform(get("/api/drones")).andExpect(status().isUnauthorized());
        Account account = register(); String droneId = createDrone(account);
        Map<String, Object> plan = plan(droneId); String id = submit(account, plan);
        assertEquals(vn.utm.common.TrajectoryTime.normalize((String) plan.get("trajectoryJson"), mapper),
                flights.findById(UUID.fromString(id)).orElseThrow().getTrajectoryJson());
        mvc.perform(get("/api/flights").session(account.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(id)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(put("/api/flights/{id}/status", id).session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        MockHttpSession manager = staff("MANAGER");
        mvc.perform(put("/api/flights/{id}/status", id).session(manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/flights/{id}/status", id).session(manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/flights/{id}/status", id).session(staff("ADMIN")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/flights/active-or-approved").session(manager)).andExpect(status().isOk()).andExpect(jsonPath("$.content").isNotEmpty());
        mvc.perform(delete("/api/drones/{id}", droneId).session(account.session)).andExpect(status().isBadRequest());
        mvc.perform(put("/api/flights/{id}/cancel", id).session(account.session)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        mvc.perform(delete("/api/drones/{id}", droneId).session(account.session)).andExpect(status().isNoContent());
        Drone deleted = drones.findById(UUID.fromString(droneId)).orElseThrow();
        assertNotNull(deleted.getDeletedAt()); assertEquals(UUID.fromString(account.id), deleted.getDeletedBy());
        mvc.perform(get("/api/drones?isActive=false").session(account.session)).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(droneId));
        mvc.perform(put("/api/drones/{id}/restore", droneId).session(account.session)).andExpect(status().isOk()).andExpect(jsonPath("$.deletedAt").isEmpty());
        mvc.perform(get("/api/logs/action?type=FLIGHT_SUBMIT").session(manager)).andExpect(status().isOk()).andExpect(jsonPath("$.content").isNotEmpty());
        mvc.perform(post("/api/auth/logout").session(account.session)).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", account.username, "password", "Matkhau@123"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(account.id));
    }

    @Test void operatorCannotAccessAnotherOwnersData() throws Exception {
        Account first = register(), second = register(); String droneId = createDrone(first);
        mvc.perform(get("/api/drones/{id}", droneId).session(second.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/drones/owner/{id}", first.id).session(second.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/drones").session(second.session)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(post("/api/flights").session(second.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(plan(droneId)))).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").session(first.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/logs").session(first.session)).andExpect(status().isForbidden());
    }

    @Test void rejectsInvalidTrajectoryTimesAndPagination() throws Exception {
        Account account = register(); String droneId = createDrone(account);
        Map<String, Object> invalid = new HashMap<>(plan(droneId));
        for (String json : List.of("not json", "null", "[]", "[{\"latitude\":91}]")) {
            invalid.put("trajectoryJson", json);
            mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        }
        invalid = new HashMap<>(plan(droneId)); invalid.put("endTime", LocalDateTime.now(WEB_TIME_ZONE).plusDays(1).plusHours(5).toString());
        mvc.perform(post("/api/flights").session(account.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        for (String query : List.of("size=0", "page=-1", "sort=password_hash,asc", "isActive=oops"))
            mvc.perform(get("/api/drones?" + query).session(account.session)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/drones?sort=created_at,asc&size=1").session(account.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
        mvc.perform(get("/api/drones/not-a-uuid").session(account.session)).andExpect(status().isBadRequest());
    }

    @Test void managerCanRunApprovedPlanToCompletionAndRestore() throws Exception {
        Account account = register();
        String id = submit(account, plan(createDrone(account)));
        MockHttpSession manager = staff("MANAGER");
        mvc.perform(put("/api/flights/{id}/status", id).session(manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/flights/{id}/status", id).session(staff("ADMIN")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isOk());
        for (String next : List.of("ACTIVE", "COMPLETED")) {
            mvc.perform(put("/api/flights/{id}/status", id).session(manager).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("status", next))))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(next));
        }
        mvc.perform(put("/api/flights/{id}/cancel", id).session(account.session)).andExpect(status().isBadRequest());
        FlightPlan deleted = flights.findById(UUID.fromString(id)).orElseThrow();
        deleted.softDelete(UUID.fromString(account.id)); flights.saveAndFlush(deleted);
        mvc.perform(put("/api/flights/{id}/restore", id).session(account.session)).andExpect(status().isForbidden());
        mvc.perform(put("/api/flights/{id}/restore", id).session(manager)).andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true)).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test void adminCanCreateUserUpdateDroneWithoutChangingOwnerAndRejectDuplicate() throws Exception {
        MockHttpSession admin = staff("ADMIN");
        String name = "managed" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> body = new HashMap<>(Map.of("username", name, "fullName", "Người vận hành",
                "email", name + "@example.vn", "phone", "0901234567", "password", "Matkhau@123",
                "roleId", roles.findByCode("OPERATOR").orElseThrow().getId()));
        MvcResult created = mvc.perform(post("/api/users").session(admin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body))).andExpect(status().isCreated()).andReturn();
        String id = mapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
        String hash = users.findById(UUID.fromString(id)).orElseThrow().getPasswordHash();
        body.remove("password"); body.put("fullName", "Họ tên cập nhật");
        mvc.perform(put("/api/users/{id}", id).session(admin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body))).andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Họ tên cập nhật"));
        assertEquals(hash, users.findById(UUID.fromString(id)).orElseThrow().getPasswordHash());
        body.put("password", "Matkhau@123");
        mvc.perform(post("/api/users").session(admin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body))).andExpect(status().isBadRequest());

        Account operator = register(); String droneId = createDrone(operator);
        mvc.perform(put("/api/drones/{id}", droneId).session(admin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("serialNumber", "UPDATED-" + UUID.randomUUID(),
                        "model", "New model", "maxFlightTime", 50, "maxSpeed", 25))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.owner.id").value(operator.id));
    }

    @Test void staffCannotUseOperatorSubmissionApisEvenForTheirOwnDrone() throws Exception {
        for (String role : List.of("ADMIN", "MANAGER")) {
            var session = staff(role);
            var actor = users.findById((UUID) session.getAttribute(AuthService.SESSION_ACCOUNT_ID)).orElseThrow();
            var drone = new Drone(); drone.setOwner(actor); drone.setSerialNumber("LEGACY-" + UUID.randomUUID());
            drone.setModel("Legacy staff drone"); drone.setMaxFlightTime(45); drone.setMaxSpeed(20.0);
            drones.saveAndFlush(drone);
            mvc.perform(post("/api/flights").session(session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(plan(drone.getId().toString())))).andExpect(status().isForbidden());
            mvc.perform(post("/api/drones").session(session).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("serialNumber", "NEW-" + UUID.randomUUID(), "model", "Demo",
                            "maxFlightTime", 45, "maxSpeed", 20)))).andExpect(status().isForbidden());
        }
    }

    @Test void reviewQueueFilterAndOperatorDenialsAreEnforcedByBackend() throws Exception {
        var operator = register(); String id = submit(operator, plan(createDrone(operator)));
        var manager = staff("MANAGER");
        mvc.perform(get("/api/flights?status=PENDING").session(manager)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].status").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("PENDING"))));
        mvc.perform(put("/api/flights/{id}/status", id).session(operator.session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/flights/{id}/status", id).session(manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/flights/{id}/status", id).session(staff("ADMIN")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/flights?status=APPROVED").session(manager)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].status").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("APPROVED"))));
        mvc.perform(get("/api/flights?status=UNKNOWN").session(manager)).andExpect(status().isBadRequest());
        mvc.perform(put("/api/flights/{id}/cancel", id).session(manager)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/logs/clear").session(manager)).andExpect(status().isForbidden());
        mvc.perform(post("/api/roles").session(manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"NO_ACCESS\",\"name\":\"Denied\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").session(operator.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/logs").session(operator.session)).andExpect(status().isForbidden());
    }

    @Test void excelReadEndpointsSupportDetailOwnershipAndFiltering() throws Exception {
        var operator = register(); var other = register(); var manager = staff("MANAGER");
        String droneId = createDrone(operator), flightId = submit(operator, plan(droneId));
        var drone = drones.findById(UUID.fromString(droneId)).orElseThrow();
        mvc.perform(get("/api/drones/{id}", droneId).session(operator.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(droneId));
        mvc.perform(get("/api/drones/search").param("serialNumber", drone.getSerialNumber()).session(operator.session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/drones/owner/{id}", operator.id).session(other.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/flights/operator/{id}", operator.id).session(operator.session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(flightId));
        mvc.perform(get("/api/flights/{id}", flightId).session(other.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/roles/{id}", roles.findByCode("OPERATOR").orElseThrow().getId()).session(operator.session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("OPERATOR"));
        mvc.perform(get("/api/users/{id}", operator.id).session(operator.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/api/users").param("keyword", operator.username).param("isLocked", "false").session(manager))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        var logs = mvc.perform(get("/api/logs/user/{id}", operator.id).session(manager)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2))).andReturn();
        String logId = mapper.readTree(logs.getResponse().getContentAsString()).get("content").get(0).get("id").asText();
        mvc.perform(get("/api/logs/{id}", logId).session(manager)).andExpect(status().isOk());
        mvc.perform(get("/api/logs/action").param("type", "FLIGHT_SUBMIT").session(manager))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].actionType").value("FLIGHT_SUBMIT"));
        mvc.perform(get("/api/logs/{id}", logId).session(operator.session)).andExpect(status().isForbidden());
    }

    @Test void excelSoftDeleteRecordsActorAndKeepsDroneUniqueness() throws Exception {
        var operator = register(); String droneId = createDrone(operator);
        String serial = drones.findById(UUID.fromString(droneId)).orElseThrow().getSerialNumber();
        mvc.perform(delete("/api/drones/{id}", droneId).session(operator.session)).andExpect(status().isNoContent());
        var deleted = drones.findById(UUID.fromString(droneId)).orElseThrow();
        assertEquals(UUID.fromString(operator.id), deleted.getDeletedBy());
        assertNotNull(deleted.getDeletedAt());
        mvc.perform(get("/api/drones?isActive=false").session(operator.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(droneId));
        mvc.perform(post("/api/drones").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("serialNumber", serial, "model", "Duplicate", "maxFlightTime", 20, "maxSpeed", 10))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/drones/{id}/restore", droneId).session(operator.session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true)).andExpect(jsonPath("$.deletedAt").isEmpty());
    }

    @Test void adminCanManageRolesUsersAndLogs() throws Exception {
        MockHttpSession admin = staff("ADMIN"); Account account = register();
        String code = "CUSTOM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        MvcResult result = mvc.perform(post("/api/roles").session(admin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("code", code, "name", "Vai trò kiểm thử"))))
                .andExpect(status().isCreated()).andReturn();
        String id = mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        mvc.perform(delete("/api/roles/{id}", id).session(admin)).andExpect(status().isNoContent());
        mvc.perform(put("/api/roles/{id}/restore", id).session(admin)).andExpect(status().isOk()).andExpect(jsonPath("$.isActive").value(true));
        mvc.perform(delete("/api/roles/{id}", roles.findByCode("OPERATOR").orElseThrow().getId()).session(admin)).andExpect(status().isBadRequest());
        for (int i = 0; i < 5; i++) mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", account.username, "password", "incorrect")))).andExpect(status().isUnauthorized());
        assertTrue(users.findById(UUID.fromString(account.id)).orElseThrow().isLocked());
        mvc.perform(get("/api/auth/me").session(account.session)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/users/{id}/unlock", account.id).session(admin)).andExpect(status().isOk()).andExpect(jsonPath("$.loginFailCount").value(0));
        mvc.perform(get("/api/users?keyword=" + account.username).session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
        mvc.perform(delete("/api/logs/clear").session(admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/logs?isActive=false").session(admin)).andExpect(status().isOk()).andExpect(jsonPath("$.content").isNotEmpty());
        mvc.perform(delete("/api/users/{id}", account.id).session(admin)).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", account.username, "password", "Matkhau@123")))).andExpect(status().isUnauthorized());
    }

    private Map<String, Object> businessRegistration() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> request = new HashMap<>();
        request.put("accountType", "BUSINESS");
        request.put("username", "business." + suffix);
        request.put("password", "BusinessTest_123");
        request.put("email", suffix + "@example.vn");
        request.put("phone", "0901234567");
        request.put("companyName", "Công ty UAV Kiểm thử");
        request.put("taxCode", "TEST-" + suffix);
        request.put("representative", "Trần Văn Bình");
        request.put("address", "Thành phố Hồ Chí Minh");
        request.put("licenseNumber", "GP-TEST-001");
        return request;
    }

    @Test void businessCanRegisterLoginAndSubmitPlanWithPersistedCompanyProfile() throws Exception {
        Map<String, Object> request = businessRegistration();
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType").value("BUSINESS"))
                .andExpect(jsonPath("$.role").value("OPERATOR"))
                .andExpect(jsonPath("$.displayName").value("Công ty UAV Kiểm thử"))
                .andExpect(jsonPath("$.representative").value("Trần Văn Bình")).andReturn();
        String id = mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        UserAccount stored = users.findById(UUID.fromString(id)).orElseThrow();
        assertEquals("Công ty UAV Kiểm thử", stored.getCompanyName());
        assertEquals("Thành phố Hồ Chí Minh", stored.getAddress());
        assertEquals("GP-TEST-001", stored.getLicenseNumber());
        assertEquals("Trần Văn Bình", stored.getFullName());
        Account business = new Account(id, request.get("username").toString(),
                (MockHttpSession) result.getRequest().getSession(false));
        submit(business, plan(createDrone(business)));
        mvc.perform(post("/api/auth/logout").session(business.session)).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", request.get("username"), "password", request.get("password")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountType").value("BUSINESS"))
                .andExpect(jsonPath("$.taxCode").value(stored.getTaxCode()));
    }

    @Test void businessRegistrationRejectsMissingLegalFieldsAndDuplicateTaxCode() throws Exception {
        for (String field : List.of("companyName", "taxCode", "representative", "address")) {
            Map<String, Object> request = businessRegistration();
            request.remove(field);
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        }
        Map<String, Object> first = businessRegistration();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(first))).andExpect(status().isCreated());
        Map<String, Object> second = businessRegistration();
        second.put("taxCode", " " + first.get("taxCode").toString().toLowerCase(Locale.ROOT) + " ");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(second))).andExpect(status().isBadRequest());
        Map<String, Object> individual = new HashMap<>(businessRegistration());
        individual.put("accountType", "INDIVIDUAL"); individual.remove("representative");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(individual))).andExpect(status().isBadRequest());
        individual.put("fullName", "Người dùng cá nhân");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(individual))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType").value("INDIVIDUAL"))
                .andExpect(jsonPath("$.companyName").isEmpty()).andExpect(jsonPath("$.taxCode").isEmpty());
    }
}
