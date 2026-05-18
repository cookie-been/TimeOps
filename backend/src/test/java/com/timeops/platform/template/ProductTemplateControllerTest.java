package com.timeops.platform.template;

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
class ProductTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateTemplateWithDeployAction() throws Exception {
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

        mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"官网系统",
                                  "productCode":"site-web",
                                  "supportedReleaseSources":["GIT","PACKAGE"],
                                  "defaultWorkDir":"/opt/site-web",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "description":"官网产品模板",
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
                .andExpect(jsonPath("$.data.name").value("官网系统"))
                .andExpect(jsonPath("$.data.productCode").value("site-web"));
    }

    @Test
    void shouldUpdateArchiveAndRestoreTemplate() throws Exception {
        String accessToken = login();

        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"官网系统",
                                  "productCode":"site-web-archive",
                                  "supportedReleaseSources":["GIT","PACKAGE"],
                                  "defaultWorkDir":"/opt/site-web",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "description":"官网产品模板",
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

        mockMvc.perform(put("/api/templates/{templateId}", templateId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"官网系统新模板",
                                  "productCode":"site-web-new",
                                  "supportedReleaseSources":["PACKAGE"],
                                  "defaultWorkDir":"/srv/site-web",
                                  "defaultConfig":{"APP_PORT":"9090"},
                                  "description":"更新后的模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"echo deploy"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productCode").value("site-web-new"))
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(patch("/api/templates/{templateId}/archive", templateId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordStatus").value("ARCHIVED"));

        mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"替代模板",
                                  "productCode":"site-web-new",
                                  "supportedReleaseSources":["PACKAGE"],
                                  "defaultWorkDir":"/srv/reused",
                                  "defaultConfig":{"APP_PORT":"8081"},
                                  "description":"复用编码",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"echo deploy"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/templates/{templateId}/restore", templateId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldPersistStepActionDefinitionOnUpdate() throws Exception {
        String accessToken = login();

        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"交付模板",
                                  "productCode":"delivery-step-template",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/srv/delivery",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "description":"交付模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"SCRIPT",
                                      "scriptBody":"echo deploy"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String templateId = JsonPath.read(templateResponse, "$.data.id");

        mockMvc.perform(put("/api/templates/{templateId}", templateId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"交付模板",
                                  "productCode":"delivery-step-template",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/srv/delivery",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "description":"STEP 更新模板",
                                  "actions":[
                                    {
                                      "actionType":"DEPLOY",
                                      "mode":"STEP",
                                      "stepDefinition":{
                                        "script":"./ops/deploy.sh",
                                        "useMergedConfigEnv":true,
                                        "useReleaseVersion":true
                                      }
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.actions[0].actionType").value("DEPLOY"))
                .andExpect(jsonPath("$.data.actions[0].mode").value("STEP"))
                .andExpect(jsonPath("$.data.actions[0].stepDefinition.script").value("./ops/deploy.sh"))
                .andExpect(jsonPath("$.data.actions[0].stepDefinition.useMergedConfigEnv").value(true))
                .andExpect(jsonPath("$.data.actions[0].stepDefinition.useReleaseVersion").value(true));
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
}
