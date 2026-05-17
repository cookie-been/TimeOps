package com.timeops.platform.server;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.timeops.platform.server.repository.ServerRepository;
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

        ServerEntity persistedServer = serverRepository.findAll().get(0);
        org.assertj.core.api.Assertions.assertThat(persistedServer.getSshPasswordCipher()).isNotEqualTo("P@ssw0rd!");
        org.assertj.core.api.Assertions.assertThat(
                        credentialCryptoService.decrypt(persistedServer.getSshPasswordCipher()))
                .isEqualTo("P@ssw0rd!");

        mockMvc.perform(get("/api/servers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].host").value("10.0.0.1"))
                .andExpect(jsonPath("$.data[0].sshPasswordMasked").value("********"))
                .andExpect(jsonPath("$.data[0].sshPasswordCipher").doesNotExist());
    }
}
