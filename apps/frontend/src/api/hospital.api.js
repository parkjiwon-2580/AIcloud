import { request } from "./client.js";

export const hospitalApi = {
  recommend({ department, region }) {
    const query = new URLSearchParams({
      department: department || "소아청소년과",
      region: region || "",
    }).toString();
    return request("hospital", `/hospitals/recommend?${query}`);
  },
};
