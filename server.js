const express = require("express");
const SerialPort = require("serialport").SerialPort;
const ReadlineParser = require("@serialport/parser-readline").ReadlineParser;
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let lastReaction = 0;

// Serve dashboard UI
app.use(express.static("public"));

// Arduino Serial Connection
const port = new SerialPort({
  path: "/dev/cu.usbserial-1120", // adjust for your mac
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (line) => {
  line = line.trim();
  
  if (line.startsWith("REACTION:")) {
    const value = parseInt(line.split(":")[1]);
    lastReaction = value;

    console.log("Reaction:", value);

    // broadcast to dashboard
    io.emit("reaction_time", value);
  }
});

server.listen(3000, () => {
  console.log("Dashboard available at http://localhost:3000");
});
