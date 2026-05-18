package com.timeops.platform.instance;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

class InstanceConfigMergeServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldMergeTemplateDefaultsWithInstanceOverrides() {
        InstanceConfigMergeService instanceConfigMergeService = new InstanceConfigMergeService(objectMapper);

        ObjectNode defaults = objectMapper.createObjectNode();
        defaults.put("APP_PORT", "8080");
        defaults.put("THEME", "blue");

        ObjectNode overrides = objectMapper.createObjectNode();
        overrides.put("THEME", "green");
        overrides.put("DOMAIN", "demo.example.com");

        ObjectNode merged = instanceConfigMergeService.merge(defaults, overrides);

        assertThat(merged.get("APP_PORT").asText()).isEqualTo("8080");
        assertThat(merged.get("THEME").asText()).isEqualTo("green");
        assertThat(merged.get("DOMAIN").asText()).isEqualTo("demo.example.com");
    }
}
