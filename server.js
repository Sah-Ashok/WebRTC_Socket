const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(cors());
// ----- STATIC PUBLIC FOLDER -----
app.use(express.static(path.join(__dirname, "public")));

// OPTIONAL: default route (serves index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ----- CREATE HTTP SERVER -----
const port = process.env.PORT || 3000;
const server = http.createServer(app);

// ----- ATTACH WEBSOCKET SERVER -----
const wss = new WebSocket.Server({ server });

// ----- USER MAPS -----
const users = new Map(); // socket -> username
const sockets = new Map(); // username -> socket

console.log("Starting WebSocket + Express server...");

// ----- WEBSOCKET HANDLERS -----
wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    // JOIN
    if (msg.type === "join") {
      users.set(socket, msg.user);
      sockets.set(msg.user, socket);

      broadcast({
        type: "join",
        user: msg.user,
        online: Array.from(sockets.keys()),
      });
    }

    // CHAT
    else if (msg.type === "chat") {
      broadcast(msg);
    }

    // TYPING
    else if (msg.type === "typing" || msg.type === "stopTyping") {
      broadcast(msg);
    }

    // OFFER — send only to target
    else if (msg.type === "offer") {
      sendToUser(msg.to, msg);
    }

    // ANSWER
    else if (msg.type === "answer") {
      sendToUser(msg.to, msg);
    }

    // ICE
    else if (msg.type === "ice") {
      sendToUser(msg.to, msg);
    }
  });

  // USER DISCONNECT
  socket.on("close", () => {
    const username = users.get(socket);

    users.delete(socket);
    sockets.delete(username);

    if (username) {
      broadcast({
        type: "leave",
        user: username,
        online: Array.from(sockets.keys()),
      });
    }
  });
});

// ----- BROADCAST TO ALL USERS -----
function broadcast(obj) {
  const msg = JSON.stringify(obj);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ----- SEND TO SPECIFIC USER -----
function sendToUser(username, message) {
  const sock = sockets.get(username);

  if (sock?.readyState === WebSocket.OPEN) {
    sock.send(JSON.stringify(message));
  }
}

// ----- START SERVER -----
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
