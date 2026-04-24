import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

// ─── Generic CRUD factory ────────────────────────────────────────────────────

function createCrudService(resource) {
  return {
    getAll: async (params) => {
      const { data } = await api.get(`/${resource}`, { params });
      return data;
    },
    getById: async (id) => {
      const { data } = await api.get(`/${resource}/${id}`);
      return data;
    },
    create: async (payload) => {
      const { data } = await api.post(`/${resource}`, payload);
      return data;
    },
    update: async (id, payload) => {
      const { data } = await api.put(`/${resource}/${id}`, payload);
      return data;
    },
    delete: async (id) => {
      const { data } = await api.delete(`/${resource}/${id}`);
      return data;
    },
  };
}

// ─── Entity services ─────────────────────────────────────────────────────────

export const devicesService = createCrudService('devices');
export const standardsService = createCrudService('standards');
export const checklistsService = createCrudService('checklists');
export const auditLogsService = createCrudService('audit-logs');
export const documentsService = createCrudService('documents');
export const riskAssessmentsService = createCrudService('risk-assessments');
export const capaService = createCrudService('capa');
export const trainingService = createCrudService('training');
export const suppliersService = createCrudService('suppliers');
export const nonconformanceService = createCrudService('nonconformance');
export const changeControlsService = createCrudService('change-controls');
export const calibrationService = createCrudService('calibration');

// ─── AI functions ────────────────────────────────────────────────────────────

export const analyzeCompliance = async (deviceId) => {
  const { data } = await api.post(`/ai/compliance-analysis`, { device_id: deviceId });
  return data;
};

export const predictRisk = async (deviceId) => {
  const { data } = await api.post(`/ai/risk-prediction`, { device_id: deviceId });
  return data;
};

export const gapAnalysis = async (deviceId, standardId) => {
  const { data } = await api.post(`/ai/gap-analysis`, { device_id: deviceId, standard_id: standardId });
  return data;
};

export const reviewDocument = async (documentId) => {
  const { data } = await api.post(`/ai/document-review`, { document_id: documentId });
  return data;
};

export const generateAuditReport = async (deviceId) => {
  const { data } = await api.post(`/ai/audit-report`, { device_id: deviceId });
  return data;
};

export const classificationAdvisor = async (description) => {
  const { data } = await api.post(`/ai/classification-advisor`, { device_description: description });
  return data;
};

export const regulatoryPathway = async (deviceId) => {
  const { data } = await api.post(`/ai/regulatory-pathway`, { device_id: deviceId });
  return data;
};

export const predicateFinder = async (deviceId) => {
  const { data } = await api.post(`/ai/predicate-finder`, { device_id: deviceId });
  return data;
};

// ─── Named convenience exports ──────────────────────────────────────────────

export const getDevices = (params) => devicesService.getAll(params);
export const getDevice = (id) => devicesService.getById(id);
export const createDevice = (payload) => devicesService.create(payload);
export const updateDevice = (id, payload) => devicesService.update(id, payload);
export const deleteDevice = (id) => devicesService.delete(id);

export const getStandards = (params) => standardsService.getAll(params);
export const getStandard = (id) => standardsService.getById(id);
export const createStandard = (payload) => standardsService.create(payload);
export const updateStandard = (id, payload) => standardsService.update(id, payload);
export const deleteStandard = (id) => standardsService.delete(id);

export const getChecklists = (params) => checklistsService.getAll(params);
export const getChecklist = (id) => checklistsService.getById(id);
export const createChecklist = (payload) => checklistsService.create(payload);
export const updateChecklist = (id, payload) => checklistsService.update(id, payload);
export const deleteChecklist = (id) => checklistsService.delete(id);

export const getAuditLogs = (params) => auditLogsService.getAll(params);

export const getDocuments = (params) => documentsService.getAll(params);
export const getDocument = (id) => documentsService.getById(id);
export const createDocument = (payload) => documentsService.create(payload);
export const updateDocument = (id, payload) => documentsService.update(id, payload);
export const deleteDocument = (id) => documentsService.delete(id);

export const getRiskAssessments = (params) => riskAssessmentsService.getAll(params);
export const getRiskAssessment = (id) => riskAssessmentsService.getById(id);
export const createRiskAssessment = (payload) => riskAssessmentsService.create(payload);
export const updateRiskAssessment = (id, payload) => riskAssessmentsService.update(id, payload);
export const deleteRiskAssessment = (id) => riskAssessmentsService.delete(id);

// CAPA
export const getCapas = (params) => capaService.getAll(params);
export const getCapa = (id) => capaService.getById(id);
export const createCapa = (payload) => capaService.create(payload);
export const updateCapa = (id, payload) => capaService.update(id, payload);
export const deleteCapa = (id) => capaService.delete(id);

// Training
export const getTraining = (params) => trainingService.getAll(params);
export const getTrainingRecord = (id) => trainingService.getById(id);
export const createTraining = (payload) => trainingService.create(payload);
export const updateTraining = (id, payload) => trainingService.update(id, payload);
export const deleteTraining = (id) => trainingService.delete(id);

// Suppliers
export const getSuppliers = (params) => suppliersService.getAll(params);
export const getSupplier = (id) => suppliersService.getById(id);
export const createSupplier = (payload) => suppliersService.create(payload);
export const updateSupplier = (id, payload) => suppliersService.update(id, payload);
export const deleteSupplier = (id) => suppliersService.delete(id);

// Non-Conformance
export const getNonconformance = (params) => nonconformanceService.getAll(params);
export const getNonconformanceReport = (id) => nonconformanceService.getById(id);
export const createNonconformance = (payload) => nonconformanceService.create(payload);
export const updateNonconformance = (id, payload) => nonconformanceService.update(id, payload);
export const deleteNonconformance = (id) => nonconformanceService.delete(id);

// Change Controls
export const getChangeControls = (params) => changeControlsService.getAll(params);
export const getChangeControl = (id) => changeControlsService.getById(id);
export const createChangeControl = (payload) => changeControlsService.create(payload);
export const updateChangeControl = (id, payload) => changeControlsService.update(id, payload);
export const deleteChangeControl = (id) => changeControlsService.delete(id);

// Calibration
export const getCalibration = (params) => calibrationService.getAll(params);
export const getCalibrationRecord = (id) => calibrationService.getById(id);
export const createCalibration = (payload) => calibrationService.create(payload);
export const updateCalibration = (id, payload) => calibrationService.update(id, payload);
export const deleteCalibration = (id) => calibrationService.delete(id);

export default api;
