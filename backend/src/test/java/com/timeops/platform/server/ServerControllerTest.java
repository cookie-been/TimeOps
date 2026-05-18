package com.timeops.platform.server;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.timeops.platform.server.repository.ServerRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ServerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private CredentialCryptoService credentialCryptoService;

    @Test
    void shouldMaskPasswordWhenListingServers() throws Exception {
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

        String customerResponse = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"测试客户",
                                  "contactName":"张三",
                                  "contactPhone":"13800000000",
                                  "contactEmail":"zhangsan@example.com",
                                  "notes":"首个客户"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isString())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String customerId = JsonPath.read(customerResponse, "$.data.id");

        mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"10.0.0.1",
                                  "sshPort":22,
                                  "sshUsername":"root",
                                  "sshPassword":"P@ssw0rd!",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["prod","web"],
                                  "notes":"生产服务器"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isString());

        ServerEntity persistedServer = serverRepository.findByHost("10.0.0.1").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(persistedServer.getSshPasswordCipher()).isNotEqualTo("P@ssw0rd!");
        org.assertj.core.api.Assertions.assertThat(
                        credentialCryptoService.decrypt(persistedServer.getSshPasswordCipher()))
                .isEqualTo("P@ssw0rd!");

        String serverListResponse = mockMvc.perform(get("/api/servers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        List<String> passwordMasks = JsonPath.read(serverListResponse, "$.data[?(@.host == '10.0.0.1')].sshPasswordMasked");

        org.assertj.core.api.Assertions.assertThat(passwordMasks)
                .containsExactly("********");
        org.assertj.core.api.Assertions.assertThat(serverListResponse).doesNotContain("sshPasswordCipher");
    }

    @Test
    void shouldUpdateArchiveAndRestoreServer() throws Exception {
        String accessToken = login();
        String customerId = createCustomer(accessToken, "服务器客户");

        String serverResponse = mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"10.20.31.40",
                                  "sshPort":22,
                                  "sshUsername":"root",
                                  "sshPassword":"Init@123",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["prod"],
                                  "notes":"待更新"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String serverId = JsonPath.read(serverResponse, "$.data.id");

        mockMvc.perform(put("/api/servers/{serverId}", serverId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"10.20.31.41",
                                  "sshPort":2222,
                                  "sshUsername":"deploy",
                                  "sshPassword":"Updated@123",
                                  "osLabel":"Rocky Linux 9",
                                  "tags":["prod","app"],
                                  "notes":"已更新"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.host").value("10.20.31.41"))
                .andExpect(jsonPath("$.data.sshPort").value(2222))
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(patch("/api/servers/{serverId}/archive", serverId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordStatus").value("ARCHIVED"));

        mockMvc.perform(get("/api/servers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + serverId + "')]").isEmpty());

        mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"10.20.31.41",
                                  "sshPort":2222,
                                  "sshUsername":"ops",
                                  "sshPassword":"Reused@123",
                                  "osLabel":"Rocky Linux 9",
                                  "tags":["reused"],
                                  "notes":"同地址复用"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/servers/{serverId}/restore", serverId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict());
    }

    private String login() throws Exception {
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"Admin@123"}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(loginResponse, "$.data.accessToken");
    }

    private String createCustomer(String accessToken, String customerName) throws Exception {
        String customerResponse = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"%s",
                                  "contactName":"张三",
                                  "contactPhone":"13800000000",
                                  "contactEmail":"zhangsan@example.com",
                                  "notes":"首个客户"
                                }
                                """.formatted(customerName)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(customerResponse, "$.data.id");
    }
}
