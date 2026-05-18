package com.timeops.platform.release;

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
class ReleaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateGitRelease() throws Exception {
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

        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"管理后台",
                                  "productCode":"admin-web",
                                  "supportedReleaseSources":["GIT"],
                                  "defaultWorkDir":"/opt/admin-web",
                                  "defaultConfig":{"APP_ENV":"prod"},
                                  "description":"管理后台模板",
                                  "actions":[
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
                .getContentAsString();

        String templateId = JsonPath.read(templateResponse, "$.data.id");

        mockMvc.perform(post("/api/releases")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "templateId":"%s",
                                  "versionLabel":"v1.0.0",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/admin-web.git",
                                  "gitRef":"refs/tags/v1.0.0",
                                  "changelog":"首个正式版本"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.versionLabel").value("v1.0.0"))
                .andExpect(jsonPath("$.data.sourceType").value("GIT"));
    }

    @Test
    void shouldUpdateArchiveAndRestoreRelease() throws Exception {
        String accessToken = login();
        String templateId = createTemplate(accessToken, "release-tpl");

        String releaseResponse = mockMvc.perform(post("/api/releases")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "templateId":"%s",
                                  "versionLabel":"v2.0.0",
                                  "sourceType":"GIT",
                                  "repositoryUrl":"https://example.com/release.git",
                                  "gitRef":"refs/tags/v2.0.0",
                                  "changelog":"版本 2.0.0"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String releaseId = JsonPath.read(releaseResponse, "$.data.id");

        mockMvc.perform(put("/api/releases/{releaseId}", releaseId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "templateId":"%s",
                                  "versionLabel":"v2.0.1",
                                  "sourceType":"PACKAGE",
                                  "packageUri":"https://example.com/release-v2.0.1.tar.gz",
                                  "changelog":"版本 2.0.1"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.versionLabel").value("v2.0.1"))
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(patch("/api/releases/{releaseId}/archive", releaseId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordStatus").value("ARCHIVED"));

        mockMvc.perform(post("/api/releases")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "templateId":"%s",
                                  "versionLabel":"v2.0.1",
                                  "sourceType":"PACKAGE",
                                  "packageUri":"https://example.com/release-v2.0.1-reused.tar.gz",
                                  "changelog":"复用版本号"
                                }
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/releases/{releaseId}/restore", releaseId)
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

    private String createTemplate(String accessToken, String productCode) throws Exception {
        String templateResponse = mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"管理后台",
                                  "productCode":"%s",
                                  "supportedReleaseSources":["GIT","PACKAGE"],
                                  "defaultWorkDir":"/opt/admin-web",
                                  "defaultConfig":{"APP_ENV":"prod"},
                                  "description":"管理后台模板",
                                  "actions":[
                                    {
                                      "actionType":"UPDATE",
                                      "mode":"SCRIPT",
                                      "scriptBody":"git pull && docker compose up -d"
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
