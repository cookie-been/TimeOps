CREATE TABLE deployment_instance (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    template_id UUID NOT NULL,
    primary_server_id UUID NOT NULL,
    instance_name VARCHAR(200) NOT NULL,
    environment_label VARCHAR(50) NOT NULL,
    current_release_id UUID,
    status VARCHAR(30) NOT NULL,
    config_override TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deployment_instance_customer FOREIGN KEY (customer_id) REFERENCES customer (id),
    CONSTRAINT fk_deployment_instance_template FOREIGN KEY (template_id) REFERENCES product_template (id),
    CONSTRAINT fk_deployment_instance_primary_server FOREIGN KEY (primary_server_id) REFERENCES managed_server (id),
    CONSTRAINT fk_deployment_instance_current_release FOREIGN KEY (current_release_id) REFERENCES product_release (id)
);

CREATE INDEX idx_deployment_instance_customer_id ON deployment_instance (customer_id);
CREATE INDEX idx_deployment_instance_template_id ON deployment_instance (template_id);
CREATE INDEX idx_deployment_instance_primary_server_id ON deployment_instance (primary_server_id);
