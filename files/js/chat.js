document.addEventListener("DOMContentLoaded", async () => {
    // 1. التأكد من تسجيل الدخول
    if (!Auth.isLoggedIn()) {
        window.location.href = "index.html";
        return;
    }

    const chatMessages = document.getElementById("chatMessages");
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const logoutBtn = document.getElementById("logoutBtn");
    
    // 2. جلب بيانات المستخدم الحالي من الـ LocalStorage
    const currentUser = JSON.parse(localStorage.getItem("user"));
    document.getElementById("chatWith").innerText = `مرحباً، ${currentUser.userName}`;

    // ==========================================
    // 3. تحديد الشخص اللي هنبعتله بناءً على الإيميل
    // ==========================================
    let targetUserId = ""; 

    if (currentUser.email === "admin@gmail.com") {
        // لو اللي فاتح هو الأدمن، هيبعت لليوزر ده (حط الـ ID بتاع اليوزر هنا)
        targetUserId = "3e3860ef-0b44-4342-b163-e654b3f7773f"; 
        
    } else if (currentUser.email === "user@gmail.com") {
        // لو اللي فاتح هو اليوزر العادي، هيبعت للأدمن (حط الـ ID بتاع الأدمن هنا)
        targetUserId = "6c617bf3-e7d1-4e72-9ba9-5904b6d260c9";
    }
    // ==========================================


    // 4. دالة عرض الرسالة في الشاشة
    function appendMessage(text, isSent) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isSent ? "sent" : "received"}`;

        const timeSpan = document.createElement("span");
        timeSpan.className = "time";
        const now = new Date();
        timeSpan.innerText = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        messageDiv.innerText = text;
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; 
    }

    // 5. إعداد SignalR
    const hubUrl = `${window.APP_CONFIG.API_BASE_URL}/messageHub`;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => Auth.getToken()
        })
        .withAutomaticReconnect()
        .build();

    // استقبال الرسائل
   // استقبال الرسائل بناءً على شكل الكائن الجديد
    connection.on("ReceiveMessage", (messageData) => {
        // بسبب الـ JSON Serialization في .NET، الحروف الأولى بتتحول لـ small
        // messageData هيكون شكلها كده: { id, content, sentAt, sender: { ... } }
        
        // استخراج ID المرسل (نأخذ في الاعتبار حالة الأحرف تحسباً لأي إعدادات مختلفة)
        const senderId = (messageData.sender && messageData.sender.id) ? messageData.sender.id : 
                         (messageData.Sender && messageData.Sender.Id) ? messageData.Sender.Id : null;
                         
        // استخراج نص الرسالة
        const messageText = messageData.content || messageData.Content;

        // التأكد أن الرسالة لم أقم أنا بإرسالها (عشان متتكررش مرتين في الشاشة)
        if (senderId !== currentUser.id) {
            appendMessage(messageText, false);
        }
    });

    try {
        await connection.start();
        console.log("تم الاتصال بـ SignalR بنجاح");
    } catch (err) {
        console.error("خطأ في الاتصال:", err);
    }

    // 6. إرسال رسالة
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        
        // لو مفيش رسالة مكتوبة أو مفيش targetUserId متحدد، متعملش حاجة
        if (!text || !targetUserId) return;

        messageInput.value = "";
        appendMessage(text, true);

        try {
            await connection.invoke("SendMessage", text, targetUserId);
        } catch (err) {
            console.error("خطأ في إرسال الرسالة:", err);
            appendMessage("⚠️ فشل الإرسال", false);
        }
    });

    // 7. تسجيل الخروج
    logoutBtn.addEventListener("click", () => {
        connection.stop();
        Auth.clearSession();
        window.location.href = "index.html";
    });
});