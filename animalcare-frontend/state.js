// js/state.js
export const state = {
  currentUser: null,
  lastData: { missed: null, warnings: null, overview: null, tasksToday: null, supQueue: null },
};

export function setCurrentUser(user) {
  state.currentUser = user;
}
