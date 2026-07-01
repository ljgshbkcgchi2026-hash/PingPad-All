import { app } from "./firebase-config.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const loginPrompt = document.getElementById("loginPrompt");
const chatContainer = document.getElementById("chatContainer");

const conversationsSection = document.getElementById("conversationsSection");
const conversationsList = document.getElementById("conversationsList");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesArea = document.getElementById("messagesArea");
const newChatBtn = document.getElementById("newChatBtn");

let currentUser = null;
let currentConversationId = null;

registerBtn.onclick = async () => {
    try{
        await createUserWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
        );

        alert("Аккаунт создан!");
    }
    catch(e){
        alert(e.message);
    }
};

loginBtn.onclick = async () => {
    try{
        await signInWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
        );
    }
    catch(e){
        alert(e.message);
    }
};

logoutBtn.onclick = async () => {
    await signOut(auth);
};

onAuthStateChanged(auth,(user)=>{

    if(user){
        currentUser=user;

        loginPrompt.style.display="none";
        chatContainer.style.display="block";
        conversationsSection.style.display="block";

        loginBtn.style.display="none";
        registerBtn.style.display="none";
        logoutBtn.style.display="block";

        loadChats();
    }
    else{
        currentUser=null;

        loginPrompt.style.display="block";
        chatContainer.style.display="none";
        conversationsSection.style.display="none";

        loginBtn.style.display="block";
        registerBtn.style.display="block";
        logoutBtn.style.display="none";
    }

});

newChatBtn.onclick = async () => {

    const name = prompt("Название чата:");

    if(!name) return;

    await addDoc(collection(db,"conversations"),{
        userId:currentUser.uid,
        name:name,
        createdAt:serverTimestamp()
    });

};

function loadChats(){

    const q=query(
        collection(db,"conversations"),
        where("userId","==",currentUser.uid)
    );

    onSnapshot(q,(snapshot)=>{

        conversationsList.innerHTML="";

        snapshot.forEach((docu)=>{

            const data=docu.data();

            const div=document.createElement("div");
            div.textContent=data.name;
            div.className="conversation-item";

            div.onclick=()=>{
                currentConversationId=docu.id;
                loadMessages();
            };

            conversationsList.appendChild(div);
        });

    });
}

function loadMessages(){

    const q=query(
        collection(db,"messages"),
        where("conversationId","==",currentConversationId),
        orderBy("timestamp")
    );

    onSnapshot(q,(snapshot)=>{

        messagesArea.innerHTML="";

        snapshot.forEach((docu)=>{
            const msg=docu.data();

            const div=document.createElement("div");

            div.className=
                msg.userId===currentUser.uid
                ?"message message-own"
                :"message message-other";

            div.textContent=msg.text;

            messagesArea.appendChild(div);
        });

    });

}

sendBtn.onclick = async ()=>{

    if(!messageInput.value) return;
    if(!currentConversationId) return;

    await addDoc(collection(db,"messages"),{
        conversationId:currentConversationId,
        userId:currentUser.uid,
        text:messageInput.value,
        timestamp:serverTimestamp()
    });

    messageInput.value="";
};

messageInput.addEventListener("keypress",(e)=>{
    if(e.key==="Enter"){
        sendBtn.click();
    }
});