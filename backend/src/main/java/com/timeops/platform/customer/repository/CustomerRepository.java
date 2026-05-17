package com.timeops.platform.customer.repository;

import com.timeops.platform.customer.CustomerEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<CustomerEntity, UUID> {
}
