package com.timeops.platform.template;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.template.dto.ProductTemplateCreateRequest;
import com.timeops.platform.template.dto.ProductTemplateResponse;
import com.timeops.platform.template.dto.ProductTemplateUpdateRequest;
import com.timeops.platform.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/templates")
public class ProductTemplateController {

    private final ProductTemplateService productTemplateService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public ProductTemplateController(
            ProductTemplateService productTemplateService,
            AuditService auditService,
            CurrentUserProvider currentUserProvider) {
        this.productTemplateService = productTemplateService;
        this.auditService = auditService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ApiResponse<List<ProductTemplateResponse>> listTemplates(
            @RequestParam(name = "status", defaultValue = "ACTIVE") String status) {
        return ApiResponse.ok(productTemplateService.listTemplates(RecordStatusFilter.fromText(status)));
    }

    @GetMapping("/{templateId}")
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ApiResponse<ProductTemplateResponse> getTemplate(@PathVariable UUID templateId) {
        return ApiResponse.ok(productTemplateService.getTemplate(templateId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('TEMPLATE_WRITE')")
    public ApiResponse<ProductTemplateResponse> createTemplate(
            @Valid @RequestBody ProductTemplateCreateRequest productTemplateCreateRequest) {
        ProductTemplateResponse productTemplateResponse = productTemplateService.createTemplate(productTemplateCreateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "TEMPLATE_CREATED",
                "TEMPLATE",
                productTemplateResponse.id().toString(),
                null,
                Map.of("productCode", productTemplateResponse.productCode()));
        return ApiResponse.ok(productTemplateResponse);
    }

    @PutMapping("/{templateId}")
    @PreAuthorize("hasAuthority('TEMPLATE_WRITE')")
    public ApiResponse<ProductTemplateResponse> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody ProductTemplateUpdateRequest productTemplateUpdateRequest) {
        ProductTemplateResponse productTemplateResponse =
                productTemplateService.updateTemplate(templateId, productTemplateUpdateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "TEMPLATE_UPDATED",
                "TEMPLATE",
                productTemplateResponse.id().toString(),
                null,
                Map.of("productCode", productTemplateResponse.productCode()));
        return ApiResponse.ok(productTemplateResponse);
    }

    @PatchMapping("/{templateId}/archive")
    @PreAuthorize("hasAuthority('TEMPLATE_WRITE')")
    public ApiResponse<ProductTemplateResponse> archiveTemplate(@PathVariable UUID templateId) {
        ProductTemplateResponse productTemplateResponse =
                productTemplateService.archiveTemplate(templateId, currentUserProvider.currentUserId());
        auditService.record(
                currentUserProvider.currentUserId(),
                "TEMPLATE_ARCHIVED",
                "TEMPLATE",
                productTemplateResponse.id().toString(),
                null,
                Map.of("recordStatus", productTemplateResponse.recordStatus()));
        return ApiResponse.ok(productTemplateResponse);
    }

    @PostMapping("/{templateId}/restore")
    @PreAuthorize("hasAuthority('TEMPLATE_WRITE')")
    public ApiResponse<ProductTemplateResponse> restoreTemplate(@PathVariable UUID templateId) {
        ProductTemplateResponse productTemplateResponse = productTemplateService.restoreTemplate(templateId);
        auditService.record(
                currentUserProvider.currentUserId(),
                "TEMPLATE_RESTORED",
                "TEMPLATE",
                productTemplateResponse.id().toString(),
                null,
                Map.of("recordStatus", productTemplateResponse.recordStatus()));
        return ApiResponse.ok(productTemplateResponse);
    }
}
