const express = require("express");
const SerialPort = require("serialport").SerialPort;
const ReadlineParser = require("@serialport/parser-readline").ReadlineParser;
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let buttonState = "UNKNOWN";

// ---- Serve Dashboard HTML ----
app.use(express.static("public"));

// ---- Connect to Arduino ----
const port = new SerialPort({
  path: "/dev/cu.usbserial-1120", // adjust this
  baudRate: 9600,
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (data) => {
  buttonState = data.trim();
  console.log("Button:", buttonState);

  // Send to all clients
  io.emit("button_state", buttonState);
});

// ---- Start Server ----
server.listen(3001, () => {
  console.log("Dashboard running at http://localhost:3001");
});
