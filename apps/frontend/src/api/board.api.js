import { request } from "./client.js";

export const boardApi = {
  posts(q = "") {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
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
