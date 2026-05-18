package com.timeops.platform.customer;

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
class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldUpdateArchiveAndRestoreCustomerWithStatusFiltering() throws Exception {
        String accessToken = login();

        String createdCustomerResponse = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"华东制造集团",
                                  "contactName":"张敏",
                                  "contactPhone":"13800001234",
                                  "contactEmail":"zhangmin@example.com",
                                  "notes":"年度维保客户"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String customerId = JsonPath.read(createdCustomerResponse, "$.data.id");

        mockMvc.perform(put("/api/customers/{customerId}", customerId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"华东制造集团-更新",
                                  "contactName":"张敏",
                                  "contactPhone":"13800009999",
                                  "contactEmail":"zhangmin@example.com",
                                  "notes":"已完成巡检"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("华东制造集团-更新"))
                .andExpect(jsonPath("$.data.contactPhone").value("13800009999"))
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(patch("/api/customers/{customerId}/archive", customerId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordStatus").value("ARCHIVED"));

        mockMvc.perform(get("/api/customers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + customerId + "')]").isEmpty());

        mockMvc.perform(get("/api/customers?status=ARCHIVED")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(customerId))
                .andExpect(jsonPath("$.data[0].recordStatus").value("ARCHIVED"));

        mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"华东制造集团-更新",
                                  "contactName":"李雷",
                                  "contactPhone":"13700000000",
                                  "contactEmail":"lilei@example.com",
                                  "notes":"同名替代客户"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/customers/{customerId}/restore", customerId)
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
}
