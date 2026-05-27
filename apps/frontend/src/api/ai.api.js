import { request } from "./client.js";

export const aiApi = {
  analyzeMock(consultationId) {
    return request("ai", `/ai/questionnaires/${encodeURIComponent(consultationId)}/mock-result`, {
      method: "POST",
    });
  },
};
