-- AI Medical Device Compliance Manager - Database Schema
-- PostgreSQL

DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS calibration_records CASCADE;
DROP TABLE IF EXISTS change_controls CASCADE;
DROP TABLE IF EXISTS nonconformance_reports CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS training_records CASCADE;
DROP TABLE IF EXISTS capa_records CASCADE;
DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS compliance_checklists CASCADE;
DROP TABLE IF EXISTS regulatory_standards CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'auditor', 'manager', 'viewer')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Devices
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    serial_number VARCHAR(255),
    device_class VARCHAR(10) CHECK (device_class IN ('I', 'II', 'III')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'recalled', 'pending')),
    description TEXT,
    department VARCHAR(255),
    installation_date DATE,
    last_inspection DATE,
    next_inspection DATE,
    fda_clearance_number VARCHAR(255),
    ce_marking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Regulatory Standards
CREATE TABLE regulatory_standards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('safety', 'quality', 'performance', 'labeling', 'biocompatibility')),
    authority VARCHAR(50) CHECK (authority IN ('FDA', 'EU', 'ISO', 'IEC')),
    version VARCHAR(50),
    effective_date DATE,
    description TEXT,
    requirements TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'superseded')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Compliance Checklists
CREATE TABLE compliance_checklists (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    standard_id INTEGER REFERENCES regulatory_standards(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('compliant', 'non_compliant', 'pending', 'in_progress', 'not_applicable')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to VARCHAR(255),
    due_date DATE,
    evidence TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255),
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) CHECK (document_type IN ('SOP', 'DHF', 'DMR', 'protocol', 'report', 'certificate', 'manual')),
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'obsolete')),
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    standard_id INTEGER REFERENCES regulatory_standards(id) ON DELETE SET NULL,
    file_path VARCHAR(500),
    description TEXT,
    author VARCHAR(255),
    approved_by VARCHAR(255),
    approved_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Risk Assessments
CREATE TABLE risk_assessments (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    hazard VARCHAR(255) NOT NULL,
    risk_category VARCHAR(100) CHECK (risk_category IN ('safety', 'performance', 'usability', 'cybersecurity', 'biocompatibility')),
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    probability INTEGER CHECK (probability BETWEEN 1 AND 5),
    risk_level VARCHAR(50),
    mitigation TEXT,
    residual_risk_level VARCHAR(50),
    status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'mitigated', 'accepted', 'monitoring')),
    assigned_to VARCHAR(255),
    review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. CAPA Records
CREATE TABLE capa_records (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('corrective', 'preventive')),
    source VARCHAR(50) CHECK (source IN ('audit', 'complaint', 'ncr', 'inspection', 'internal')),
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    description TEXT,
    root_cause TEXT,
    action_plan TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigation', 'implementation', 'verification', 'closed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to VARCHAR(255),
    due_date DATE,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Training Records
CREATE TABLE training_records (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_id_str VARCHAR(100),
    department VARCHAR(255),
    course_name VARCHAR(255) NOT NULL,
    course_type VARCHAR(50) CHECK (course_type IN ('regulatory', 'quality', 'safety', 'technical', 'gmp')),
    trainer VARCHAR(255),
    training_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('completed', 'scheduled', 'overdue', 'in_progress')),
    score INTEGER,
    certificate_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Suppliers
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    category VARCHAR(50) CHECK (category IN ('raw_material', 'component', 'service', 'equipment', 'software')),
    qualification_status VARCHAR(50) DEFAULT 'pending' CHECK (qualification_status IN ('qualified', 'conditional', 'disqualified', 'pending')),
    iso_certified BOOLEAN DEFAULT FALSE,
    last_audit_date DATE,
    next_audit_date DATE,
    risk_rating VARCHAR(50) CHECK (risk_rating IN ('low', 'medium', 'high')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. Nonconformance Reports
CREATE TABLE nonconformance_reports (
    id SERIAL PRIMARY KEY,
    ncr_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    category VARCHAR(50) CHECK (category IN ('product', 'process', 'supplier', 'documentation', 'equipment')),
    severity VARCHAR(50) CHECK (severity IN ('critical', 'major', 'minor')),
    description TEXT,
    investigation TEXT,
    disposition VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigation', 'disposition', 'closed')),
    reported_by VARCHAR(255),
    assigned_to VARCHAR(255),
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Change Controls
CREATE TABLE change_controls (
    id SERIAL PRIMARY KEY,
    change_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) CHECK (change_type IN ('design', 'process', 'document', 'supplier', 'software')),
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    description TEXT,
    justification TEXT,
    impact_assessment TEXT,
    status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'review', 'approved', 'implementation', 'closed', 'rejected')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    requested_by VARCHAR(255),
    approved_by VARCHAR(255),
    implementation_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Calibration Records
CREATE TABLE calibration_records (
    id SERIAL PRIMARY KEY,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_id_str VARCHAR(100),
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    calibration_type VARCHAR(50) CHECK (calibration_type IN ('initial', 'periodic', 'after_repair', 'verification')),
    calibration_date DATE,
    next_calibration_date DATE,
    performed_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'calibrated' CHECK (status IN ('calibrated', 'out_of_tolerance', 'due', 'overdue')),
    standard_used VARCHAR(255),
    results TEXT,
    certificate_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. AI Analyses
CREATE TABLE ai_analyses (
    id SERIAL PRIMARY KEY,
    analysis_type VARCHAR(100) CHECK (analysis_type IN ('compliance', 'risk', 'gap', 'document_review', 'audit_report')),
    entity_type VARCHAR(255),
    entity_id INTEGER,
    prompt TEXT,
    result TEXT,
    model_used VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
