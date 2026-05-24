import { request } from "./client.js";

export const questionnaireApi = {
  create(payload) {
    return request("questionnaire", "/questionnaires", {
      method: "POST",
      body: {
        childId: payload.childId,
        symptomText: payload.symptomText,
      },
    });
  },

  history(childId) {
    const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
    return request("questionnaire", `/questionnaires/history${query}`);
  },

  result(consultationId) {
    return request("questionnaire", `/questionnaires/${encodeURIComponent(consultationId)}/result`);
  },
};
