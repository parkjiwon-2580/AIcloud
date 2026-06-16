import { request } from "./client.js";

export const boardApi = {
  posts({ targetAgeMonths = "" } = {}) {
    const params = new URLSearchParams();
    if (targetAgeMonths && targetAgeMonths !== "전체") {
      params.set("targetAgeMonths", targetAgeMonths);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return request("board", `/info/posts${query}`);
  },

  post(id) {
    return request("board", `/info/posts/${encodeURIComponent(id)}`);
  },

  createPost(payload) {
    return request("board", "/info/posts", {
      method: "POST",
      body: payload,
    });
  },

  createImageUploadUrl(payload) {
    return request("board", "/info/images/upload-url", {
      method: "POST",
      body: payload,
    });
  },

  updatePost(id, payload) {
    return request("board", `/info/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },

  deletePost(id) {
    return request("board", `/info/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
