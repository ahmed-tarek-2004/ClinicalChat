document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const submitBtn = loginForm.querySelector("button");

            try {
                submitBtn.innerText = "جاري تسجيل الدخول...";
                submitBtn.disabled = true;

                const response = await Api.login(email, password);

                if (response.succeeded) {
                    Auth.setSession(response.data);
                    window.location.href = "chat.html"; 
                } else {
                    alert("خطأ: " + response.message);
                    submitBtn.innerText = "دخول";
                    submitBtn.disabled = false;
                }

            } catch (error) {
                console.error("Login Error:", error);
                
                if (error.errors && error.errors.length > 0) {
                    alert("خطأ في البيانات: " + error.errors[0].ErrorMessage);
                } else {
                    alert("يوجد مشكلة في الاتصال بالخادم.");
                }

                submitBtn.innerText = "دخول";
                submitBtn.disabled = false;
            }
        });
    }
});