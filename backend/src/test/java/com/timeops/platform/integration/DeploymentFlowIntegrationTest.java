package com.timeops.platform.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class DeploymentFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateDeployTaskFromInstanceAndRelease() throws Exception {
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

        String customerId = JsonPath.read(mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"集成客户",
                                  "contactName":"王集成",
                                  "contactPhone":"13712345678",
                                  "contactEmail":"integration@example.com",
                                  "notes":"集成联调客户"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String serverId = JsonPath.read(mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"192.168.10.11",
                                  "sshPort":22,
                                  "sshUsername":"deploy",
                                  "sshPassword":"Deploy@123",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["integration"],
                                  "notes":"集成服务器"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String templateId = JsonPath.read(mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"集成模板",
                                  "productCode":"integration-app",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/integration-app",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "description":"集成模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"docker compose up -d"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String releaseId = JsonPath.read(mockMvc.perform(post("/api/releases")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "templateId":"%s",
                                  "versionLabel":"v9.9.9",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/integration-app.git",
                                  "gitRef":"refs/tags/v9.9.9",
                                  "changelog":"集成版本"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String instanceId = JsonPath.read(mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "templateId":"%s",
                                  "primaryServerId":"%s",
                                  "instanceName":"集成实例",
                                  "environmentLabel":"prod",
                                  "configOverride":{"DOMAIN":"integration.example.com"},
                                  "notes":"集成实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        mockMvc.perform(post("/api/tasks/deploy")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"%s","releaseId":"%s"}
                                """.formatted(instanceId, releaseId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.taskNumber").isString());

        mockMvc.perform(get("/api/customers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/templates")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/releases")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/instances")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }
}
