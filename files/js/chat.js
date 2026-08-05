document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = "index.html";
        return;
    }

    const chatMessages = document.getElementById("chatMessages");
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const logoutBtn = document.getElementById("logoutBtn");
    const emptyState = document.getElementById("emptyState");
    const chatStatus = document.getElementById("chatStatus");

    const currentUser = JSON.parse(localStorage.getItem("user"));

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('userId');
    const targetUserName = urlParams.get('name');

    if (!targetUserId) {
        alert("لم يتم تحديد مستخدم للمحادثة، سيتم إرجاعك للقائمة.");
        window.location.href = "users.html";
        return;
    }

    document.getElementById("chatWith").innerText = targetUserName || "محادثة";

    const hubUrl = `${window.APP_CONFIG.API_BASE_URL}/messageHub`;
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { accessTokenFactory: () => Auth.getToken() })
        .withAutomaticReconnect()
        .build();

    let isLoggingOut = false;

    // ======= نظام الصوت =======
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playMessageSound() {
        try {
            initAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            console.log("Audio blocked by browser policy");
        }
    }

    document.body.addEventListener('click', initAudio, { once: true });
    document.body.addEventListener('keydown', initAudio, { once: true });
    // ==========================

    function updateChatStatus(userId, isOnline) {
        if (!chatStatus || userId !== targetUserId) return;
        if (isOnline) {
            chatStatus.classList.add('online');
            chatStatus.title = "متصل الآن";
        } else {
            chatStatus.classList.remove('online');
            chatStatus.title = "غير متصل";
        }
    }

    const icons = {
        trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    };

    function toggleEmptyState() {
        if (emptyState) {
            emptyState.style.display = chatMessages.children.length > 1 ? 'none' : 'flex';
        }
    }

    function appendMessage(text, isSent, messageId = null, timestamp = null) {
        if (emptyState) emptyState.style.display = 'none';

        const row = document.createElement("div");
        row.className = `message-row ${isSent ? "sent" : "received"}`;

        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isSent ? "sent" : "received"}`;
        if (messageId) messageDiv.dataset.id = messageId;

        const contentSpan = document.createElement("span");
        contentSpan.className = "message-content";
        contentSpan.innerText = text;

        const metaDiv = document.createElement("div");
        metaDiv.className = "message-meta";

        let msgDate = timestamp ? new Date(timestamp) : new Date();
        const timeStr = `${msgDate.getHours()}:${msgDate.getMinutes().toString().padStart(2, '0')}`;
        
        metaDiv.innerHTML = `<span>${timeStr}</span>`;
        if (isSent) {
            metaDiv.innerHTML += `<span class="read-status" title="تم الإرسال">${icons.check}</span>`;
        }

        messageDiv.appendChild(contentSpan);
        messageDiv.appendChild(metaDiv);

        if (isSent) {
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "message-actions";

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "action-btn";
            deleteBtn.innerHTML = icons.trash;
            deleteBtn.title = "حذف الرسالة";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                showDeleteConfirm(messageId, row, messageDiv);
            };

            actionsDiv.appendChild(deleteBtn);
            messageDiv.appendChild(actionsDiv);
        }

        row.appendChild(messageDiv);
        chatMessages.appendChild(row);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showDeleteConfirm(messageId, rowElement, messageElement) {
        document.querySelectorAll('.delete-confirm').forEach(el => el.remove());

        const confirmDiv = document.createElement("div");
        confirmDiv.className = "delete-confirm active";
        confirmDiv.innerHTML = `
            <span>حذف هذه الرسالة؟</span>
            <button class="confirm-no">إلغاء</button>
            <button class="confirm-yes">حذف</button>
        `;

        confirmDiv.querySelector('.confirm-no').onclick = () => confirmDiv.remove();
        confirmDiv.querySelector('.confirm-yes').onclick = async () => {
            if (!messageId) {
                rowElement.remove();
                toggleEmptyState();
                return;
            }
            try {
                await connection.invoke("deletemessage", messageId, currentUser.id);
                rowElement.style.transform = "translateX(20px)";
                rowElement.style.opacity = "0";
                setTimeout(() => {
                    rowElement.remove();
                    toggleEmptyState();
                }, 250);
            } catch (err) {
                console.error("خطأ في حذف الرسالة:", err);
                alert("فشل حذف الرسالة");
                confirmDiv.remove();
            }
        };

        messageElement.appendChild(confirmDiv);
    }

    async function loadChatHistory() {
        if (!targetUserId) return;
        try {
            const response = await Api.getHistory(targetUserId);
            if (response.succeeded) {
                chatMessages.innerHTML = "";
                if (emptyState) chatMessages.appendChild(emptyState);

                if (response.data.length === 0) {
                    toggleEmptyState();
                    return;
                }

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

    connection.on("ReceiveMessage", (messageData) => {
        const senderId = messageData.senderId ?? messageData.SenderId ?? messageData.sender?.id ?? messageData.Sender?.Id;
        const receiverId = messageData.receiverId ?? messageData.ReceiverId ?? messageData.recieverId ?? messageData.RecieverId;
        const messageText = messageData.message ?? messageData.Message ?? messageData.content ?? messageData.Content;
        const messageId = messageData.messageId ?? messageData.MessageId ?? messageData.id ?? messageData.Id;
        const sentAt = messageData.sentAt ?? messageData.SentAt;

        const isCurrentChat = (senderId === currentUser.id && receiverId === targetUserId) ||
                              (senderId === targetUserId && receiverId === currentUser.id);

        if (!isCurrentChat) return;

        if (senderId !== currentUser.id) {
            playMessageSound();
        }

        appendMessage(messageText, senderId === currentUser.id, messageId, sentAt);
    });

    connection.on("MessageDeleted", (deletedMessageId) => {
        const msgRow = document.querySelector(`.message[data-id='${deletedMessageId}']`)?.closest('.message-row');
        if (msgRow) {
            msgRow.style.transform = "translateX(20px)";
            msgRow.style.opacity = "0";
            setTimeout(() => {
                msgRow.remove();
                toggleEmptyState();
            }, 250);
        }
    });

    connection.on("GetOnlineUsers", (onlineUsers) => {
        if (onlineUsers && onlineUsers.length > 0) {
            const isTargetOnline = onlineUsers.some(u => {
                const uid = typeof u === 'object' ? u.id || u.Id : u;
                return uid === targetUserId;
            });
            updateChatStatus(targetUserId, isTargetOnline);
        }
    });

    connection.on("UserConnected", (onlineUserId) => {
        updateChatStatus(onlineUserId, true);
    });

    connection.on("UserDisconnected", (offlineUserId) => {
        updateChatStatus(offlineUserId, false);
    });

    try {
        await connection.start();
        console.log("تم الاتصال بـ SignalR بنجاح");
        await loadChatHistory();
        await connection.invoke("onlineusers", currentUser.id);
    } catch (err) {
        console.error("خطأ في الاتصال:", err);
    }

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !targetUserId) return;

        messageInput.value = "";
        try {
            await connection.invoke("SendMessage", text, targetUserId);
        } catch (err) {
            console.error("خطأ في إرسال الرسالة:", err);
            if (!isLoggingOut) alert("فشل إرسال الرسالة");
        }
    });

    logoutBtn.addEventListener("click", async () => {
        isLoggingOut = true;
        logoutBtn.disabled = true;
        try { await connection.stop(); } catch { }
        Auth.clearSession();
        window.location.href = "index.html";
    });
});