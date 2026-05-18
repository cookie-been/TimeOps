package com.timeops.platform.user;

import com.timeops.platform.user.dto.RoleOptionResponse;
import com.timeops.platform.user.dto.UserSummaryResponse;
import com.timeops.platform.user.repository.RoleRepository;
import com.timeops.platform.user.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoleOptionResponse> listRoles() {
        return roleRepository.findAll().stream()
                .map(roleEntity -> new RoleOptionResponse(
                        roleEntity.getRoleCode().name(),
                        roleEntity.getRoleName()))
                .toList();
    }

    @Transactional
    public UserSummaryResponse createUser(
            String username,
            String displayName,
            String password,
            List<String> roleCodes,
            boolean enabled) {
        userRepository.findByUsername(username).ifPresent(userEntity -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username already exists");
        });
        UserEntity userEntity = new UserEntity(
                UUID.randomUUID(),
                username,
                displayName,
                passwordEncoder.encode(password),
                enabled,
                resolveRoles(roleCodes));
        return toSummaryResponse(userRepository.save(userEntity));
    }

    @Transactional
    public UserSummaryResponse updateUserRoles(UUID userId, List<String> roleCodes) {
        UserEntity userEntity = findUser(userId);
        userEntity.replaceRoles(resolveRoles(roleCodes));
        return toSummaryResponse(userEntity);
    }

    @Transactional
    public UserSummaryResponse updateUserStatus(UUID userId, boolean enabled) {
        UserEntity userEntity = findUser(userId);
        userEntity.changeEnabled(enabled);
        return toSummaryResponse(userEntity);
    }

    private UserEntity findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
    }

    private LinkedHashSet<RoleEntity> resolveRoles(List<String> roleCodes) {
        LinkedHashSet<RoleEntity> resolvedRoles = new LinkedHashSet<>();
        for (String roleCodeText : roleCodes) {
            RoleCode roleCode;
            try {
                roleCode = RoleCode.valueOf(roleCodeText);
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid role code: " + roleCodeText);
            }
            RoleEntity roleEntity = roleRepository.findByRoleCode(roleCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "role not found: " + roleCodeText));
            resolvedRoles.add(roleEntity);
        }
        if (resolvedRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roleCodes must not be empty");
        }
        return resolvedRoles;
    }

    private UserSummaryResponse toSummaryResponse(UserEntity userEntity) {
        return new UserSummaryResponse(
                userEntity.getId(),
                userEntity.getUsername(),
                userEntity.getDisplayName(),
                userEntity.getRoles().stream()
                        .map(roleEntity -> roleEntity.getRoleCode().name())
                        .toList(),
                userEntity.isEnabled());
    }
}
