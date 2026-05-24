import { request } from "./client.js";

export const authApi = {
  signup(payload) {
    return request("auth", "/auth/signup", {
      method: "POST",
      body: {
        email: payload.email,
        password: payload.password,
        nickname: payload.nickname,
        child: {
          name: payload.childName,
          birthDate: payload.childBirthDate,
          gender: payload.childGender,
        },
      },
    });
  },

  login(payload) {
    return request("auth", "/auth/login", {
      method: "POST",
      body: {
        email: payload.email,
        password: payload.password,
      },
    });
  },

  me() {
    return request("auth", "/me");
  },

  children() {
    return request("auth", "/me/children");
  },

  createChild(payload) {
    return request("auth", "/me/children", {
      method: "POST",
      body: payload,
    });
  },

  updateChild(childId, payload) {
    return request("auth", `/me/children/${encodeURIComponent(childId)}`, {
      method: "PATCH",
      body: payload,
    });
  },
};
