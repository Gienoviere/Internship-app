export const state = {
  currentUser: null,
  last: {
    tasksToday: null,
    missed: null,
    warnings: null,
    overview: null,
    supQueue: null,
  },
};

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  localStorage.setItem("token", t);
}

export function clearToken() {
  localStorage.removeItem("token");
}
