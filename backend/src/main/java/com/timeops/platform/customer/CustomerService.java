package com.timeops.platform.customer;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.customer.dto.CustomerCreateRequest;
import com.timeops.platform.customer.dto.CustomerResponse;
import com.timeops.platform.customer.dto.CustomerUpdateRequest;
import com.timeops.platform.customer.repository.CustomerRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.server.repository.ServerRepository;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final ServerRepository serverRepository;
    private final DeploymentInstanceRepository deploymentInstanceRepository;

    public CustomerService(
            CustomerRepository customerRepository,
            ServerRepository serverRepository,
            DeploymentInstanceRepository deploymentInstanceRepository) {
        this.customerRepository = customerRepository;
        this.serverRepository = serverRepository;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> listCustomers(RecordStatusFilter recordStatusFilter) {
        return loadCustomers(recordStatusFilter).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomer(UUID customerId) {
        return toResponse(findCustomer(customerId));
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerCreateRequest customerCreateRequest) {
        ensureActiveKeyAvailable(CustomerEntity.buildActiveKey(customerCreateRequest.name()), null);
        CustomerEntity customerEntity = new CustomerEntity(
                customerCreateRequest.name(),
                customerCreateRequest.contactName(),
                customerCreateRequest.contactPhone(),
                customerCreateRequest.contactEmail(),
                customerCreateRequest.notes()
        );
        CustomerEntity savedCustomer = customerRepository.save(customerEntity);
        return toResponse(savedCustomer);
    }

    @Transactional
    public CustomerResponse updateCustomer(UUID customerId, CustomerUpdateRequest customerUpdateRequest) {
        CustomerEntity customerEntity = findCustomer(customerId);
        requireActive(customerEntity, "customer is archived");
        String activeKey = CustomerEntity.buildActiveKey(customerUpdateRequest.name());
        ensureActiveKeyAvailable(activeKey, customerEntity.getActiveKey());
        customerEntity.update(
                customerUpdateRequest.name(),
                customerUpdateRequest.contactName(),
                customerUpdateRequest.contactPhone(),
                customerUpdateRequest.contactEmail(),
                customerUpdateRequest.notes());
        return toResponse(customerEntity);
    }

    @Transactional
    public CustomerResponse archiveCustomer(UUID customerId, UUID actorUserId) {
        CustomerEntity customerEntity = findCustomer(customerId);
        requireActive(customerEntity, "customer is already archived");
        if (serverRepository.existsByCustomerIdAndRecordStatus(customerId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "customer has active servers");
        }
        if (deploymentInstanceRepository.existsByCustomerIdAndRecordStatus(customerId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "customer has active instances");
        }
        customerEntity.archive(actorUserId);
        return toResponse(customerEntity);
    }

    @Transactional
    public CustomerResponse restoreCustomer(UUID customerId) {
        CustomerEntity customerEntity = findCustomer(customerId);
        if (customerEntity.getRecordStatus() == RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer is already active");
        }
        String activeKey = CustomerEntity.buildActiveKey(customerEntity.getName());
        ensureActiveKeyAvailable(activeKey, null);
        customerEntity.restore(activeKey);
        return toResponse(customerEntity);
    }

    private CustomerResponse toResponse(CustomerEntity customerEntity) {
        return new CustomerResponse(
                customerEntity.getId(),
                customerEntity.getName(),
                customerEntity.getContactName(),
                customerEntity.getContactPhone(),
                customerEntity.getContactEmail(),
                customerEntity.getNotes(),
                customerEntity.getRecordStatus().name(),
                customerEntity.getArchivedAt()
        );
    }

    private List<CustomerEntity> loadCustomers(RecordStatusFilter recordStatusFilter) {
        return switch (recordStatusFilter) {
            case ALL -> customerRepository.findAllByOrderByCreatedAtDesc();
            case ACTIVE -> customerRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ACTIVE);
            case ARCHIVED -> customerRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ARCHIVED);
        };
    }

    private CustomerEntity findCustomer(UUID customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "customer does not exist"));
    }

    private void ensureActiveKeyAvailable(String activeKey, String currentActiveKey) {
        if (activeKey.equals(currentActiveKey)) {
            return;
        }
        if (customerRepository.existsByActiveKey(activeKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "customer name already exists");
        }
    }

    private void requireActive(CustomerEntity customerEntity, String message) {
        if (customerEntity.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }
}
