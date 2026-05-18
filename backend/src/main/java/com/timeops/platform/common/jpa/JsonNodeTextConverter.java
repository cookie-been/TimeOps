package com.timeops.platform.common.jpa;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class JsonNodeTextConverter implements AttributeConverter<JsonNode, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(JsonNode attribute) {
        if (attribute == null) {
            return "{}";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to serialize json node", exception);
        }
    }

    @Override
    public JsonNode convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return OBJECT_MAPPER.createObjectNode();
        }
        try {
            return OBJECT_MAPPER.readTree(dbData);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to deserialize json node", exception);
        }
    }
}
