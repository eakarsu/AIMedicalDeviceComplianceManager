const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Connected to database. Starting seed...');

    // Read and execute schema
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSQL);
    console.log('Schema created successfully.');

    // -------------------------------------------------------
    // 1. Users
    // -------------------------------------------------------
    const hashedPassword = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)`,
      ['admin@medcompliance.com', hashedPassword, 'Admin User', 'admin']
    );
    console.log('Users seeded.');

    // -------------------------------------------------------
    // 2. Devices (16 devices)
    // -------------------------------------------------------
    const devices = [
      ['Cardiac Pacemaker', 'Medtronic', 'MDP-5000', 'SN-PM-001', 'III', 'active', 'Implantable cardiac pacemaker with dual-chamber pacing capability', 'Cardiology', '2024-03-15', '2025-09-10', '2026-03-10', 'K203456', true],
      ['Insulin Pump', 'Tandem Diabetes', 'T-Slim X3', 'SN-IP-002', 'III', 'active', 'Continuous subcutaneous insulin infusion pump with CGM integration', 'Endocrinology', '2024-06-01', '2025-12-01', '2026-06-01', 'K194567', true],
      ['MRI Scanner', 'Siemens Healthineers', 'MAGNETOM Vida', 'SN-MR-003', 'II', 'active', '3T MRI system with advanced imaging capabilities', 'Radiology', '2023-11-20', '2025-11-20', '2026-05-20', 'K182345', true],
      ['Surgical Robot', 'Intuitive Surgical', 'da Vinci Xi', 'SN-SR-004', 'II', 'active', 'Robotic-assisted surgical system for minimally invasive procedures', 'Surgery', '2024-01-10', '2025-07-10', '2026-01-10', 'K213456', true],
      ['Hip Prosthesis', 'Smith & Nephew', 'OXINIUM System', 'SN-HP-005', 'III', 'active', 'Oxidized zirconium hip replacement implant', 'Orthopedics', '2024-04-22', '2025-10-22', '2026-04-22', 'K195678', true],
      ['Blood Glucose Monitor', 'Abbott', 'FreeStyle Libre 3', 'SN-BG-006', 'II', 'active', 'Continuous glucose monitoring system with flash technology', 'Endocrinology', '2024-08-05', '2025-08-05', '2026-02-05', 'K201234', true],
      ['Ventilator', 'Hamilton Medical', 'Hamilton-C6', 'SN-VT-007', 'II', 'active', 'Intelligent ventilation system for ICU with adaptive support', 'ICU', '2024-02-14', '2025-08-14', '2026-02-14', 'K192345', true],
      ['Defibrillator', 'Philips', 'HeartStart FR3', 'SN-DF-008', 'III', 'active', 'Automated external defibrillator with real CPR guidance', 'Emergency', '2024-05-30', '2025-11-30', '2026-05-30', 'K183456', true],
      ['Infusion Pump', 'Baxter', 'Sigma Spectrum', 'SN-IF-009', 'II', 'active', 'IV infusion pump with dose error reduction system', 'Pharmacy', '2024-07-18', '2025-07-18', '2026-01-18', 'K204567', true],
      ['Ultrasound System', 'GE Healthcare', 'LOGIQ E10s', 'SN-US-010', 'II', 'active', 'Premium ultrasound system with advanced imaging and AI tools', 'Radiology', '2024-09-01', '2025-09-01', '2026-03-01', 'K215678', true],
      ['CT Scanner', 'Canon Medical', 'Aquilion ONE PRISM', 'SN-CT-011', 'II', 'active', '320-slice CT scanner with spectral imaging capability', 'Radiology', '2023-12-05', '2025-12-05', '2026-06-05', 'K191234', true],
      ['Hearing Aid', 'Phonak', 'Audeo Paradise P90', 'SN-HA-012', 'II', 'active', 'Rechargeable hearing aid with Bluetooth connectivity', 'Audiology', '2024-10-12', '2025-10-12', '2026-04-12', 'K202345', false],
      ['Dental Implant System', 'Straumann', 'BLX Implant', 'SN-DI-013', 'II', 'active', 'Titanium-zirconium dental implant with immediate loading capability', 'Dental', '2024-03-25', '2025-09-25', '2026-03-25', 'K193456', true],
      ['Endoscope', 'Olympus', 'EVIS X1', 'SN-EN-014', 'II', 'active', 'Gastrointestinal video endoscope with narrow band imaging', 'Gastroenterology', '2024-06-15', '2025-12-15', '2026-06-15', 'K184567', true],
      ['Pulse Oximeter', 'Masimo', 'Radical-7', 'SN-PO-015', 'II', 'active', 'Bedside pulse oximetry monitor with rainbow SET technology', 'ICU', '2024-11-01', '2025-11-01', '2026-05-01', 'K205678', true],
      ['Cochlear Implant', 'Cochlear Ltd', 'Nucleus 8 Sound', 'SN-CI-016', 'III', 'pending', 'Cochlear implant sound processor with SmartSound iQ', 'ENT', '2025-01-20', null, '2025-07-20', 'K216789', true],
    ];

    for (const d of devices) {
      await client.query(
        `INSERT INTO devices (name, manufacturer, model_number, serial_number, device_class, status, description, department, installation_date, last_inspection, next_inspection, fda_clearance_number, ce_marking)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        d
      );
    }
    console.log('Devices seeded.');

    // -------------------------------------------------------
    // 3. Regulatory Standards (16 standards)
    // -------------------------------------------------------
    const standards = [
      ['ISO-13485', 'Medical Devices - Quality Management Systems', 'quality', 'ISO', '2016', '2016-03-01', 'Requirements for a comprehensive QMS for design and manufacture of medical devices', 'Documented QMS, management responsibility, resource management, product realization, measurement analysis and improvement', 'active'],
      ['ISO-14971', 'Application of Risk Management to Medical Devices', 'safety', 'ISO', '2019', '2019-12-01', 'International standard for risk management of medical devices throughout the product lifecycle', 'Risk analysis, risk evaluation, risk control, residual risk evaluation, risk management review, production and post-production', 'active'],
      ['IEC-62304', 'Medical Device Software Lifecycle Processes', 'quality', 'IEC', '2015', '2015-06-01', 'Defines lifecycle requirements for medical device software development', 'Software development planning, requirements analysis, architectural design, detailed design, implementation, integration testing, system testing, release', 'active'],
      ['FDA-21CFR820', 'Quality System Regulation', 'quality', 'FDA', '2023', '2023-02-02', 'FDA regulations governing the methods used in manufacture, packing, and storage of medical devices', 'Design controls, document controls, purchasing controls, production and process controls, CAPA, labeling, complaint handling', 'active'],
      ['EU-MDR-2017/745', 'EU Medical Device Regulation', 'safety', 'EU', '2017', '2021-05-26', 'European regulation on medical devices replacing MDD 93/42/EEC', 'Clinical evaluation, post-market surveillance, UDI system, classification rules, conformity assessment, vigilance reporting', 'active'],
      ['ISO-10993', 'Biological Evaluation of Medical Devices', 'biocompatibility', 'ISO', '2018', '2018-08-01', 'Standards for evaluating biocompatibility of medical devices', 'Cytotoxicity, sensitization, irritation, systemic toxicity, genotoxicity, implantation, hemocompatibility testing', 'active'],
      ['IEC-60601-1', 'Medical Electrical Equipment - General Safety', 'safety', 'IEC', '2020', '2020-01-01', 'General requirements for basic safety and essential performance of medical electrical equipment', 'Electrical safety, mechanical safety, radiation protection, EMC requirements, software safety, alarm systems', 'active'],
      ['ISO-14155', 'Clinical Investigation of Medical Devices', 'quality', 'ISO', '2020', '2020-07-01', 'Good clinical practice for design, conduct, recording and reporting of clinical investigations', 'Ethics committee approval, informed consent, clinical investigation plan, adverse event reporting, data management', 'active'],
      ['FDA-21CFR11', 'Electronic Records; Electronic Signatures', 'quality', 'FDA', '2003', '2003-03-20', 'Criteria for acceptance of electronic records and signatures', 'Validation, audit trails, record retention, system access controls, authority checks, device checks', 'active'],
      ['ISO-62366', 'Application of Usability Engineering', 'performance', 'ISO', '2015', '2015-02-01', 'Process for a manufacturer to analyse, specify, develop and evaluate the usability of a medical device', 'Use specification, user interface evaluation, formative evaluation, summative evaluation, usability validation', 'active'],
      ['IEC-62443', 'Industrial Communication Networks - Cybersecurity', 'safety', 'IEC', '2022', '2022-06-01', 'Cybersecurity standards for medical device industrial automation and control systems', 'Security risk assessment, security policy, access control, data integrity, event monitoring, incident response', 'active'],
      ['ISO-11135', 'Sterilization of Health-Care Products - EO', 'safety', 'ISO', '2014', '2014-07-01', 'Requirements for development, validation, and routine control of EO sterilization process', 'Process definition, qualification, validation, routine monitoring, product release, process effectiveness maintenance', 'active'],
      ['FDA-UDI', 'Unique Device Identification System', 'labeling', 'FDA', '2020', '2020-09-24', 'System to adequately identify medical devices through distribution and use', 'Device identifier, production identifier, GUDID database submission, label requirements, direct marking', 'active'],
      ['ISO-11607', 'Packaging for Terminally Sterilized Medical Devices', 'quality', 'ISO', '2019', '2019-02-01', 'Requirements and test methods for packaging of terminally sterilized medical devices', 'Material selection, sterile barrier system design, seal strength, microbial barrier, package integrity testing', 'active'],
      ['IEC-80001-1', 'Risk Management of IT Networks with Medical Devices', 'safety', 'IEC', '2021', '2021-10-01', 'Roles responsibilities and activities for risk management of IT networks incorporating medical devices', 'Risk management policy, network risk assessment, change management, configuration management, live network monitoring', 'active'],
      ['EU-IVDR-2017/746', 'EU In Vitro Diagnostic Regulation', 'performance', 'EU', '2017', '2022-05-26', 'European regulation for in vitro diagnostic medical devices', 'Performance evaluation, clinical evidence, post-market performance follow-up, classification rules, conformity assessment', 'active'],
    ];

    for (const s of standards) {
      await client.query(
        `INSERT INTO regulatory_standards (code, name, category, authority, version, effective_date, description, requirements, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        s
      );
    }
    console.log('Regulatory standards seeded.');

    // -------------------------------------------------------
    // 4. Compliance Checklists (18 items)
    // -------------------------------------------------------
    const checklists = [
      [1, 1, 'QMS Documentation Review', 'Verify quality management system documentation is complete and current', 'compliant', 'critical', 'Sarah Johnson', '2026-03-15', 'QMS manual v4.2 reviewed and approved', 'Annual review completed'],
      [1, 2, 'Pacemaker Risk Analysis', 'Complete risk analysis per ISO 14971 for cardiac pacemaker', 'compliant', 'critical', 'Dr. Michael Chen', '2026-04-01', 'Risk file RF-PM-2025 approved', null],
      [2, 4, 'Insulin Pump Design Controls', 'Verify FDA 21 CFR 820 design control compliance for insulin pump', 'in_progress', 'high', 'Lisa Park', '2026-05-15', null, 'Design review scheduled for May'],
      [3, 7, 'MRI Electrical Safety Testing', 'IEC 60601-1 electrical safety compliance for MRI scanner', 'compliant', 'critical', 'James Wilson', '2026-02-28', 'Test report ES-MRI-2025-003', 'All tests passed'],
      [4, 3, 'Surgical Robot Software Validation', 'IEC 62304 software lifecycle compliance for da Vinci Xi', 'in_progress', 'critical', 'Robert Kim', '2026-06-30', null, 'Software V&V in progress, 70% complete'],
      [5, 6, 'Hip Prosthesis Biocompatibility', 'ISO 10993 biocompatibility evaluation for OXINIUM hip implant', 'compliant', 'critical', 'Dr. Emily Brown', '2026-01-31', 'Biocompatibility report BC-HP-2025', 'All 10 endpoints evaluated and passed'],
      [6, 5, 'CGM EU MDR Compliance', 'EU MDR 2017/745 conformity assessment for glucose monitor', 'pending', 'high', 'Anna Schmidt', '2026-07-15', null, 'Awaiting notified body review'],
      [7, 1, 'Ventilator QMS Audit', 'ISO 13485 quality system audit for ventilator manufacturing', 'compliant', 'high', 'Tom Anderson', '2026-04-30', 'Audit report QA-VT-2025-01', 'Zero major findings'],
      [8, 7, 'Defibrillator Safety Standards', 'IEC 60601-1 compliance verification for AED', 'compliant', 'critical', 'Maria Garcia', '2026-03-01', 'Safety test certificate SC-DF-2025', null],
      [9, 4, 'Infusion Pump FDA Compliance', 'FDA 21 CFR 820 QSR compliance for infusion pump system', 'in_progress', 'high', 'David Lee', '2026-05-01', null, 'Preparing for FDA inspection'],
      [10, 10, 'Ultrasound Usability Evaluation', 'ISO 62366 usability engineering for ultrasound system', 'compliant', 'medium', 'Karen White', '2026-06-15', 'Usability report UE-US-2025', 'Summative evaluation complete'],
      [11, 11, 'CT Scanner Cybersecurity Assessment', 'IEC 62443 cybersecurity evaluation for CT scanner network', 'non_compliant', 'critical', 'Alex Turner', '2026-02-15', null, 'Vulnerability found in network interface - remediation required'],
      [12, 13, 'Hearing Aid UDI Compliance', 'FDA UDI system compliance for hearing aid device labeling', 'compliant', 'medium', 'Patricia Davis', '2026-08-01', 'UDI registration confirmation', 'GUDID submission complete'],
      [13, 6, 'Dental Implant Biocompatibility', 'ISO 10993 testing for titanium-zirconium dental implant', 'compliant', 'critical', 'Dr. James Martin', '2026-03-25', 'BC report BC-DI-2025-002', null],
      [14, 12, 'Endoscope Sterilization Validation', 'ISO 11135 EO sterilization validation for endoscope', 'in_progress', 'high', 'Nancy Taylor', '2026-04-15', null, 'Validation protocol approved, IQ/OQ complete'],
      [15, 7, 'Pulse Oximeter Electrical Safety', 'IEC 60601-1 compliance for bedside pulse oximeter', 'compliant', 'high', 'Steve Harris', '2026-05-01', 'Test certificate ES-PO-2025', null],
      [16, 5, 'Cochlear Implant EU MDR', 'EU MDR 2017/745 Class III conformity for cochlear implant', 'pending', 'critical', 'Dr. Rachel Green', '2026-09-01', null, 'New device - full conformity assessment required'],
      [2, 11, 'Insulin Pump Cybersecurity', 'IEC 62443 cybersecurity assessment for connected insulin pump', 'in_progress', 'critical', 'Alex Turner', '2026-04-30', null, 'Penetration testing scheduled'],
    ];

    for (const c of checklists) {
      await client.query(
        `INSERT INTO compliance_checklists (device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        c
      );
    }
    console.log('Compliance checklists seeded.');

    // -------------------------------------------------------
    // 5. Audit Logs (16 entries)
    // -------------------------------------------------------
    const auditLogs = [
      ['Admin User', 'CREATE', 'device', 1, 'Created device: Cardiac Pacemaker MDP-5000', '192.168.1.100'],
      ['Admin User', 'CREATE', 'device', 2, 'Created device: Insulin Pump T-Slim X3', '192.168.1.100'],
      ['Sarah Johnson', 'UPDATE', 'compliance_checklist', 1, 'Updated checklist status to compliant for QMS Documentation Review', '192.168.1.101'],
      ['Dr. Michael Chen', 'UPDATE', 'risk_assessment', 1, 'Completed risk analysis for Cardiac Pacemaker', '192.168.1.102'],
      ['Admin User', 'CREATE', 'regulatory_standard', 1, 'Added standard ISO-13485', '192.168.1.100'],
      ['Lisa Park', 'UPDATE', 'device', 2, 'Updated insulin pump inspection date', '192.168.1.103'],
      ['James Wilson', 'CREATE', 'document', 3, 'Uploaded MRI safety test report', '192.168.1.104'],
      ['Robert Kim', 'UPDATE', 'compliance_checklist', 5, 'Updated surgical robot software validation to in_progress', '192.168.1.105'],
      ['Admin User', 'DELETE', 'document', 15, 'Removed obsolete calibration certificate', '192.168.1.100'],
      ['Tom Anderson', 'CREATE', 'audit_log', null, 'Internal audit of ventilator manufacturing started', '192.168.1.106'],
      ['Dr. Emily Brown', 'UPDATE', 'risk_assessment', 5, 'Updated biocompatibility risk assessment for hip prosthesis', '192.168.1.107'],
      ['Maria Garcia', 'CREATE', 'capa_record', 1, 'Opened CAPA for defibrillator battery issue', '192.168.1.108'],
      ['David Lee', 'UPDATE', 'nonconformance_report', 2, 'Updated NCR investigation findings for infusion pump', '192.168.1.109'],
      ['Alex Turner', 'CREATE', 'change_control', 1, 'Submitted change request for CT scanner software update', '192.168.1.110'],
      ['Karen White', 'UPDATE', 'training_record', 3, 'Completed usability training certification', '192.168.1.111'],
      ['Admin User', 'LOGIN', 'user', 1, 'Admin user logged in successfully', '192.168.1.100'],
    ];

    for (const a of auditLogs) {
      await client.query(
        `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        a
      );
    }
    console.log('Audit logs seeded.');

    // -------------------------------------------------------
    // 6. Documents (16 documents)
    // -------------------------------------------------------
    const documents = [
      ['Cardiac Pacemaker Design History File', 'DHF', '3.1', 'approved', 1, 1, '/docs/dhf/pacemaker-dhf-v3.1.pdf', 'Complete design history file for MDP-5000 cardiac pacemaker', 'Dr. Michael Chen', 'Sarah Johnson', '2025-06-15'],
      ['Insulin Pump Software Requirements Specification', 'DMR', '2.4', 'approved', 2, 3, '/docs/dmr/insulin-pump-srs-v2.4.pdf', 'Software requirements for T-Slim X3 insulin pump firmware', 'Robert Kim', 'Lisa Park', '2025-08-01'],
      ['MRI Scanner Safety Test Report', 'report', '1.0', 'approved', 3, 7, '/docs/reports/mri-safety-test-2025.pdf', 'IEC 60601-1 safety test results for MAGNETOM Vida', 'James Wilson', 'Tom Anderson', '2025-11-20'],
      ['Surgical Robot Sterilization Protocol', 'protocol', '4.0', 'approved', 4, 12, '/docs/protocols/surgical-robot-sterilization-v4.pdf', 'Sterilization procedure for da Vinci Xi robotic arms and instruments', 'Nancy Taylor', 'Dr. Emily Brown', '2025-03-10'],
      ['Hip Prosthesis Biocompatibility Report', 'report', '1.2', 'approved', 5, 6, '/docs/reports/hip-biocompat-2025.pdf', 'ISO 10993 biocompatibility evaluation results for OXINIUM', 'Dr. Emily Brown', 'Dr. Michael Chen', '2025-10-22'],
      ['Blood Glucose Monitor User Manual', 'manual', '5.1', 'approved', 6, null, '/docs/manuals/freestyle-libre3-user-manual.pdf', 'Patient user manual for FreeStyle Libre 3 CGM system', 'Karen White', 'Anna Schmidt', '2025-07-05'],
      ['Ventilator QMS Audit Report', 'report', '1.0', 'approved', 7, 1, '/docs/reports/ventilator-qms-audit-2025.pdf', 'ISO 13485 internal audit report for Hamilton-C6 ventilator', 'Tom Anderson', 'Sarah Johnson', '2025-08-14'],
      ['Defibrillator CE Certificate', 'certificate', '2.0', 'approved', 8, 5, '/docs/certificates/aed-ce-cert-2025.pdf', 'CE marking certificate for HeartStart FR3 defibrillator', 'Anna Schmidt', 'Admin User', '2025-05-30'],
      ['Infusion Pump SOP - Alarm Management', 'SOP', '3.2', 'approved', 9, 4, '/docs/sop/infusion-pump-alarm-mgmt-v3.2.pdf', 'Standard operating procedure for Sigma Spectrum alarm configuration', 'David Lee', 'Maria Garcia', '2025-07-18'],
      ['Ultrasound Usability Engineering File', 'DHF', '1.1', 'approved', 10, 10, '/docs/dhf/ultrasound-usability-v1.1.pdf', 'Usability engineering file per ISO 62366 for LOGIQ E10s', 'Karen White', 'Tom Anderson', '2025-09-01'],
      ['CT Scanner Cybersecurity Assessment Report', 'report', '1.0', 'review', 11, 11, '/docs/reports/ct-cybersecurity-2025.pdf', 'IEC 62443 cybersecurity assessment for Aquilion ONE PRISM', 'Alex Turner', null, null],
      ['Hearing Aid DMR', 'DMR', '2.0', 'approved', 12, null, '/docs/dmr/hearing-aid-dmr-v2.pdf', 'Device master record for Audeo Paradise P90', 'Patricia Davis', 'Sarah Johnson', '2025-10-12'],
      ['Dental Implant Clinical Investigation Plan', 'protocol', '1.3', 'approved', 13, 8, '/docs/protocols/dental-implant-cip-v1.3.pdf', 'Clinical investigation plan per ISO 14155 for BLX implant', 'Dr. James Martin', 'Dr. Michael Chen', '2025-03-25'],
      ['Endoscope Reprocessing SOP', 'SOP', '6.0', 'approved', 14, null, '/docs/sop/endoscope-reprocessing-v6.pdf', 'Standard operating procedure for EVIS X1 endoscope cleaning and disinfection', 'Nancy Taylor', 'Tom Anderson', '2025-12-15'],
      ['Pulse Oximeter Calibration Protocol', 'protocol', '2.1', 'approved', 15, 7, '/docs/protocols/pulseox-calibration-v2.1.pdf', 'Calibration and verification protocol for Radical-7 pulse oximeter', 'Steve Harris', 'James Wilson', '2025-11-01'],
      ['Cochlear Implant Technical File', 'DHF', '0.9', 'draft', 16, 5, '/docs/dhf/cochlear-technical-file-v0.9.pdf', 'EU MDR technical documentation for Nucleus 8 Sound processor', 'Dr. Rachel Green', null, null],
    ];

    for (const d of documents) {
      await client.query(
        `INSERT INTO documents (title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        d
      );
    }
    console.log('Documents seeded.');

    // -------------------------------------------------------
    // 7. Risk Assessments (16 assessments)
    // -------------------------------------------------------
    const computeRiskLevel = (severity, probability) => {
      const score = severity * probability;
      if (score >= 15) return 'critical';
      if (score >= 10) return 'high';
      if (score >= 5) return 'medium';
      return 'low';
    };

    const risks = [
      [1, 'Lead wire fracture causing loss of pacing', 'safety', 5, 2, 'Redundant lead design and fracture-resistant materials', 'low', 'mitigated', 'Dr. Michael Chen', '2026-03-15'],
      [1, 'Electromagnetic interference with pacing function', 'performance', 4, 3, 'EMI shielding and automatic mode switching algorithm', 'low', 'mitigated', 'Dr. Michael Chen', '2026-03-15'],
      [2, 'Insulin over-delivery causing hypoglycemia', 'safety', 5, 3, 'Maximum bolus limits, CGM integration with auto-shutoff', 'medium', 'monitoring', 'Lisa Park', '2026-05-01'],
      [2, 'Unauthorized wireless access to pump controls', 'cybersecurity', 5, 2, 'Encrypted Bluetooth, authentication protocols, firmware signing', 'low', 'mitigated', 'Alex Turner', '2026-04-30'],
      [3, 'Projectile hazard from ferromagnetic objects', 'safety', 5, 2, 'Ferromagnetic detection system, safety zone protocols, staff training', 'low', 'mitigated', 'James Wilson', '2026-05-20'],
      [4, 'Unintended instrument movement during surgery', 'safety', 5, 2, 'Redundant motion sensors, collision detection, emergency stop', 'low', 'mitigated', 'Robert Kim', '2026-06-30'],
      [4, 'Software failure during surgical procedure', 'performance', 5, 2, 'Watchdog timer, graceful degradation, manual override capability', 'low', 'mitigated', 'Robert Kim', '2026-06-30'],
      [5, 'Adverse tissue reaction to implant material', 'biocompatibility', 4, 2, 'Oxidized zirconium surface reduces allergic reactions, biocompatibility testing', 'low', 'accepted', 'Dr. Emily Brown', '2026-04-22'],
      [6, 'Inaccurate glucose reading leading to wrong insulin dose', 'performance', 4, 3, 'Redundant sensor checks, calibration algorithms, outlier detection', 'medium', 'monitoring', 'Lisa Park', '2026-02-05'],
      [7, 'Ventilator failure during patient support', 'safety', 5, 2, 'Backup ventilation mode, battery backup, continuous self-testing', 'low', 'mitigated', 'Tom Anderson', '2026-02-14'],
      [8, 'Failure to deliver therapeutic shock', 'safety', 5, 1, 'Daily self-test, capacitor monitoring, battery status alerts', 'low', 'mitigated', 'Maria Garcia', '2026-05-30'],
      [9, 'Air embolism from air-in-line', 'safety', 5, 2, 'Ultrasonic air-in-line sensor, automatic line clamp', 'low', 'mitigated', 'David Lee', '2026-01-18'],
      [11, 'Excessive radiation dose to patient', 'safety', 5, 2, 'Automatic exposure control, dose tracking, protocol optimization', 'low', 'mitigated', 'James Wilson', '2026-06-05'],
      [13, 'Implant failure under masticatory load', 'performance', 3, 2, 'Fatigue testing per ISO 14801, appropriate diameter selection guidelines', 'low', 'accepted', 'Dr. James Martin', '2026-03-25'],
      [14, 'Cross-contamination from inadequate reprocessing', 'safety', 5, 2, 'Validated reprocessing protocol, single-use accessories, leak testing', 'low', 'mitigated', 'Nancy Taylor', '2026-06-15'],
      [16, 'Electrode array migration post-implantation', 'safety', 4, 2, 'Perimodiolar design, surgical technique training, imaging verification', 'low', 'identified', 'Dr. Rachel Green', '2026-09-01'],
    ];

    for (const r of risks) {
      const riskLevel = computeRiskLevel(r[3], r[4]);
      await client.query(
        `INSERT INTO risk_assessments (device_id, hazard, risk_category, severity, probability, risk_level, mitigation, residual_risk_level, status, assigned_to, review_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r[0], r[1], r[2], r[3], r[4], riskLevel, r[5], r[6], r[7], r[8], r[9]]
      );
    }
    console.log('Risk assessments seeded.');

    // -------------------------------------------------------
    // 8. CAPA Records (16 records)
    // -------------------------------------------------------
    const capas = [
      ['Defibrillator Battery Degradation', 'corrective', 'complaint', 8, 'Premature battery depletion reported in 3 units within 18 months of deployment', 'Battery vendor quality issue - incoming lot had substandard cathode material', 'Replace batteries from affected lot, implement incoming inspection for battery voltage curves', 'closed', 'critical', 'Maria Garcia', '2025-12-15', '2025-11-30'],
      ['Insulin Pump Alarm Silencing Issue', 'corrective', 'complaint', 2, 'Users reporting difficulty hearing low-battery alarm in noisy environments', 'Alarm volume output 5dB below specification due to speaker mounting angle', 'Redesign speaker mount, update assembly instructions, verify with acoustic testing', 'verification', 'high', 'Lisa Park', '2026-03-01', null],
      ['MRI Helium Leak Detection', 'preventive', 'inspection', 3, 'Helium boil-off rate slightly elevated during routine checks', 'Preventive measure - seal integrity monitoring improvement needed', 'Install continuous helium level monitoring system with automated alerts', 'implementation', 'high', 'James Wilson', '2026-04-15', null],
      ['Surgical Robot Calibration Drift', 'corrective', 'internal', 4, 'Positional accuracy drift detected after 200+ hours of use between calibrations', 'Thermal expansion of mounting bracket not accounted for in calibration model', 'Update calibration algorithm to include thermal compensation, reduce calibration interval to 150 hours', 'closed', 'critical', 'Robert Kim', '2025-10-30', '2025-10-15'],
      ['Hip Prosthesis Labeling Error', 'corrective', 'ncr', 5, 'Size designation on 12 units had incorrect font size per labeling standard', 'Template update not propagated to secondary printing line', 'Update all label templates on all printing lines, add label verification step in QC', 'closed', 'medium', 'Dr. Emily Brown', '2025-09-01', '2025-08-20'],
      ['Ventilator Software Update Process', 'preventive', 'audit', 7, 'Audit finding: software update deployment lacks formal verification step', 'Process gap identified during internal audit of IEC 62304 compliance', 'Implement formal software deployment checklist with verification testing before release', 'closed', 'high', 'Tom Anderson', '2025-11-01', '2025-10-28'],
      ['Infusion Pump Flow Rate Accuracy', 'corrective', 'complaint', 9, 'Three reports of flow rate deviation exceeding +/-5% at low rates (<5mL/hr)', 'Peristaltic mechanism wear pattern in specific pump lot causing inconsistent occlusion', 'Replace peristaltic mechanism in affected lot, tighten flow accuracy acceptance criteria', 'implementation', 'critical', 'David Lee', '2026-05-01', null],
      ['CT Scanner Radiation Dose Protocol', 'preventive', 'internal', 11, 'Proactive review of dose optimization protocols across all CT protocols', 'Opportunity for improvement - some legacy protocols not optimized for iterative reconstruction', 'Update all CT protocols with dose-optimized parameters for latest reconstruction engine', 'investigation', 'high', 'James Wilson', '2026-06-01', null],
      ['Blood Glucose Monitor Sensor Adhesion', 'corrective', 'complaint', 6, 'Reports of sensor detachment in hot/humid climates within 7 days', 'Adhesive formulation less effective above 35C at high humidity', 'Qualify new adhesive formulation, provide supplementary adhesive patches', 'verification', 'high', 'Lisa Park', '2026-04-01', null],
      ['Endoscope Image Quality Degradation', 'corrective', 'ncr', 14, 'Progressive image quality loss observed after reprocessing cycles', 'Lens coating degradation from reprocessing chemical concentration', 'Validate reprocessing chemical concentration limits, add lens inspection to maintenance', 'closed', 'medium', 'Nancy Taylor', '2025-12-01', '2025-11-15'],
      ['Hearing Aid Bluetooth Connectivity', 'corrective', 'complaint', 12, 'Intermittent Bluetooth dropouts reported with latest firmware update', 'Firmware v2.3 introduced antenna power management conflict', 'Release firmware v2.3.1 hotfix, implement Bluetooth regression test suite', 'closed', 'medium', 'Patricia Davis', '2025-10-15', '2025-10-10'],
      ['Pulse Oximeter Probe Degradation', 'preventive', 'inspection', 15, 'Proactive replacement program for SpO2 probes approaching end of useful life', 'Preventive - LED output decreases with age affecting measurement accuracy', 'Implement probe hour tracking and proactive replacement at 10,000 hours', 'open', 'medium', 'Steve Harris', '2026-07-01', null],
      ['Dental Implant Torque Specifications', 'preventive', 'internal', 13, 'Review of insertion torque recommendations following new clinical evidence', 'New literature suggests optimal primary stability at different torque values', 'Update IFU with revised torque recommendations, provide training to dental professionals', 'investigation', 'medium', 'Dr. James Martin', '2026-05-15', null],
      ['Supplier Quality Issue - Titanium Alloy', 'corrective', 'ncr', null, 'Titanium alloy batch from Supplier TitanMed failed incoming material testing', 'Supplier process change not communicated through change notification', 'Issue SCR to supplier, implement supplier change notification agreement', 'implementation', 'high', 'Sarah Johnson', '2026-03-15', null],
      ['Training Record Documentation Gap', 'preventive', 'audit', null, 'Audit finding: 5% of training records missing trainer signature', 'Electronic training system does not enforce mandatory trainer sign-off', 'Update LMS to require trainer electronic signature before record closure', 'closed', 'low', 'Karen White', '2025-08-15', '2025-08-01'],
      ['Cochlear Implant Packaging Integrity', 'preventive', 'internal', 16, 'Pre-launch assessment of sterile barrier packaging performance', 'New device requires packaging validation per ISO 11607', 'Complete packaging validation including seal strength, distribution simulation, stability', 'open', 'high', 'Dr. Rachel Green', '2026-08-01', null],
    ];

    for (const c of capas) {
      await client.query(
        `INSERT INTO capa_records (title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        c
      );
    }
    console.log('CAPA records seeded.');

    // -------------------------------------------------------
    // 9. Training Records (16 records)
    // -------------------------------------------------------
    const trainingRecords = [
      ['Sarah Johnson', 'EMP-001', 'Quality Assurance', 'ISO 13485:2016 Internal Auditor Training', 'quality', 'IRCA Certified Trainer', '2025-06-15', '2027-06-15', 'completed', 92, 'CERT-QA-001'],
      ['Dr. Michael Chen', 'EMP-002', 'Cardiology', 'Cardiac Device Risk Management per ISO 14971', 'regulatory', 'Sarah Johnson', '2025-07-20', '2027-07-20', 'completed', 95, 'CERT-RM-002'],
      ['Lisa Park', 'EMP-003', 'Endocrinology', 'FDA 21 CFR 820 Design Controls', 'regulatory', 'External - FDA Consultant', '2025-09-10', '2027-09-10', 'completed', 88, 'CERT-DC-003'],
      ['James Wilson', 'EMP-004', 'Radiology', 'IEC 60601-1 Electrical Safety Testing', 'safety', 'TUV SUD Academy', '2025-05-01', '2027-05-01', 'completed', 90, 'CERT-ES-004'],
      ['Robert Kim', 'EMP-005', 'Software Engineering', 'IEC 62304 Medical Device Software Lifecycle', 'technical', 'Johner Institute', '2025-08-15', '2027-08-15', 'completed', 94, 'CERT-SW-005'],
      ['Tom Anderson', 'EMP-006', 'Quality Assurance', 'Good Manufacturing Practice (GMP) Fundamentals', 'gmp', 'PDA Training Institute', '2025-04-20', '2027-04-20', 'completed', 87, 'CERT-GMP-006'],
      ['Dr. Emily Brown', 'EMP-007', 'Orthopedics', 'Biocompatibility Testing per ISO 10993', 'regulatory', 'NAMSA Training', '2025-10-05', '2027-10-05', 'completed', 91, 'CERT-BC-007'],
      ['Maria Garcia', 'EMP-008', 'Emergency Medicine', 'Defibrillator Safety and Maintenance', 'safety', 'Philips Clinical Education', '2025-05-30', '2027-05-30', 'completed', 96, 'CERT-DS-008'],
      ['David Lee', 'EMP-009', 'Pharmacy', 'Infusion Pump Programming and Safety', 'safety', 'Baxter Education Services', '2025-07-18', '2027-07-18', 'completed', 85, 'CERT-IP-009'],
      ['Alex Turner', 'EMP-010', 'IT Security', 'Medical Device Cybersecurity per IEC 62443', 'technical', 'ISA/IEC Training', '2025-06-01', '2027-06-01', 'completed', 93, 'CERT-CS-010'],
      ['Karen White', 'EMP-011', 'Human Factors', 'Usability Engineering per IEC 62366', 'quality', 'Human Factors MD', '2025-09-01', '2027-09-01', 'completed', 89, 'CERT-UE-011'],
      ['Anna Schmidt', 'EMP-012', 'Regulatory Affairs', 'EU MDR 2017/745 Regulatory Specialist', 'regulatory', 'BSI Group Training', '2025-03-15', '2027-03-15', 'completed', 97, 'CERT-EU-012'],
      ['Patricia Davis', 'EMP-013', 'Audiology', 'Hearing Device Fitting and Programming', 'technical', 'Phonak Academy', '2025-10-12', '2027-10-12', 'completed', 86, 'CERT-HD-013'],
      ['Nancy Taylor', 'EMP-014', 'Sterilization', 'Sterilization Process Validation per ISO 11135', 'quality', 'Nelson Laboratories', '2025-12-15', '2027-12-15', 'completed', 91, 'CERT-ST-014'],
      ['Steve Harris', 'EMP-015', 'Biomedical Engineering', 'Medical Equipment Calibration and Maintenance', 'technical', 'AAMI Training', '2025-11-01', '2027-11-01', 'completed', 88, 'CERT-CM-015'],
      ['Dr. Rachel Green', 'EMP-016', 'ENT', 'EU MDR Class III Device Compliance', 'regulatory', 'TUV Rheinland Academy', '2026-01-20', '2028-01-20', 'in_progress', null, null],
    ];

    for (const t of trainingRecords) {
      await client.query(
        `INSERT INTO training_records (employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        t
      );
    }
    console.log('Training records seeded.');

    // -------------------------------------------------------
    // 10. Suppliers (16 suppliers)
    // -------------------------------------------------------
    const suppliers = [
      ['TitanMed Alloys', 'John Becker', 'j.becker@titanmed.com', '+1-555-100-2001', '1200 Industrial Pkwy, Cleveland, OH 44114', 'raw_material', 'qualified', true, '2025-06-15', '2026-06-15', 'medium', 'Primary titanium alloy supplier for implants'],
      ['MedElectro Components', 'Susan Chang', 's.chang@medelectro.com', '+1-555-100-2002', '450 Tech Drive, San Jose, CA 95134', 'component', 'qualified', true, '2025-08-20', '2026-08-20', 'low', 'Certified electronic components for Class II/III devices'],
      ['BioCoat Solutions', 'Marco Rossi', 'm.rossi@biocoat.com', '+49-30-555-3001', 'Berliner Str. 88, 10115 Berlin, Germany', 'raw_material', 'qualified', true, '2025-09-10', '2026-09-10', 'low', 'Biocompatible coatings and surface treatments'],
      ['PrecisionMold Inc', 'Amy Watson', 'a.watson@precisionmold.com', '+1-555-100-2004', '780 Manufacturing Way, Minneapolis, MN 55401', 'component', 'qualified', true, '2025-07-01', '2026-07-01', 'low', 'Precision plastic injection molding for device housings'],
      ['SterilePackPro', 'David Chen', 'd.chen@sterilepack.com', '+1-555-100-2005', '320 Cleanroom Ave, Irvine, CA 92618', 'component', 'qualified', true, '2025-10-15', '2026-10-15', 'low', 'Sterile packaging for implantable devices'],
      ['CalibTech Services', 'Rachel Moore', 'r.moore@calibtech.com', '+1-555-100-2006', '55 Metrology Blvd, Gaithersburg, MD 20899', 'service', 'qualified', true, '2025-05-20', '2026-05-20', 'low', 'ISO 17025 accredited calibration services'],
      ['MedSoft Solutions', 'Kevin O Brien', 'k.obrien@medsoft.com', '+353-1-555-4001', 'Unit 5, Digital Hub, Dublin 8, Ireland', 'software', 'qualified', true, '2025-11-01', '2026-11-01', 'medium', 'Medical device software development and validation'],
      ['NanoSurface Tech', 'Yuki Tanaka', 'y.tanaka@nanosurface.jp', '+81-3-555-5001', '2-1-1 Nihonbashi, Chuo-ku, Tokyo 103-0027', 'raw_material', 'conditional', true, '2025-04-10', '2026-04-10', 'medium', 'Nano-structured surface treatments - pending full qualification audit'],
      ['ElectroPower Batteries', 'Frank Mueller', 'f.mueller@electropower.de', '+49-89-555-6001', 'Batteriestr. 12, 80331 Munich, Germany', 'component', 'qualified', true, '2025-12-01', '2026-12-01', 'medium', 'Medical-grade rechargeable batteries for implants'],
      ['CeramTec Medical', 'Laura Schmidt', 'l.schmidt@ceramtec.com', '+49-7153-555-7001', 'CeramTec-Platz 1, 73207 Plochingen, Germany', 'raw_material', 'qualified', true, '2025-03-15', '2026-03-15', 'low', 'Medical-grade ceramic components for orthopedic devices'],
      ['CleanAir Systems', 'Mark Thompson', 'm.thompson@cleanair.com', '+1-555-100-2011', '900 HVAC Rd, Research Triangle Park, NC 27709', 'equipment', 'qualified', true, '2025-08-01', '2026-08-01', 'low', 'Cleanroom HVAC and environmental monitoring equipment'],
      ['BioSilicon Wafers', 'Priya Sharma', 'p.sharma@biosilicon.com', '+91-80-555-8001', 'Electronics City, Bangalore, KA 560100, India', 'component', 'conditional', false, '2025-02-15', '2026-02-15', 'high', 'Medical-grade silicon wafers - conditional pending ISO certification'],
      ['TransLogix Medical', 'Carlos Mendez', 'c.mendez@translogix.com', '+1-555-100-2013', '4400 Cold Chain Blvd, Memphis, TN 38118', 'service', 'qualified', true, '2025-09-20', '2026-09-20', 'low', 'Temperature-controlled medical device logistics'],
      ['PolyMed Resins', 'Helen Park', 'h.park@polymed.com', '+82-2-555-9001', '456 Polymer St, Seocho-gu, Seoul 06621, Korea', 'raw_material', 'qualified', true, '2025-06-30', '2026-06-30', 'low', 'Medical-grade polymer resins and compounds'],
      ['TestLab International', 'Andreas Vogt', 'a.vogt@testlab.eu', '+41-44-555-1001', 'Technopark Str. 1, 8005 Zurich, Switzerland', 'service', 'qualified', true, '2025-11-15', '2026-11-15', 'low', 'Accredited testing laboratory for medical devices'],
      ['SensorTech Medical', 'Linda Wu', 'l.wu@sensortech.com', '+886-2-555-2001', '100 Sensor Rd, Hsinchu Science Park, Taiwan', 'component', 'disqualified', false, '2024-12-01', null, 'high', 'DISQUALIFIED - Failed quality audit Dec 2024. Excessive defect rate in biosensor components.'],
    ];

    for (const s of suppliers) {
      await client.query(
        `INSERT INTO suppliers (name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        s
      );
    }
    console.log('Suppliers seeded.');

    // -------------------------------------------------------
    // 11. Nonconformance Reports (16 NCRs)
    // -------------------------------------------------------
    const ncrs = [
      ['NCR-2025-001', 'Pacemaker Lead Connector Dimensional Variance', 1, 'product', 'major', 'Lead connector OD measured 0.02mm above specification on 3 units from lot PM-2025-044', 'Root cause: tool wear on connector forming die exceeded replacement interval', 'Rework - re-machine connectors to specification', 'closed', 'Sarah Johnson', 'Dr. Michael Chen', '2025-08-01'],
      ['NCR-2025-002', 'Infusion Pump Tubing Supplier Deviation', 9, 'supplier', 'major', 'Incoming inspection found tubing wall thickness 8% below minimum specification', 'Supplier extrusion process parameter drift during production run', 'Reject lot, return to supplier, issue SCR', 'closed', 'David Lee', 'Tom Anderson', '2025-09-15'],
      ['NCR-2025-003', 'MRI Gradient Coil Noise Level Exceedance', 3, 'product', 'minor', 'Acoustic noise level measured 2dB above specification during acceptance testing', 'Vibration dampening pad installed incorrectly during assembly', 'Rework - reinstall dampening pads per revised work instruction', 'closed', 'James Wilson', 'Tom Anderson', '2025-07-20'],
      ['NCR-2025-004', 'Surgical Robot Sterile Drape Packaging Tear', 4, 'product', 'minor', 'Three sterile drape packages found with micro-tears at seal edge in lot SR-DRP-2025', 'Sealing temperature slightly above optimal range on secondary sealer', 'Rework - reseal affected packages, recalibrate sealer', 'closed', 'Nancy Taylor', 'Dr. Emily Brown', '2025-06-10'],
      ['NCR-2025-005', 'Hip Prosthesis Surface Roughness Out of Spec', 5, 'product', 'major', 'Articulating surface roughness Ra=0.08um vs specification of Ra<=0.05um on 2 femoral heads', 'Polishing compound lot variability - abrasive particle size distribution wider than specified', 'Scrap affected units, quarantine remaining lot for 100% inspection', 'closed', 'Dr. Emily Brown', 'Sarah Johnson', '2025-10-01'],
      ['NCR-2025-006', 'Ventilator Alarm System Test Failure', 7, 'product', 'critical', 'High priority alarm failed to trigger during automated testing on 1 unit', 'Software race condition in alarm priority handler under specific timing scenario', 'Quarantine unit, software patch deployed, regression testing on all units in lot', 'closed', 'Tom Anderson', 'Robert Kim', '2025-07-30'],
      ['NCR-2025-007', 'Document Control - Outdated SOP in Production', null, 'documentation', 'major', 'Superseded SOP version found at workstation in assembly area for endoscope reprocessing', 'Document control distribution list not updated after personnel change', 'Retrieve all outdated copies, redistribute current version, update distribution list', 'closed', 'Nancy Taylor', 'Sarah Johnson', '2025-11-05'],
      ['NCR-2025-008', 'CT Scanner Installation Calibration Deviation', 11, 'equipment', 'minor', 'Hounsfield unit calibration for water phantom 3 HU above specification post-installation', 'Tube warm-up procedure not fully completed before calibration measurement', 'Recalibrate after full warm-up cycle - passed on second attempt', 'closed', 'James Wilson', 'Steve Harris', '2025-12-10'],
      ['NCR-2025-009', 'Blood Glucose Monitor Sensor Lot Failure', 6, 'product', 'critical', 'Sensor lot BG-2025-L089 showing systematic -12% bias vs reference method', 'Enzyme deposition process drift in manufacturing batch', 'Quarantine entire lot, issue field safety notice for distributed sensors, root cause investigation', 'investigation', 'Lisa Park', 'Sarah Johnson', '2026-03-01'],
      ['NCR-2025-010', 'Defibrillator Electrode Pad Shelf Life', 8, 'product', 'minor', 'Gel adhesion on electrode pads from lot DF-PAD-2025-003 below specification at 18-month check', 'Accelerated aging test indicates gel formulation stability issue', 'Reduce shelf life labeling from 24 to 18 months for affected lot', 'disposition', 'Maria Garcia', 'Tom Anderson', '2026-02-15'],
      ['NCR-2025-011', 'Dental Implant Lot Identification Error', 13, 'documentation', 'minor', 'Lot number on 25 unit labels does not match lot number on outer packaging', 'Label printer configuration error during production line changeover', 'Relabel affected units, add lot number verification to changeover checklist', 'closed', 'Dr. James Martin', 'Sarah Johnson', '2025-09-25'],
      ['NCR-2026-001', 'Ultrasound Probe Cable Strain Relief Defect', 10, 'product', 'major', 'Cable strain relief found cracked on 2 probes after drop testing per IEC 60601-1', 'Injection molding pressure too low causing incomplete fill in strain relief area', 'Reject affected lot, adjust molding parameters, increase drop test sample size', 'investigation', 'Karen White', 'Tom Anderson', '2026-04-15'],
      ['NCR-2026-002', 'Pulse Oximeter Display Pixel Defect', 15, 'product', 'minor', 'Three dead pixels observed on SpO2 waveform display during QC visual inspection', 'LCD panel supplier lot quality variation', 'Rework - replace LCD panel, tighten incoming LCD inspection criteria', 'open', 'Steve Harris', 'James Wilson', '2026-04-30'],
      ['NCR-2026-003', 'Supplier Certificate of Analysis Missing', null, 'supplier', 'major', 'Three shipments of medical-grade silicone received without CoA from BioSilicon Wafers', 'Supplier administrative process failure', 'Quarantine material, escalate to supplier management, assess supplier qualification status', 'investigation', 'Sarah Johnson', 'Tom Anderson', '2026-05-01'],
      ['NCR-2026-004', 'Hearing Aid Firmware Version Mismatch', 12, 'product', 'minor', 'Production units programmed with firmware v2.2 instead of released v2.3.1', 'Firmware server not updated after release, production used cached version', 'Reprogram affected units, implement firmware version verification in production test', 'disposition', 'Patricia Davis', 'Robert Kim', '2026-03-15'],
      ['NCR-2026-005', 'Cleanroom Particle Count Excursion', null, 'equipment', 'major', 'ISO Class 7 cleanroom particle count exceeded limits during routine monitoring', 'HEPA filter approaching end of life, efficiency degraded below threshold', 'Replace HEPA filter, perform recovery verification, review affected production batches', 'open', 'Tom Anderson', 'Sarah Johnson', '2026-04-20'],
    ];

    for (const n of ncrs) {
      await client.query(
        `INSERT INTO nonconformance_reports (ncr_number, title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        n
      );
    }
    console.log('Nonconformance reports seeded.');

    // -------------------------------------------------------
    // 12. Change Controls (16 records)
    // -------------------------------------------------------
    const changeControls = [
      ['CC-2025-001', 'Pacemaker Firmware Update v5.2', 'software', 1, 'Update pacemaker firmware to v5.2 with improved rate response algorithm', 'Clinical feedback indicates improved patient outcomes with updated rate response', 'Low risk - backward compatible, no hardware changes, validated per IEC 62304', 'closed', 'medium', 'Robert Kim', 'Dr. Michael Chen', '2025-08-15'],
      ['CC-2025-002', 'Insulin Pump Speaker Redesign', 'design', 2, 'Modify speaker mounting to increase alarm audibility from 70dB to 80dB', 'CAPA CA-002 requires increased alarm volume for patient safety', 'Medium risk - mechanical change requires updated 60601-1 acoustic testing', 'implementation', 'high', 'Lisa Park', 'Sarah Johnson', '2026-03-01'],
      ['CC-2025-003', 'MRI Software AI Enhancement', 'software', 3, 'Add AI-assisted image reconstruction to reduce scan time by 30%', 'Market demand for faster scan times while maintaining diagnostic quality', 'Medium risk - new AI algorithm requires clinical validation study', 'approved', 'medium', 'James Wilson', 'Dr. Michael Chen', '2026-06-01'],
      ['CC-2025-004', 'Surgical Robot Instrument Sterilization SOP Update', 'document', 4, 'Update sterilization SOP to include new single-use instrument accessories', 'Introduction of new single-use instrument tips requires updated procedures', 'Low risk - documentation change only, no design modification', 'closed', 'low', 'Nancy Taylor', 'Tom Anderson', '2025-09-01'],
      ['CC-2025-005', 'Hip Prosthesis Polishing Compound Change', 'supplier', 5, 'Switch polishing compound supplier from PolishCo to AbrasiveTech', 'Current supplier unable to meet tighter particle size distribution requirements per NCR-2025-005', 'Medium risk - requires process revalidation and biocompatibility assessment', 'implementation', 'high', 'Dr. Emily Brown', 'Sarah Johnson', '2026-04-01'],
      ['CC-2025-006', 'Blood Glucose Monitor Adhesive Reformulation', 'design', 6, 'Change sensor adhesive to improved hot/humid climate formulation', 'CAPA requirement to address sensor detachment in tropical environments', 'High risk - biocompatibility retesting required for new adhesive, accelerated stability study', 'review', 'critical', 'Lisa Park', 'Dr. Emily Brown', '2026-05-01'],
      ['CC-2025-007', 'Ventilator Alarm Priority Update', 'software', 7, 'Patch alarm priority handler to eliminate race condition identified in NCR-2025-006', 'Critical safety issue - alarm must reliably trigger in all timing scenarios', 'Low risk - targeted fix with comprehensive regression testing', 'closed', 'critical', 'Robert Kim', 'Tom Anderson', '2025-08-15'],
      ['CC-2025-008', 'Defibrillator Battery Vendor Change', 'supplier', 8, 'Qualify ElectroPower Batteries as secondary battery supplier', 'Risk mitigation - reduce dependency on single battery source after CAPA CA-001', 'Medium risk - requires full qualification including accelerated life testing', 'approved', 'high', 'Maria Garcia', 'Sarah Johnson', '2026-06-15'],
      ['CC-2025-009', 'Infusion Pump UI Localization', 'software', 9, 'Add 12 additional languages to infusion pump user interface', 'Regulatory requirement for EU MDR market access in additional member states', 'Low risk - UI text changes only, no clinical functionality impact', 'implementation', 'medium', 'David Lee', 'Karen White', '2026-04-15'],
      ['CC-2025-010', 'CT Scanner Network Security Upgrade', 'software', 11, 'Upgrade network interface firmware to address cybersecurity vulnerabilities', 'IEC 62443 assessment identified vulnerabilities requiring remediation', 'Medium risk - network stack change requires connectivity validation', 'implementation', 'critical', 'Alex Turner', 'Robert Kim', '2026-03-15'],
      ['CC-2026-001', 'Endoscope LED Light Source Upgrade', 'design', 14, 'Upgrade from xenon to LED light source for improved image quality and lifespan', 'LED technology now meets color rendering requirements while offering 10x lifespan', 'Medium risk - optical performance validation and IEC 60601-1 retesting required', 'review', 'medium', 'Nancy Taylor', 'Dr. Michael Chen', '2026-07-01'],
      ['CC-2026-002', 'Pulse Oximeter LCD Panel Supplier Change', 'supplier', 15, 'Qualify alternate LCD panel supplier following NCR-2026-002', 'Current supplier lot quality inconsistency driving display defects', 'Low risk - form-fit-function equivalent, requires incoming inspection update', 'requested', 'medium', 'Steve Harris', 'Tom Anderson', null],
      ['CC-2026-003', 'Hearing Aid Firmware v3.0 Major Release', 'software', 12, 'Major firmware release with improved noise reduction and new tinnitus masking feature', 'Product roadmap feature - enhances competitive positioning', 'High risk - new clinical feature requires performance validation study', 'review', 'high', 'Patricia Davis', 'Robert Kim', '2026-08-01'],
      ['CC-2026-004', 'Ultrasound Probe Manufacturing Process Change', 'process', 10, 'Modify probe cable strain relief injection molding parameters', 'NCR-2026-001 identified molding pressure issue causing defects', 'Medium risk - process change requires IQ/OQ/PQ revalidation', 'approved', 'high', 'Karen White', 'Tom Anderson', '2026-05-15'],
      ['CC-2026-005', 'Dental Implant Surface Treatment Enhancement', 'design', 13, 'Add hydrophilic surface treatment to BLX implant for improved osseointegration', 'New clinical evidence supports faster osseointegration with hydrophilic surfaces', 'High risk - biocompatibility retesting, clinical data required, regulatory submission', 'requested', 'medium', 'Dr. James Martin', null, null],
      ['CC-2026-006', 'QMS Document Control System Migration', 'software', null, 'Migrate from legacy document control to cloud-based QMS platform', 'Current system approaching end of support, cloud platform offers better 21 CFR Part 11 compliance', 'High risk - affects all departments, requires comprehensive validation per FDA 21 CFR 11', 'review', 'high', 'Sarah Johnson', 'Admin User', '2026-09-01'],
    ];

    for (const cc of changeControls) {
      await client.query(
        `INSERT INTO change_controls (change_number, title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        cc
      );
    }
    console.log('Change controls seeded.');

    // -------------------------------------------------------
    // 13. Calibration Records (16 records)
    // -------------------------------------------------------
    const calibrations = [
      ['Pacemaker Pulse Analyzer', 'CAL-EQ-001', 1, 'periodic', '2025-09-10', '2026-09-10', 'Steve Harris', 'calibrated', 'NIST-traceable reference pulse generator', 'All parameters within specification. Pulse width accuracy: +/-0.01ms', 'CAL-CERT-2025-001'],
      ['Insulin Delivery Gravimetric Tester', 'CAL-EQ-002', 2, 'periodic', '2025-12-01', '2026-12-01', 'Steve Harris', 'calibrated', 'NIST-traceable analytical balance', 'Flow rate accuracy verified at 0.1, 1.0, 5.0, 50.0 mL/hr. All within +/-2%', 'CAL-CERT-2025-002'],
      ['MRI Phantom - ACR Large', 'CAL-EQ-003', 3, 'periodic', '2025-11-20', '2026-11-20', 'CalibTech Services', 'calibrated', 'ACR MRI accreditation phantom specifications', 'Geometric accuracy, high-contrast resolution, slice thickness all within ACR limits', 'CAL-CERT-2025-003'],
      ['Surgical Robot Position Verification System', 'CAL-EQ-004', 4, 'periodic', '2025-07-10', '2026-01-10', 'Steve Harris', 'due', 'Laser tracker interferometer NIST-traceable', 'Positional accuracy: +/-0.1mm at all test points. Within specification.', 'CAL-CERT-2025-004'],
      ['Hip Prosthesis Surface Profilometer', 'CAL-EQ-005', 5, 'periodic', '2025-10-22', '2026-10-22', 'CalibTech Services', 'calibrated', 'NIST-traceable roughness standard Ra=0.025um', 'Ra measurement accuracy verified to +/-0.002um', 'CAL-CERT-2025-005'],
      ['Glucose Reference Analyzer', 'CAL-EQ-006', 6, 'periodic', '2025-08-05', '2026-08-05', 'CalibTech Services', 'calibrated', 'NIST-traceable glucose reference solutions', 'Linearity verified 20-600 mg/dL, accuracy within +/-1.5%', 'CAL-CERT-2025-006'],
      ['Ventilator Test Lung Simulator', 'CAL-EQ-007', 7, 'periodic', '2025-08-14', '2026-08-14', 'Steve Harris', 'calibrated', 'NIST-traceable pressure and flow standards', 'Pressure accuracy +/-0.2 cmH2O, flow accuracy +/-1% at all test points', 'CAL-CERT-2025-007'],
      ['Defibrillator Energy Analyzer', 'CAL-EQ-008', 8, 'periodic', '2025-11-30', '2026-11-30', 'Steve Harris', 'calibrated', 'NIST-traceable high voltage divider and calorimeter', 'Energy measurement accuracy +/-2% across 50-360J range', 'CAL-CERT-2025-008'],
      ['Infusion Pump Flow Analyzer', 'CAL-EQ-009', 9, 'after_repair', '2026-01-18', '2026-07-18', 'CalibTech Services', 'calibrated', 'NIST-traceable gravimetric flow standard', 'Post-repair calibration. All flow rates 0.1-1000 mL/hr within +/-2% specification', 'CAL-CERT-2026-001'],
      ['Ultrasound Acoustic Output Analyzer', 'CAL-EQ-010', 10, 'periodic', '2025-09-01', '2026-09-01', 'CalibTech Services', 'calibrated', 'NIST-traceable hydrophone and radiation force balance', 'MI and TI measurements within +/-5% of declared values', 'CAL-CERT-2025-010'],
      ['CT Scanner Dose Analyzer', 'CAL-EQ-011', 11, 'periodic', '2025-12-05', '2026-12-05', 'Steve Harris', 'calibrated', 'NIST-traceable ionization chamber', 'CTDI measurements within +/-5% at 80, 100, 120, 140 kVp', 'CAL-CERT-2025-011'],
      ['Hearing Aid Acoustic Coupler', 'CAL-EQ-012', 12, 'periodic', '2025-10-12', '2026-10-12', 'CalibTech Services', 'calibrated', 'IEC 60318-4 reference ear simulator', 'Frequency response measured 100Hz-10kHz, within +/-0.5dB of reference', 'CAL-CERT-2025-012'],
      ['Dental Implant Torque Tester', 'CAL-EQ-013', 13, 'periodic', '2025-09-25', '2026-09-25', 'Steve Harris', 'calibrated', 'NIST-traceable torque standard 0-100 Ncm', 'Torque accuracy +/-1% across 5-70 Ncm range', 'CAL-CERT-2025-013'],
      ['Endoscope Light Intensity Meter', 'CAL-EQ-014', 14, 'periodic', '2025-12-15', '2026-12-15', 'CalibTech Services', 'calibrated', 'NIST-traceable luminous intensity standard', 'Light output measurement accuracy +/-3% across visible spectrum', 'CAL-CERT-2025-014'],
      ['Pulse Oximeter SpO2 Simulator', 'CAL-EQ-015', 15, 'periodic', '2025-11-01', '2026-05-01', 'Steve Harris', 'due', 'NIST-traceable optical reference at 660nm and 940nm', 'SpO2 simulation accuracy +/-0.5% at 70-100% range', 'CAL-CERT-2025-015'],
      ['Electrical Safety Analyzer', 'CAL-EQ-016', null, 'periodic', '2025-06-01', '2026-06-01', 'CalibTech Services', 'calibrated', 'NIST-traceable voltage, current, and resistance standards', 'Leakage current accuracy +/-2%, ground resistance accuracy +/-3%', 'CAL-CERT-2025-016'],
    ];

    for (const cal of calibrations) {
      await client.query(
        `INSERT INTO calibration_records (equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        cal
      );
    }
    console.log('Calibration records seeded.');

    console.log('\nSeed completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
