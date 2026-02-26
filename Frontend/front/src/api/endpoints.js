import { http } from "./http";

export const apiAuth = {
  login: (payload) => http.post("/auth/login", payload).then((r) => r.data),
  register: (payload) => http.post("/auth/register", payload).then((r) => r.data),
  me: () => http.get("/auth/me").then((r) => r.data),
  logout: () => Promise.resolve(true),
};

export const apiSubjects = {
  list: () => http.get("/subjects").then((r) => r.data.subjects || []),
  topics: (subjectId) =>
    http.get(`/subjects/${subjectId}/topics`).then((r) => r.data.topics || []),
};

export const apiTests = {
  generate: (payload) => http.post("/tests/generate", payload).then((r) => r.data),
  getById: (testId) => http.get(`/tests/${testId}`).then((r) => r.data),
};

export const apiAttempts = {
  start: (test_id) => http.post("/attempts/start", { test_id }).then((r) => r.data),
  submit: (attemptId, answers) =>
    http.post(`/attempts/${attemptId}/submit`, { answers }).then((r) => r.data),
  my: () => http.get("/attempts").then((r) => r.data.attempts || []),
  get: (attemptId) => http.get(`/attempts/${attemptId}`).then((r) => r.data),
};

export const apiTeacher = {
  createGroup: (payload) => http.post("/teacher/groups", payload).then((r) => r.data),
  listGroups: () => http.get("/teacher/groups").then((r) => r.data.groups || []),
  addMember: (groupId, payload) =>
    http.post(`/teacher/groups/${groupId}/members`, payload).then((r) => r.data),
  listMembers: (groupId) =>
    http.get(`/teacher/groups/${groupId}/members`).then((r) => r.data.members || []),
  overview: (groupId) =>
    http.get(`/teacher/groups/${groupId}/analytics/overview`).then((r) => r.data.overview),
  weakTopics: (groupId, limit = 5) =>
    http.get(`/teacher/groups/${groupId}/analytics/weak-topics?limit=${limit}`).then((r) => r.data.weak_topics || []),
  trend: (groupId) =>
    http.get(`/teacher/groups/${groupId}/analytics/trend`).then((r) => r.data.trend || []),
  atRisk: (groupId, threshold = 50) =>
    http.get(`/teacher/groups/${groupId}/analytics/at-risk?threshold=${threshold}`).then((r) => r.data.at_risk || []),
};