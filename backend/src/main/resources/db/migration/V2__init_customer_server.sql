CREATE TABLE customer (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE managed_server (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    host VARCHAR(255) NOT NULL,
    ssh_port INTEGER NOT NULL,
    ssh_username VARCHAR(100) NOT NULL,
    ssh_password_cipher TEXT NOT NULL,
    os_label VARCHAR(100),
    tags TEXT NOT NULL DEFAULT '[]',
    connectivity_status VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_managed_server_customer FOREIGN KEY (customer_id) REFERENCES customer (id)
);

CREATE INDEX idx_managed_server_customer_id ON managed_server (customer_id);
