package com.timeops.platform.server.repository;

import com.timeops.platform.server.ServerEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServerRepository extends JpaRepository<ServerEntity, UUID> {
}
