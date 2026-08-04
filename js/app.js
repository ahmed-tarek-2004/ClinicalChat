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
                    // حفظ بيانات الجلسة في LocalStorage
                    Auth.setSession(response.data);
                    
                    // ==========================================
                    // توجيه المستخدم بناءً على الإيميل (الصلاحية)
                    // ==========================================
                    const adminId = "44dc4beb-5b7d-467b-a124-5107f68d5f5d"; // الـ ID الخاص بالأدمن

                    if (email.toLowerCase() === "admin@gmail.com") {
                        // الأدمن يروح لصفحة كل المستخدمين
                        window.location.href = "users.html"; 
                    } else {
                        // المستخدم العادي يروح مباشرة يكلم الصيدلية
                        window.location.href = `chat.html?userId=${adminId}&name=${encodeURIComponent("الصيدلية")}`;
                    }
                    // ==========================================

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