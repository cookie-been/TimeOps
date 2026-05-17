CREATE TABLE app_role (
    id UUID PRIMARY KEY,
    role_code VARCHAR(64) NOT NULL UNIQUE,
    role_name VARCHAR(128) NOT NULL
);

CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_user_role (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_app_user_role_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT fk_app_user_role_role FOREIGN KEY (role_id) REFERENCES app_role (id)
);

INSERT INTO app_role (id, role_code, role_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', '超级管理员');

INSERT INTO app_user (id, username, display_name, password_hash, enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', '系统管理员', '${initial-admin-password-hash}', TRUE);

INSERT INTO app_user_role (user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
