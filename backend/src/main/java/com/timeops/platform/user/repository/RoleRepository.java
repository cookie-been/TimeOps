package com.timeops.platform.user.repository;

import com.timeops.platform.user.RoleCode;
import com.timeops.platform.user.RoleEntity;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {

    Optional<RoleEntity> findByRoleCode(RoleCode roleCode);
}
