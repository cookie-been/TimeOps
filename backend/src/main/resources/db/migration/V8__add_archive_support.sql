ALTER TABLE customer
    ADD COLUMN record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE customer
    ADD COLUMN active_key VARCHAR(500);
ALTER TABLE customer
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE customer
    ADD COLUMN archived_by UUID;
ALTER TABLE customer
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE customer
SET active_key = LOWER(TRIM(name));
ALTER TABLE customer
    ADD CONSTRAINT uk_customer_active_key UNIQUE (active_key);

ALTER TABLE managed_server
    ADD COLUMN record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE managed_server
    ADD COLUMN active_key VARCHAR(500);
ALTER TABLE managed_server
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE managed_server
    ADD COLUMN archived_by UUID;
ALTER TABLE managed_server
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE managed_server
SET active_key = LOWER(TRIM(host)) || ':' || CAST(ssh_port AS VARCHAR);
ALTER TABLE managed_server
    ADD CONSTRAINT uk_managed_server_active_key UNIQUE (active_key);

ALTER TABLE product_template
    DROP CONSTRAINT uk_product_template_code;
ALTER TABLE product_template
    ADD COLUMN record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE product_template
    ADD COLUMN active_key VARCHAR(500);
ALTER TABLE product_template
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_template
    ADD COLUMN archived_by UUID;
ALTER TABLE product_template
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE product_template
SET active_key = LOWER(TRIM(product_code));
ALTER TABLE product_template
    ADD CONSTRAINT uk_product_template_active_key UNIQUE (active_key);

ALTER TABLE product_release
    ADD COLUMN record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE product_release
    ADD COLUMN active_key VARCHAR(500);
ALTER TABLE product_release
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_release
    ADD COLUMN archived_by UUID;
ALTER TABLE product_release
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE product_release
SET active_key = LOWER(CAST(template_id AS VARCHAR) || ':' || TRIM(version_label));
ALTER TABLE product_release
    ADD CONSTRAINT uk_product_release_active_key UNIQUE (active_key);

ALTER TABLE deployment_instance
    ADD COLUMN record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE deployment_instance
    ADD COLUMN active_key VARCHAR(500);
ALTER TABLE deployment_instance
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE deployment_instance
    ADD COLUMN archived_by UUID;
ALTER TABLE deployment_instance
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE deployment_instance
SET active_key = LOWER(CAST(customer_id AS VARCHAR) || ':' || TRIM(instance_name));
ALTER TABLE deployment_instance
    ADD CONSTRAINT uk_deployment_instance_active_key UNIQUE (active_key);
