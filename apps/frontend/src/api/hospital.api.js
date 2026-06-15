import { request } from "./client.js";

export const hospitalApi = {
  recommend({ department, keyword, region }) {
    const query = new URLSearchParams({
      department: department || "",
      keyword: keyword || "",
      region: region || "",
    }).toString();
    return request("hospital", `/hospitals/recommend?${query}`);
  },
};
