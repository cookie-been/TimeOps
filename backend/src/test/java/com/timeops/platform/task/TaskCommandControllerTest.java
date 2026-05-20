package com.timeops.platform.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.timeops.platform.audit.AuditLogRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class TaskCommandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private OperationTaskService operationTaskService;

    @Test
    void shouldRequireRiskConfirmationForAdhocCommand() throws Exception {
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
                                  "name":"命令客户",
                                  "contactName":"赵六",
                                  "contactPhone":"13600000000",
                                  "contactEmail":"zhaoliu@example.com",
                                  "notes":"命令测试客户"
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
                                  "host":"10.30.30.30",
                                  "sshPort":22,
                                  "sshUsername":"ops",
                                  "sshPassword":"Ops@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["ops"],
                                  "notes":"命令主机"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        mockMvc.perform(post("/api/tasks/adhoc")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"serverId":"%s","command":"docker ps","riskConfirmed":false}
                                """.formatted(serverId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnTaskDetailsById() throws Exception {
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
                                  "name":"查询任务客户",
                                  "contactName":"赵六",
                                  "contactPhone":"13600000001",
                                  "contactEmail":"zhaoliu1@example.com",
                                  "notes":"任务详情测试客户"
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
                                  "host":"10.31.31.31",
                                  "sshPort":22,
                                  "sshUsername":"ops",
                                  "sshPassword":"Ops@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["ops"],
                                  "notes":"任务详情主机"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String taskId = JsonPath.read(mockMvc.perform(post("/api/tasks/adhoc")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"serverId":"%s","command":"docker ps","riskConfirmed":true}
                                """.formatted(serverId)))
                .andExpect(status().isAccepted())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/tasks/{taskId}", taskId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(taskId))
                .andExpect(jsonPath("$.data.taskType").value("ADHOC_COMMAND"))
                .andExpect(jsonPath("$.data.commandInput").value("docker ps"));
    }

    @Test
    void shouldStreamTaskEventsById() throws Exception {
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
                                  "name":"流式任务客户",
                                  "contactName":"钱八",
                                  "contactPhone":"13600000002",
                                  "contactEmail":"qianba@example.com",
                                  "notes":"任务流测试客户"
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
                                  "host":"10.32.32.32",
                                  "sshPort":22,
                                  "sshUsername":"ops",
                                  "sshPassword":"Ops@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["ops"],
                                  "notes":"任务流主机"
                                }
                                """.formatted(customerId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        String taskId = JsonPath.read(mockMvc.perform(post("/api/tasks/adhoc")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"serverId":"%s","command":"docker ps","riskConfirmed":true}
                                """.formatted(serverId)))
                .andExpect(status().isAccepted())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        operationTaskService.execute(UUID.fromString(taskId));

        MvcResult mvcResult = mockMvc.perform(get("/api/tasks/{taskId}/events", taskId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(request().asyncStarted())
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = waitForResponseBody(mvcResult, "event:task");
        assertThat(mvcResult.getResponse().getContentType()).contains(MediaType.TEXT_EVENT_STREAM_VALUE);
        assertThat(responseBody)
                .contains("event:task")
                .contains(taskId)
                .contains("SUCCESS")
                .contains("docker ps");
    }

    @Test
    void shouldCreateAuditRecordWhenDeployTriggered() throws Exception {
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
                                  "name":"部署客户",
                                  "contactName":"陈七",
                                  "contactPhone":"13500000000",
                                  "contactEmail":"chenqi@example.com",
                                  "notes":"部署测试客户"
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
                                  "host":"10.40.40.40",
                                  "sshPort":22,
                                  "sshUsername":"deploy",
                                  "sshPassword":"Deploy@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["deploy"],
                                  "notes":"部署主机"
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
                                  "name":"OMS 系统",
                                  "productCode":"oms-web",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/oms-web",
                                  "defaultConfig":{"APP_PORT":"8081"},
                                  "description":"OMS 模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"docker compose up -d"
                                    },
                                    {
                                      "actionType":"UPDATE",
                                      "mode":"SCRIPT",
                                      "scriptBody":"git pull && docker compose up -d"
                                    }
                                  ]
                                }
                                """))
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
                                  "instanceName":"OMS-生产",
                                  "environmentLabel":"prod",
                                  "configOverride":{"DOMAIN":"oms.example.com"},
                                  "notes":"OMS 生产实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
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
                                  "versionLabel":"v2.0.0",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/oms-web.git",
                                  "gitRef":"refs/tags/v2.0.0",
                                  "changelog":"第二个版本"
                                }
                                """.formatted(templateId)))
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

        assertThat(auditLogRepository.count()).isGreaterThan(0);
    }

    @Test
    void shouldCreateAuditRecordWhenUpdateTriggered() throws Exception {
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
                                  "name":"更新客户",
                                  "contactName":"周八",
                                  "contactPhone":"13400000000",
                                  "contactEmail":"zhouba@example.com",
                                  "notes":"更新测试客户"
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
                                  "host":"10.50.50.50",
                                  "sshPort":22,
                                  "sshUsername":"update",
                                  "sshPassword":"Update@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["update"],
                                  "notes":"更新主机"
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
                                  "name":"WMS 系统",
                                  "productCode":"wms-web",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/wms-web",
                                  "defaultConfig":{"APP_PORT":"8082"},
                                  "description":"WMS 模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"./ops.sh deploy"
                                    },
                                    {
                                      "actionType":"UPDATE",
                                      "mode":"SCRIPT",
                                      "scriptBody":"./ops.sh upgrade"
                                    }
                                  ]
                                }
                                """))
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
                                  "instanceName":"WMS-生产",
                                  "environmentLabel":"prod",
                                  "configOverride":{"DOMAIN":"wms.example.com"},
                                  "notes":"WMS 生产实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
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
                                  "versionLabel":"v3.0.0",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/wms-web.git",
                                  "gitRef":"refs/tags/v3.0.0",
                                  "changelog":"第三个版本"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        mockMvc.perform(post("/api/tasks/update")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"%s","releaseId":"%s"}
                                """.formatted(instanceId, releaseId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.taskNumber").isString())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        assertThat(auditLogRepository.count()).isGreaterThan(0);
    }

    @Test
    void shouldCreateAuditRecordWhenBackupRollbackAndVerifyTriggered() throws Exception {
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
                                  "name":"交付客户",
                                  "contactName":"吴九",
                                  "contactPhone":"13300000000",
                                  "contactEmail":"wujiu@example.com",
                                  "notes":"交付动作客户"
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
                                  "host":"10.60.60.60",
                                  "sshPort":22,
                                  "sshUsername":"delivery",
                                  "sshPassword":"Delivery@12345",
                                  "osLabel":"Ubuntu 22.04",
                                  "tags":["delivery"],
                                  "notes":"交付动作主机"
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
                                  "name":"交付系统",
                                  "productCode":"delivery-platform",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/delivery-platform",
                                  "defaultConfig":{"APP_PORT":"8090"},
                                  "description":"交付平台模板",
                                  "actions":[
                                    {
                                      "actionType":"BACKUP",
                                      "mode":"SCRIPT",
                                      "scriptBody":"./ops.sh backup"
                                    },
                                    {
                                      "actionType":"ROLLBACK",
                                      "mode":"SCRIPT",
                                      "scriptBody":"./ops.sh rollback"
                                    },
                                    {
                                      "actionType":"VERIFY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"./ops.sh verify"
                                    }
                                  ]
                                }
                                """))
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
                                  "instanceName":"交付实例",
                                  "environmentLabel":"prod",
                                  "configOverride":{"DOMAIN":"delivery.example.com"},
                                  "notes":"交付实例"
                                }
                                """.formatted(customerId, templateId, serverId)))
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
                                  "versionLabel":"v4.0.0",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/delivery-platform.git",
                                  "gitRef":"refs/tags/v4.0.0",
                                  "changelog":"第四个版本"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(), "$.data.id");

        mockMvc.perform(post("/api/tasks/backup")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"%s"}
                                """.formatted(instanceId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        mockMvc.perform(post("/api/tasks/rollback")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"%s","releaseId":"%s"}
                                """.formatted(instanceId, releaseId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        mockMvc.perform(post("/api/tasks/verify")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"%s"}
                                """.formatted(instanceId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        assertThat(auditLogRepository.count()).isGreaterThan(0);
    }

    private String waitForResponseBody(MvcResult mvcResult, String expectedFragment) throws Exception {
        String responseBody = "";
        for (int attempt = 0; attempt < 20; attempt++) {
            responseBody = mvcResult.getResponse().getContentAsString();
            if (responseBody.contains(expectedFragment)) {
                return responseBody;
            }
            Thread.sleep(100L);
        }
        return responseBody;
    }
}
