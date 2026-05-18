CREATE TABLE product_template (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    supported_release_sources TEXT NOT NULL DEFAULT '[]',
    default_work_dir VARCHAR(255),
    default_config TEXT NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_product_template_code UNIQUE (product_code)
);

CREATE TABLE template_action (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    script_body TEXT,
    step_definition TEXT,
    execution_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_template_action_template FOREIGN KEY (template_id) REFERENCES product_template (id)
);

CREATE INDEX idx_template_action_template_id ON template_action (template_id);

CREATE TABLE product_release (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    version_label VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    repository_url VARCHAR(500),
    git_ref VARCHAR(255),
    package_uri VARCHAR(500),
    changelog TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_release_template FOREIGN KEY (template_id) REFERENCES product_template (id),
    CONSTRAINT fk_product_release_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)
);

CREATE INDEX idx_product_release_template_id ON product_release (template_id);
