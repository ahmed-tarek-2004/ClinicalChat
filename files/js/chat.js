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

    // ==========================================
    // 3. تحديد الشخص اللي هنبعتله بناءً على الرابط (URL Parameters)
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('userId');
    const targetUserName = urlParams.get('name');

    //     console.log(window.location.href);
    // console.log("targetUserId =", targetUserId);
    // console.log("currentUserId =", currentUser.id);
    // console.log("المستخدم اللي هنتكلم معاه:", targetUserId, targetUserName);
    // إذا لم يكن هناك ID في الرابط، نعيده لصفحة المستخدمين
    if (!targetUserId) {
        alert("لم يتم تحديد مستخدم للمحادثة، سيتم إرجاعك للقائمة.");
        window.location.href = "users.html";
        return;
    }

    // تحديث عنوان الشات ليعرض اسم الشخص الذي تحادثه
    document.getElementById("chatWith").innerText = `محادثة مع: ${targetUserName}`;
    // ==========================================

    // إعداد SignalR
    const hubUrl = `${window.APP_CONFIG.API_BASE_URL}/messageHub`;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => Auth.getToken()
        })
        .withAutomaticReconnect()
        .build();

    // 4. دالة عرض الرسالة في الشاشة مع زر الحذف للمرسل
    function appendMessage(text, isSent, messageId = null, timestamp = null) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isSent ? "sent" : "received"}`;

        if (messageId) {
            messageDiv.dataset.id = messageId;
        }

        const contentSpan = document.createElement("span");
        contentSpan.className = "message-content";
        contentSpan.innerText = text;

        const timeSpan = document.createElement("span");
        timeSpan.className = "time";

        let msgDate = timestamp ? new Date(timestamp) : new Date();
        timeSpan.innerText = `${msgDate.getHours()}:${msgDate.getMinutes().toString().padStart(2, '0')}`;

        messageDiv.appendChild(contentSpan);
        messageDiv.appendChild(timeSpan);

        // إضافة زر الحذف للرسائل المرسلة من قبلي
        if (isSent) {
            const controlsDiv = document.createElement("div");
            controlsDiv.className = "msg-controls";

            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "🗑️";
            deleteBtn.title = "حذف الرسالة";
            deleteBtn.onclick = () => deleteMessage(messageId, messageDiv);

            controlsDiv.appendChild(deleteBtn);
            messageDiv.appendChild(controlsDiv);
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 5. دالة جلب سجل الرسائل
    async function loadChatHistory() {
        if (!targetUserId) return;
        try {
            const response = await Api.getHistory(targetUserId);

            if (response.succeeded) {
                chatMessages.innerHTML = "";

                response.data.forEach(msg => {
                    appendMessage(
                        msg.message,
                        msg.senderId === currentUser.id,
                        msg.messageId,
                        msg.sentAt
                    );
                });
            }
        } catch (error) {
            console.error("فشل تحميل سجل الرسائل:", error);
        }
    }

    // 6. دالة حذف الرسالة
    async function deleteMessage(messageId, messageElement) {
        // إذا لم يكن للرسالة ID بعد (تم إرسالها للتو ولم نستلم الرد)، نقوم بحذفها من الشاشة فقط
        if (!messageId) {
            messageElement.remove();
            return;
        }

        try {
            await connection.invoke("DeleteMessage", messageId);
            messageElement.remove();
        } catch (err) {
            console.error("خطأ في حذف الرسالة:", err);
            alert("فشل حذف الرسالة");
        }
    }

    // استقبال الرسائل
    connection.on("ReceiveMessage", (messageData) => {
        const senderId = (messageData.sender && messageData.sender.id) ? messageData.sender.id :
            (messageData.Sender && messageData.Sender.Id) ? messageData.Sender.Id : null;

        const messageText = messageData.content || messageData.Content;
        const msgId = messageData.id || messageData.Id;
        const sentAt = messageData.sentAt || messageData.SentAt;

        // if (senderId !== currentUser.id) {
        appendMessage(messageText, false, msgId, sentAt);
        // }
    });

    // استقبال حدث الحذف من الطرف الآخر
    connection.on("MessageDeleted", (deletedMessageId) => {
        const msgElement = document.querySelector(`.message[data-id='${deletedMessageId}']`);
        if (msgElement) {
            msgElement.remove();
        }
    });

    // بدء الاتصال بـ SignalR وتحميل السجل
    try {
        await connection.start();
        console.log("تم الاتصال بـ SignalR بنجاح");

        // بمجرد نجاح الاتصال، نقوم بتحميل السجل
        await loadChatHistory();
    } catch (err) {
        console.error("خطأ في الاتصال:", err);
    }

    // 7. إرسال رسالة
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();


        if (!text || !targetUserId) return;

        messageInput.value = "";

        // عرض الرسالة محلياً فوراً (بدون ID حالياً حتى يأتي الرد من السيرفر)
        appendMessage(text, true);
        console.log("إرسال رسالة:", text, "إلى:", targetUserId);
        try {
            console.log("Invoking sendmessage with text:", text, "and targetUserId:", targetUserId);
            await connection.invoke("sendmessage", text, targetUserId);
            console.log("end");

        } catch (err) {
            console.error("خطأ في إرسال الرسالة:", err);
            appendMessage("⚠️ فشل الإرسال", false);
        }
    });

    // 8. تسجيل الخروج
    logoutBtn.addEventListener("click", () => {
        connection.stop();
        Auth.clearSession();
        window.location.href = "index.html";
    });
});