package vn.utm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import java.time.LocalDateTime;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:utm-test")
@AutoConfigureMockMvc
class UtmApplicationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test
    void individualCanRegisterLoginAndRunSimulation() throws Exception {
        mvc.perform(get("/api/companies")).andExpect(status().isUnauthorized());

        String registration = mapper.writeValueAsString(Map.of(
                "accountType", "INDIVIDUAL", "fullName", "Nguyễn Văn An",
                "nationalId", "079203001234", "email", "an@example.vn",
                "password", "Matkhau@123", "phone", "0901234567",
                "address", "TP. Hồ Chí Minh", "licenseNumber", "GP-CN-001"));
        MvcResult registerResult = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(registration))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType").value("INDIVIDUAL"))
                .andExpect(jsonPath("$.displayName").value("Nguyễn Văn An"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) registerResult.getRequest().getSession(false);
        long profileId = mapper.readTree(registerResult.getResponse().getContentAsString()).get("profileId").asLong();

        mvc.perform(get("/api/companies").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(profileId));

        String flightJson = mapper.writeValueAsString(Map.of(
                "companyId", profileId, "missionName", "Khảo sát hành lang điện",
                "departureLocation", "Thủ Đức", "destinationLocation", "Quận 9",
                "droneType", "HYBRID", "scheduledAt", LocalDateTime.now().plusHours(2).withNano(0).toString(),
                "altitude", 90, "estimatedDuration", 35));
        String flightResult = mvc.perform(post("/api/flights").session(session)
                        .contentType(MediaType.APPLICATION_JSON).content(flightJson))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("REGISTERED"))
                .andExpect(jsonPath("$.droneType").value("HYBRID"))
                .andReturn().getResponse().getContentAsString();
        long flightId = mapper.readTree(flightResult).get("id").asLong();

        mvc.perform(post("/api/flights/{id}/send", flightId).session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SIMULATING"));
        mvc.perform(get("/api/flights/{id}/monitoring", flightId).session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.flightId").value(flightId)).andExpect(jsonPath("$.battery").isNumber());

        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isNoContent());
        String login = mapper.writeValueAsString(Map.of("email", "an@example.vn", "password", "Matkhau@123"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Nguyễn Văn An"));
    }

    @Test
    void businessCanRegisterWithLegalProfile() throws Exception {
        String registration = mapper.writeValueAsString(Map.of(
                "accountType", "BUSINESS", "companyName", "Công ty UAV Việt Nam",
                "taxCode", "0312345678", "representative", "Trần Minh Khoa",
                "email", "ops@uav.vn", "password", "Doanhnghiep@123",
                "phone", "02812345678", "address", "TP. Hồ Chí Minh",
                "licenseNumber", "GP-DN-001"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registration))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType").value("BUSINESS"))
                .andExpect(jsonPath("$.displayName").value("Công ty UAV Việt Nam"));
    }
}
