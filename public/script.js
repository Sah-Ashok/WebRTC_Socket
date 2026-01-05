let userList = document.getElementById("usersList");
let socket;
let username = "User" + Math.floor(Math.random() * 1000);
let isConnected = false;
let messageDiv = document.getElementById("messages");
let input = document.getElementById("messageInput");
let typing = false;
let typingTimeout = null;
let typingDiv = document.getElementById("typing");
let userDiv = document.getElementById("online");
let localStream;
let peer;
let remoteVideo = document.getElementById("remoteVideo");
let myVideo = document.getElementById("myVideo");

document.addEventListener("DOMContentLoaded", (e) => {
  getCameraStream();
});

function updateUserList(arr) {
  userList.innerHTML = "";
  arr.forEach((U) => {
    let opt = document.createElement("option");
    opt.value = U;
    opt.innerText = U;
    userList.appendChild(opt);
  });
}

async function getCameraStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  myVideo.srcObject = localStream;
}

input.addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
});

function addMessage(msg) {
  let p = document.createElement("p");
  p.innerText = msg;
  messageDiv.appendChild(p);
}

function connect() {
  socket = new WebSocket("https://webrtc-sockets-huf8degqe5drfrbc.eastasia-01.azurewebsites.net");

  socket.onopen = () => {
    isConnected = true;
    addMessage("🟢 Connected to Server");

    socket.send(
      JSON.stringify({
        type: "join",
        user: username,
      })
    );
  };

  socket.onmessage = (event) => handleMessage(event);

  socket.onclose = () => {
    isConnected = false;
    addMessage("🔴 Disconnected - retrying in 2 seconds...");
    setTimeout(connect, 2000);
  };

  socket.onerror = (error) => {
    addMessage("⚠️ Connection error");
  };
}

connect();

async function handleMessage(event) {
  let msg = JSON.parse(event.data);
  if (msg.online) {
    updateUserList(msg.online);
    userDiv.innerText = msg.online.join(", ");
  }

  if (msg.type === "ice" && peer) {
    try {
      await peer.addIceCandidate(msg.candidate);
    } catch (err) {
      console.error("Error adding received ice candidate", err);
    }
  }

  if (msg.type === "answer") {
    await peer.setRemoteDescription(new RTCSessionDescription(msg.answer));
  }

  if (msg.type === "offer" && msg.to === username) {
    let accept = confirm(`${msg.from} is calling you. Accept?`);
    if (!accept) {
      return;
    }
    await handleOffer(msg.offer);
  }

  if (msg.type === "join") {
    addMessage(`🔵 ${msg.user} joined the chat`);
  } else if (msg.type === "chat") {
    addMessage(`${msg.user}: ${msg.text}`);
  } else if (msg.type === "leave") {
    addMessage(`🔴 ${msg.user} left the chat`);
  } else if (msg.type === "typing") {
    typingDiv.innerText = msg.user + "is typing...";
  } else if (msg.type === "stopTyping") {
    typingDiv.innerText = "";
  }
}

function sendMessage() {
  if (!isConnected) {
    alert("Not Connected to server");
    return;
  }

  let message = {
    type: "chat",
    user: username,
    text: input.value,
  };
  socket.send(JSON.stringify(message));
  input.value = "";
}

// WebRTC Call Functions
function createConnection() {
  peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // free STUN server
    ],
  });

  // Send ICE candidates to remote peer
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          type: "ice",
          candidate: event.candidate,
        })
      );
    }
  };

  // When remote stream arrives
  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Add local stream tracks to peer connection
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });
}

async function startCall() {
  let target = userList.value;

  if (!target) {
    alert("Select a user to call ");
    return;
  }

  createConnection();
  //create offer
  let offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  //send offer view websocket
  socket.send(
    JSON.stringify({
      type: "offer",
      offer: offer,
      from: username,
      to: target,
    })
  );
}

async function handleOffer(offer) {
  //Ensure camera is running
  if (!localStream) {
    await getCameraStream();
  }

  // Create peer connection
  createConnection();
  // Set caller's sdp
  await peer.setRemoteDescription(new RTCSessionDescription(offer));

  //create answer sdp
  let answer = await peer.createAnswer();

  await peer.setLocalDescription(answer);

  //Send back to the Server
  socket.send(
    JSON.stringify({
      type: "answer",
      answer: answer,
      from: username,
      to: caller,
    })
  );
}
