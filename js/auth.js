const Auth = (() => {
  const TOKEN_KEY = "accessToken";
  const REFRESH_TOKEN_KEY = "refreshToken";
  const USER_KEY = "user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(data) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    
    const userData = {
      id: data.id,
      userName: data.userName,
      email: data.email
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  return { getToken, setSession, clearSession, isLoggedIn };
})();