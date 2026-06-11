import { request } from "./client.js";

export const aiApi = {
  analyze(consultationId) {
    return request("ai", "/ai/analyze", {
      method: "POST",
      body: { consultationId },
    });
  },

  result(consultationId) {
    return request("ai", `/ai/result/${encodeURIComponent(consultationId)}`);
  },

  reportDownload(consultationId) {
    return request("ai", `/ai/report/${encodeURIComponent(consultationId)}/download`);
  },
};
