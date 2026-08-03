const Api = (() => {
  const { API_BASE_URL, ENDPOINTS } = window.APP_CONFIG;

  async function request(path, options = {}) {
    const token = Auth.getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: `Bearer ${token}` } : {},
      options.headers || {}
    );

    const res = await fetch(API_BASE_URL + path, { ...options, headers });
    
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        throw new Error(`Request failed: ${res.status}`);
      }
      throw errorData; 
    }

    if (res.status === 204) return null;
    return res.json();
  }

  function login(email, password) {
    return request(ENDPOINTS.LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  function getHistory(withUserId) {
    return request(`${ENDPOINTS.HISTORY}/${withUserId}`, { method: "GET" });
  }

  return { login, getHistory };
})();