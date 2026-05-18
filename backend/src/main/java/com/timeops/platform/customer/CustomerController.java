package com.timeops.platform.customer;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.customer.dto.CustomerCreateRequest;
import com.timeops.platform.customer.dto.CustomerResponse;
import com.timeops.platform.customer.dto.CustomerUpdateRequest;
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
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public CustomerController(
            CustomerService customerService,
            AuditService auditService,
            CurrentUserProvider currentUserProvider) {
        this.customerService = customerService;
        this.auditService = auditService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER_READ')")
    public ApiResponse<List<CustomerResponse>> listCustomers(
            @RequestParam(name = "status", defaultValue = "ACTIVE") String status) {
        return ApiResponse.ok(customerService.listCustomers(RecordStatusFilter.fromText(status)));
    }

    @GetMapping("/{customerId}")
    @PreAuthorize("hasAuthority('CUSTOMER_READ')")
    public ApiResponse<CustomerResponse> getCustomer(@PathVariable UUID customerId) {
        return ApiResponse.ok(customerService.getCustomer(customerId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CUSTOMER_WRITE')")
    public ApiResponse<CustomerResponse> createCustomer(@Valid @RequestBody CustomerCreateRequest customerCreateRequest) {
        CustomerResponse customerResponse = customerService.createCustomer(customerCreateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "CUSTOMER_CREATED",
                "CUSTOMER",
                customerResponse.id().toString(),
                null,
                Map.of("name", customerResponse.name()));
        return ApiResponse.ok(customerResponse);
    }

    @PutMapping("/{customerId}")
    @PreAuthorize("hasAuthority('CUSTOMER_WRITE')")
    public ApiResponse<CustomerResponse> updateCustomer(
            @PathVariable UUID customerId,
            @Valid @RequestBody CustomerUpdateRequest customerUpdateRequest) {
        CustomerResponse customerResponse = customerService.updateCustomer(customerId, customerUpdateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "CUSTOMER_UPDATED",
                "CUSTOMER",
                customerResponse.id().toString(),
                null,
                Map.of("name", customerResponse.name()));
        return ApiResponse.ok(customerResponse);
    }

    @PatchMapping("/{customerId}/archive")
    @PreAuthorize("hasAuthority('CUSTOMER_WRITE')")
    public ApiResponse<CustomerResponse> archiveCustomer(@PathVariable UUID customerId) {
        CustomerResponse customerResponse = customerService.archiveCustomer(customerId, currentUserProvider.currentUserId());
        auditService.record(
                currentUserProvider.currentUserId(),
                "CUSTOMER_ARCHIVED",
                "CUSTOMER",
                customerResponse.id().toString(),
                null,
                Map.of("recordStatus", customerResponse.recordStatus()));
        return ApiResponse.ok(customerResponse);
    }

    @PostMapping("/{customerId}/restore")
    @PreAuthorize("hasAuthority('CUSTOMER_WRITE')")
    public ApiResponse<CustomerResponse> restoreCustomer(@PathVariable UUID customerId) {
        CustomerResponse customerResponse = customerService.restoreCustomer(customerId);
        auditService.record(
                currentUserProvider.currentUserId(),
                "CUSTOMER_RESTORED",
                "CUSTOMER",
                customerResponse.id().toString(),
                null,
                Map.of("recordStatus", customerResponse.recordStatus()));
        return ApiResponse.ok(customerResponse);
    }
}
