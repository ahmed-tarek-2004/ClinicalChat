document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                loginBtn.innerHTML = `جاري الدخول... <svg width="18" height="18" style="animation: spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20" stroke-linecap="round"/></svg>`;
                loginBtn.disabled = true;

                const response = await Api.login(email, password);

                if (response.succeeded) {
                    Auth.setSession(response.data);
                    const adminId = "44dc4beb-5b7d-467b-a124-5107f68d5f5d";

                    if (email.toLowerCase() === "admin@gmail.com") {
                        window.location.href = "users.html"; 
                    } else {
                        window.location.href = `chat.html?userId=${adminId}&name=${encodeURIComponent("الصيدلية")}`;
                    }
                } else {
                    alert("خطأ: " + response.message);
                    resetBtn();
                }
            } catch (error) {
                console.error("Login Error:", error);
                if (error.errors && error.errors.length > 0) {
                    alert("خطأ في البيانات: " + error.errors[0].ErrorMessage);
                } else {
                    alert("يوجد مشكلة في الاتصال بالخادم.");
                }
                resetBtn();
            }
        });
    }

    function resetBtn() {
        loginBtn.innerHTML = `دخول <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
        loginBtn.disabled = false;
    }
});