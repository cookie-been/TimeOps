package com.timeops.platform.customer;

import com.timeops.platform.customer.dto.CustomerCreateRequest;
import com.timeops.platform.customer.dto.CustomerResponse;
import com.timeops.platform.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerCreateRequest customerCreateRequest) {
        CustomerEntity customerEntity = new CustomerEntity(
                customerCreateRequest.name(),
                customerCreateRequest.contactName(),
                customerCreateRequest.contactPhone(),
                customerCreateRequest.contactEmail(),
                customerCreateRequest.notes()
        );
        CustomerEntity savedCustomer = customerRepository.save(customerEntity);
        return new CustomerResponse(
                savedCustomer.getId(),
                savedCustomer.getName(),
                savedCustomer.getContactName(),
                savedCustomer.getContactPhone(),
                savedCustomer.getContactEmail(),
                savedCustomer.getNotes()
        );
    }
}
