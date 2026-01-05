let socket;
let username = "User" + Math.floor(Math.random() * 1000);

let messageDiv = document.getElementById("messages");
let input = document.getElementById("messageInput");
let typingDiv = document.getElementById("typing");
let userDiv = document.getElementById("online");
let userList = document.getElementById("usersList");

let myVideo = document.getElementById("myVideo");
let remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peer;
let remoteUser = null;


// -------- CAMERA --------
document.addEventListener("DOMContentLoaded", async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  myVideo.srcObject = localStream;
});


// -------- CONNECT SOCKET --------
socket = new WebSocket(
  location.origin.replace("http", "ws")
);

socket.onopen = () => {

  addMessage("🟢 Connected");

  socket.send(JSON.stringify({
    type: "join",
    user: username
  }));
};

socket.onmessage = (event) => handleMessage(event);

socket.onclose = () => {
  addMessage("🔴 Disconnected");
};


// -------- CHAT UI --------
input.addEventListener("keyup", e => {
  if (e.key === "Enter") sendMessage();
});

function addMessage(msg) {
  let p = document.createElement("p");
  p.innerText = msg;
  messageDiv.appendChild(p);
  messageDiv.scrollTop = messageDiv.scrollHeight;
}


// -------- UPDATE USER LIST --------
function updateUserList(arr) {
  userList.innerHTML = "";
  arr.forEach(u => {
    if (u === username) return; // don't show yourself
    let opt = document.createElement("option");
    opt.value = opt.innerText = u;
    userList.appendChild(opt);
  });
}


// -------- HANDLE SIGNAL MESSAGES --------
async function handleMessage(event) {

  const msg = JSON.parse(event.data);


  if (msg.online) {
    updateUserList(msg.online);
    userDiv.innerText = msg.online.join(", ");
  }

  if (msg.type === "chat") {
    addMessage(`${msg.user}: ${msg.text}`);
  }

  if (msg.type === "join") {
    addMessage(`🔵 ${msg.user} joined`);
  }

  if (msg.type === "leave") {
    addMessage(`🔴 ${msg.user} left`);
  }


  // --- OFFER RECEIVED ---
  if (msg.type === "offer" && msg.to === username) {

    remoteUser = msg.from;

    let accept = confirm(`${msg.from} is calling you. Accept?`);

    if (!accept) return;

    await handleOffer(msg.offer);
  }


  // --- ANSWER RECEIVED ---
  if (msg.type === "answer" && msg.to === username) {

    await peer.setRemoteDescription(
      new RTCSessionDescription(msg.answer)
    );
  }


  // --- ICE CANDIDATE RECEIVED ---
  if (msg.type === "ice" && msg.to === username && peer) {

    await peer.addIceCandidate(msg.candidate);
  }
}



// -------- SEND CHAT --------
function sendMessage() {

  socket.send(JSON.stringify({
    type: "chat",
    user: username,
    text: input.value
  }));

  input.value = "";
}



// -------- PEER CONNECTION --------
function createConnection() {

  peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  // ICE Routing
  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.send(JSON.stringify({
        type: "ice",
        candidate: e.candidate,
        from: username,
        to: remoteUser
      }));
    }
  };

  // Remote stream received
  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  // Send local media
  localStream.getTracks().forEach(track =>
    peer.addTrack(track, localStream)
  );
}



// -------- START CALL --------
async function startCall() {

  remoteUser = userList.value;

  if (!remoteUser) return alert("Select a user to call");

  createConnection();

  let offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.send(JSON.stringify({
    type: "offer",
    offer,
    from: username,
    to: remoteUser
  }));
}



// -------- HANDLE OFFER --------
async function handleOffer(offer) {

  createConnection();

  await peer.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  let answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.send(JSON.stringify({
    type: "answer",
    answer,
    from: username,
    to: remoteUser
  }));
}
