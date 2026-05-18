package com.timeops.platform.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.timeops.platform.audit.AuditLogRepository;
import com.timeops.platform.user.repository.UserRepository;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void shouldCreateUserWithAssignedRoles() throws Exception {
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"Admin@123"}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String accessToken = JsonPath.read(loginResponse, "$.data.accessToken");

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"ops.manager",
                                  "displayName":"运维经理",
                                  "password":"OpsManager@123",
                                  "roleCodes":["OPS_ADMIN","AUDITOR"],
                                  "enabled":true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("ops.manager"))
                .andExpect(jsonPath("$.data.roles[0]").value("OPS_ADMIN"))
                .andExpect(jsonPath("$.data.roles[1]").value("AUDITOR"))
                .andExpect(jsonPath("$.data.enabled").value(true));

        UserEntity persistedUser = userRepository.findByUsername("ops.manager").orElseThrow();
        Assertions.assertThat(persistedUser.getRoles())
                .extracting(roleEntity -> roleEntity.getRoleCode().name())
                .containsExactlyInAnyOrder("OPS_ADMIN", "AUDITOR");
        Assertions.assertThat(auditLogRepository.count()).isGreaterThan(0);
    }

    @Test
    void shouldUpdateUserRolesAndStatus() throws Exception {
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"Admin@123"}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String accessToken = JsonPath.read(loginResponse, "$.data.accessToken");

        String createdUserResponse = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"audit.reader",
                                  "displayName":"审计专员",
                                  "password":"AuditReader@123",
                                  "roleCodes":["AUDITOR"],
                                  "enabled":true
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String userId = JsonPath.read(createdUserResponse, "$.data.id");

        mockMvc.perform(put("/api/users/{userId}/roles", userId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roleCodes":["OPS_ADMIN"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roles[0]").value("OPS_ADMIN"));

        mockMvc.perform(put("/api/users/{userId}/status", userId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"enabled":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(false));

        String userListResponse = mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UserEntity updatedUser = userRepository.findByUsername("audit.reader").orElseThrow();
        Assertions.assertThat(updatedUser.isEnabled()).isFalse();
        Assertions.assertThat(updatedUser.getRoles())
                .extracting(roleEntity -> roleEntity.getRoleCode().name())
                .containsExactly("OPS_ADMIN");
        Assertions.assertThat(userListResponse).contains("\"username\":\"audit.reader\"");
        Assertions.assertThat(userListResponse).contains("\"enabled\":false");
    }
}
