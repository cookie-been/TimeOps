CREATE TABLE operation_task (
    id UUID PRIMARY KEY,
    task_number VARCHAR(50) NOT NULL UNIQUE,
    task_type VARCHAR(30) NOT NULL,
    target_server_id UUID,
    target_instance_id UUID,
    template_action_id UUID,
    release_id UUID,
    initiator_user_id UUID NOT NULL,
    command_input TEXT,
    status VARCHAR(20) NOT NULL,
    output_log TEXT,
    error_log TEXT,
    exit_code INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_operation_task_target_server FOREIGN KEY (target_server_id) REFERENCES managed_server (id),
    CONSTRAINT fk_operation_task_target_instance FOREIGN KEY (target_instance_id) REFERENCES deployment_instance (id),
    CONSTRAINT fk_operation_task_template_action FOREIGN KEY (template_action_id) REFERENCES template_action (id),
    CONSTRAINT fk_operation_task_release FOREIGN KEY (release_id) REFERENCES product_release (id),
    CONSTRAINT fk_operation_task_initiator_user FOREIGN KEY (initiator_user_id) REFERENCES app_user (id)
);

CREATE INDEX idx_operation_task_status_created_at ON operation_task (status, created_at);
