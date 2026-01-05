const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3000 });

const users = new Map();     // socket -> username
const sockets = new Map();   // username -> socket

console.log("WebSocket server started on ws://localhost:3000");

server.on('connection', (socket) => {

  socket.on('message', (data) => {

    const msg = JSON.parse(data.toString());

    // JOIN
    if (msg.type === "join") {

      users.set(socket, msg.user);
      sockets.set(msg.user, socket);

      broadcast({
        type: "join",
        user: msg.user,
        online: Array.from(sockets.keys())
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

    // OFFER -> send ONLY to target
    else if (msg.type === "offer") {
      sendToUser(msg.to, msg);
    }

    // ANSWER
    else if (msg.type === "answer") {
      sendToUser(msg.to, msg);
    }

    // ICE CANDIDATE
    else if (msg.type === "ice") {
      sendToUser(msg.to, msg);
    }

  });


  socket.on('close', () => {

    const username = users.get(socket);

    users.delete(socket);
    sockets.delete(username);

    if (username) {
      broadcast({
        type: "leave",
        user: username,
        online: Array.from(sockets.keys())
      });
    }
  });

});


// --- Helper Functions ---

function broadcast(obj) {

  const msg = JSON.stringify(obj);

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });

}

function sendToUser(username, message) {

  const userSocket = sockets.get(username);

  if (userSocket) {
    userSocket.send(JSON.stringify(message));
  }
}
