export const storage = {
  getToken: () => localStorage.getItem('jwtToken'),
  setToken: (t) => localStorage.setItem('jwtToken', t),
  removeToken: () => localStorage.removeItem('jwtToken'),
}
