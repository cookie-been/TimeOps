package com.timeops.platform.instance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

@Service
public class InstanceConfigMergeService {

    private final ObjectMapper objectMapper;

    public InstanceConfigMergeService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ObjectNode merge(ObjectNode defaults, ObjectNode overrides) {
        ObjectNode merged = defaults == null ? objectMapper.createObjectNode() : defaults.deepCopy();
        if (overrides != null) {
            merged.setAll(overrides);
        }
        return merged;
    }
}
