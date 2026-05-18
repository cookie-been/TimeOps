CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    task_id UUID,
    detail TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_actor_user FOREIGN KEY (actor_user_id) REFERENCES app_user (id),
    CONSTRAINT fk_audit_log_task FOREIGN KEY (task_id) REFERENCES operation_task (id)
);

CREATE INDEX idx_audit_log_actor_user_id ON audit_log (actor_user_id);
CREATE INDEX idx_audit_log_task_id ON audit_log (task_id);
