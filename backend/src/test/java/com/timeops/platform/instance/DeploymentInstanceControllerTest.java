package com.timeops.platform.instance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class DeploymentInstanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateInstanceAndReturnMergedConfig() throws Exception {
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
                                  "name":"实例客户",
                                  "contactName":"李四",
                                  "contactPhone":"13900000000",
                                  "contactEmail":"lisi@example.com",
                                  "notes":"实例测试客户"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String customerId = JsonPath.read(customerResponse, "$.data.id");

        String serverResponse = mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"10.10.10.10",
                                  "sshPort":22,
                                  "sshUsername":"deploy",
                                  "sshPassword":"Deploy@123",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["prod","app"],
                                  "notes":"实例主机"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String serverId = JsonPath.read(serverResponse, "$.data.id");

        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"结算系统",
                                  "productCode":"billing-web",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/billing-web",
                                  "defaultConfig":{"APP_PORT":"8080","THEME":"blue"},
                                  "description":"结算系统模板",
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
                .getContentAsString();
        String templateId = JsonPath.read(templateResponse, "$.data.id");

        String instanceResponse = mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "templateId":"%s",
                                  "primaryServerId":"%s",
                                  "instanceName":"结算系统-生产",
                                  "environmentLabel":"prod",
                                  "configOverride":{"THEME":"green","DOMAIN":"billing.example.com"},
                                  "notes":"生产实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.instanceName").value("结算系统-生产"))
                .andExpect(jsonPath("$.data.mergedConfig.APP_PORT").value("8080"))
                .andExpect(jsonPath("$.data.mergedConfig.THEME").value("green"))
                .andExpect(jsonPath("$.data.mergedConfig.DOMAIN").value("billing.example.com"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String instanceId = JsonPath.read(instanceResponse, "$.data.id");

        mockMvc.perform(get("/api/instances/" + instanceId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.instanceName").value("结算系统-生产"))
                .andExpect(jsonPath("$.data.mergedConfig.THEME").value("green"));
    }

    @Test
    void shouldUpdateArchiveAndRestoreInstance() throws Exception {
        String accessToken = login();
        String customerId = createCustomer(accessToken, "实例归档客户");
        String serverId = createServer(accessToken, customerId, "10.10.20.20");
        String templateId = createTemplate(accessToken, "instance-archive-template");

        String instanceResponse = mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "templateId":"%s",
                                  "primaryServerId":"%s",
                                  "instanceName":"供应链实例",
                                  "environmentLabel":"prod",
                                  "configOverride":{"THEME":"green"},
                                  "notes":"初始实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String instanceId = JsonPath.read(instanceResponse, "$.data.id");

        mockMvc.perform(put("/api/instances/{instanceId}", instanceId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "templateId":"%s",
                                  "primaryServerId":"%s",
                                  "instanceName":"供应链实例-更新",
                                  "environmentLabel":"pre",
                                  "configOverride":{"THEME":"blue"},
                                  "notes":"已更新"
                                }
                                """.formatted(customerId, templateId, serverId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.instanceName").value("供应链实例-更新"))
                .andExpect(jsonPath("$.data.environmentLabel").value("pre"))
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(patch("/api/instances/{instanceId}/archive", instanceId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordStatus").value("ARCHIVED"));

        mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "templateId":"%s",
                                  "primaryServerId":"%s",
                                  "instanceName":"供应链实例-更新",
                                  "environmentLabel":"prod",
                                  "configOverride":{"THEME":"red"},
                                  "notes":"复用实例名"
                                }
                                """.formatted(customerId, templateId, serverId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/instances/{instanceId}/restore", instanceId)
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
                                  "contactName":"李四",
                                  "contactPhone":"13900000000",
                                  "contactEmail":"lisi@example.com",
                                  "notes":"实例测试客户"
                                }
                                """.formatted(customerName)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(customerResponse, "$.data.id");
    }

    private String createServer(String accessToken, String customerId, String host) throws Exception {
        String serverResponse = mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId":"%s",
                                  "host":"%s",
                                  "sshPort":22,
                                  "sshUsername":"deploy",
                                  "sshPassword":"Deploy@123",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["prod","app"],
                                  "notes":"实例主机"
                                }
                                """.formatted(customerId, host)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(serverResponse, "$.data.id");
    }

    private String createTemplate(String accessToken, String productCode) throws Exception {
        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"结算系统",
                                  "productCode":"%s",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/billing-web",
                                  "defaultConfig":{"APP_PORT":"8080","THEME":"blue"},
                                  "description":"结算系统模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"docker compose up -d"
                                    }
                                  ]
                                }
                                """.formatted(productCode)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(templateResponse, "$.data.id");
    }
}
