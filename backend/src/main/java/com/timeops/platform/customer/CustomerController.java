package com.timeops.platform.customer;

import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.customer.dto.CustomerCreateRequest;
import com.timeops.platform.customer.dto.CustomerResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CustomerResponse> createCustomer(@Valid @RequestBody CustomerCreateRequest customerCreateRequest) {
        return ApiResponse.ok(customerService.createCustomer(customerCreateRequest));
    }
}
