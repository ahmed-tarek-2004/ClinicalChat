document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = "index.html";
        return;
    }

    const usersListContainer = document.getElementById("usersList");
    const logoutBtn = document.getElementById("logoutBtn");
    
    const currentUser = JSON.parse(localStorage.getItem("user"));

    // التحقق من الصلاحيات (الأدمن فقط)
    if (currentUser.email !== "admin@gmail.com") {
        console.warn("المستخدم الحالي ليس أدمن، سيتم إعادة توجيهه.");
        alert("غير مصرح لك بالوصول إلى هذه الصفحة.");
        const adminId = "44dc4beb-5b7d-467b-a124-5107f68d5f5d"; 
        window.location.href = `chat.html?userId=${adminId}&name=${encodeURIComponent("الصيدلية")}`;
        return;
    }

    // ==========================================
    // إعداد SignalR لجلب حالة المتصلين
    // ==========================================
    const hubUrl = `${window.APP_CONFIG.API_BASE_URL}/messageHub`;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => Auth.getToken()
        })
        .withAutomaticReconnect()
        .build();

    // 1. الاستماع لحدث استقبال القائمة الكاملة للمتصلين عند فتح الصفحة
    connection.on("GetOnlineUsers", (onlineUsers) => {
        console.log("البيانات اللي راجعة من السيرفر للمتصلين:", onlineUsers);
        
        // تصفير جميع الحالات أولاً لـ Offline
        document.querySelectorAll('.status-dot').forEach(dot => {
            dot.classList.remove('online');
            dot.title = "غير متصل";
        });

        // تفعيل حالة الأونلاين للموجودين في القائمة
        if (onlineUsers && onlineUsers.length > 0) {
            onlineUsers.forEach(user => {
                const userId = typeof user === 'object' ? user.id || user.Id : user;
                const userDot = document.getElementById(`status-${userId}`);
                if (userDot) {
                    userDot.classList.add('online');
                    userDot.title = "متصل الآن";
                }
            });
        }
    });

    // 2. الاستماع اللحظي: عندما يصبح مستخدم أونلاين الآن
    connection.on("UserConnected", (onlineUserId) => {
        console.log("يوزر دخل أونلاين:", onlineUserId);
        const userDot = document.getElementById(`status-${onlineUserId}`);
        if (userDot) {
            userDot.classList.add('online');
            userDot.title = "متصل الآن";
        }
    });

    // 3. الاستماع اللحظي: عندما يصبح مستخدم أوفلاين (خرج أو أغلق الاتصال)
    connection.on("UserDisconnected", (offlineUserId) => {
        console.log("يوزر خرج أوفلاين:", offlineUserId);
        const userDot = document.getElementById(`status-${offlineUserId}`);
        if (userDot) {
            userDot.classList.remove('online');
            userDot.title = "غير متصل";
        }
    });

    try {
        // 1. جلب قائمة كل المستخدمين من الـ API ورسمهم في الشاشة
        const response = await Api.getUsers();
        const users = response.data || []; 
        
        usersListContainer.innerHTML = ""; 

        const otherUsers = users.filter(u => u.id !== currentUser.id);

        if (otherUsers.length === 0) {
            usersListContainer.innerHTML = "<p style='text-align:center; color:var(--muted);'>لا يوجد مستخدمين آخرين في النظام.</p>";
            return;
        }

        otherUsers.forEach(u => {
            const userRow = document.createElement("div");
            userRow.className = "user-row user-card";
            
            const displayName = u.userName || "مستخدم غير معروف";
            const displayEmail = u.email ? `<div class="user-row-sub">${u.email}</div>` : "";

            const avatarContent = (u.profileUrl && u.profileUrl.trim() !== "") 
                ? `<img src="${u.profileUrl}" alt="${displayName}" class="avatar-img" />`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="default-avatar"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

            userRow.innerHTML = `
                <div class="avatar-container">
                    <div class="custom-avatar">
                        ${avatarContent}
                    </div>
                    <div class="status-dot" id="status-${u.id}" title="غير متصل"></div>
                </div>
                <div class="user-row-info">
                    <div class="user-row-name">${displayName}</div>
                    ${displayEmail}
                </div>
                <div class="chat-action-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
            `;

            userRow.addEventListener("click", () => {
                window.location.href = `chat.html?userId=${u.id}&name=${encodeURIComponent(displayName)}`;
            });

            usersListContainer.appendChild(userRow);
        });

        // 2. بعد رسم الشاشة بنجاح، نبدأ اتصال SignalR
        await connection.start();
        console.log("تم الاتصال بـ SignalR لمعرفة المتصلين");
        
        // 3. استدعاء الدالة المخصصة في الخادم لجلب بيانات الأونلاين المبدئية
        await connection.invoke("onlineusers", currentUser.id);

    } catch (error) {
        console.error("حدث خطأ:", error);
        if (error.status === 403 || error.status === 401) {
            usersListContainer.innerHTML = "<p style='color:red; text-align:center;'>ليس لديك صلاحية لطلب هذه البيانات من الخادم.</p>";
        } else {
            if(usersListContainer.innerHTML === "") {
                usersListContainer.innerHTML = "<p style='color:red; text-align:center;'>حدث خطأ أثناء تحميل القائمة.</p>";
            }
        }
    }

    logoutBtn.addEventListener("click", () => {
        connection.stop();
        Auth.clearSession();
        window.location.href = "index.html";
    });
});