const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginPrompt = document.getElementById('loginPrompt');
const chatContainer = document.getElementById('chatContainer');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const conversationsSection = document.getElementById('conversationsSection');
const conversationsList = document.getElementById('conversationsList');
const newChatBtn = document.getElementById('newChatBtn');
const chatTitle = document.getElementById('chatTitle');

let currentUser = null;
let currentConversationId = null;

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert('Заполни email и пароль!');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        emailInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
});

registerBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert('Заполни email и пароль!');
        return;
    }

    if (password.length < 6) {
        alert('Пароль должен быть минимум 6 символов!');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        emailInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        alert('Ошибка выхода: ' + error.message);
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginPrompt.style.display = 'none';
        chatContainer.style.display = 'flex';
        conversationsSection.style.display = 'block';
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        loadConversations();
        createDefaultConversation();
    } else {
        currentUser = null;
        loginPrompt.style.display = 'flex';
        chatContainer.style.display = 'none';
        conversationsSection.style.display = 'none';
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        messagesArea.innerHTML = '';
        conversationsList.innerHTML = '';
    }
});

async function createDefaultConversation() {
    try {
        const q = query(collection(db, 'conversations'), where('userId', '==', currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                addDoc(collection(db, 'conversations'), {
                    userId: currentUser.uid,
                    name: 'Основной чат',
                    createdAt: serverTimestamp()
                });
            }
        });
    } catch (error) {
        console.error('Ошибка создания чата:', error);
    }
}

function loadConversations() {
    const q = query(
        collection(db, 'conversations'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        conversationsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const conv = doc.data();
            const div = document.createElement('div');
            div.className = 'conversation-item';
            if (currentConversationId === doc.id) div.classList.add('active');
            div.textContent = conv.name;
            div.addEventListener('click', () => selectConversation(doc.id, conv.name));
            conversationsList.appendChild(div);
        });
    });
}

function selectConversation(convId, convName) {
    currentConversationId = convId;
    chatTitle.textContent = convName;
    messagesArea.innerHTML = '';
    loadMessages();
    
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
}

function loadMessages() {
    if (!currentConversationId) return;

    const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', currentConversationId),
        orderBy('timestamp', 'asc')
    );

    onSnapshot(q, (snapshot) => {
        messagesArea.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            displayMessage(msg);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

function displayMessage(msg) {
    const div = document.createElement('div');
    const isOwn = msg.userId === currentUser.uid;
    div.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
    
    const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ru-RU') : '';
    
    div.innerHTML = `
        <div>${msg.text}</div>
        <div class="message-info">${time}</div>
    `;
    
    messagesArea.appendChild(div);
}

sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();

    if (!text || !currentConversationId) {
        alert('Напиши сообщение и выбери чат!');
        return;
    }

    try {
        await addDoc(collection(db, 'messages'), {
            conversationId: currentConversationId,
            userId: currentUser.uid,
            text: text,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        alert('Ошибка отправки: ' + error.message);
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

newChatBtn.addEventListener('click', async () => {
    const chatName = prompt('Введи имя чата:');
    if (chatName) {
        try {
            await addDoc(collection(db, 'conversations'), {
                userId: currentUser.uid,
                name: chatName,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            alert('Ошибка создания чата: ' + error.message);
        }
    }
});