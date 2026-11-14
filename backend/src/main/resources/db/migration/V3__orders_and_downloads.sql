-- V3: Academic Orders, Download Tokens, and DMCA Attribution / Protection

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_reference VARCHAR(40) NOT NULL UNIQUE,
  user_id BIGINT,
  project_id BIGINT NOT NULL,
  package_type VARCHAR(40) NOT NULL,
  amount_inr DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  payment_gateway VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY',
  gateway_order_id VARCHAR(100),
  gateway_payment_id VARCHAR(100),
  student_name VARCHAR(120) NOT NULL,
  student_email VARCHAR(190) NOT NULL,
  student_phone VARCHAR(30),
  student_college VARCHAR(160),
  notes TEXT,
  paid_at DATETIME(6),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_order_status (status, created_at),
  KEY idx_order_email (student_email),
  KEY idx_order_user (user_id),
  CONSTRAINT fk_ord_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ord_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TABLE order_downloads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  download_token VARCHAR(80) NOT NULL UNIQUE,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size_bytes BIGINT,
  download_count INT NOT NULL DEFAULT 0,
  max_downloads INT NOT NULL DEFAULT 10,
  expires_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_od_token (download_token),
  KEY idx_od_order (order_id),
  CONSTRAINT fk_od_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE dmca_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  project_id BIGINT,
  claimant_name VARCHAR(120) NOT NULL,
  claimant_email VARCHAR(190) NOT NULL,
  original_work_url VARCHAR(500) NOT NULL,
  claim_type VARCHAR(40) NOT NULL DEFAULT 'ATTRIBUTION',
  statement TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  admin_notes TEXT,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_dmca_status (status, created_at),
  CONSTRAINT fk_dmca_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

