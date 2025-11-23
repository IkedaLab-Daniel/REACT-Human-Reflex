const express = require("express");
const SerialPort = require("serialport").SerialPort;
const ReadlineParser = require("@serialport/parser-readline").ReadlineParser;
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let lastReaction = 0;
let powerState = false; // track current power state (start OFF)

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
  // Handle ACKs from Arduino for power state
  else if (line.startsWith("ACK:POWER_ON")) {
    powerState = true;
    console.log('Arduino ACK power ON');
    io.emit('power_state', powerState);
  } else if (line.startsWith("ACK:POWER_OFF")) {
    powerState = false;
    console.log('Arduino ACK power OFF');
    io.emit('power_state', powerState);
  }
});

// Notify connected clients of current power state on socket connect
io.on('connection', (socket) => {
  socket.emit('power_state', powerState);
});

// When serial port opens, ensure Arduino starts powered OFF
port.on('open', () => {
  console.log('Serial port opened');
  port.write('POWER_OFF\n', (err) => {
    if (err) console.error('Failed to enforce POWER_OFF on open:', err);
    else console.log('Enforced POWER_OFF on Arduino');
  });
});

// Start test (kept for compatibility)
app.post("/start", (req, res) => {
  port.write("START\n", (err) => {
    if (err) {
      console.error("Error writing to Arduino:", err);
      return res.status(500).send("Failed");
    }
    console.log("Sent START to Arduino");
    res.send("OK");
  });
});

// Power control: POST /power/on or /power/off
app.post("/power/:state", (req, res) => {
  const state = req.params.state;
  let cmd;
  if (state === "on") cmd = "POWER_ON\n";
  else if (state === "off") cmd = "POWER_OFF\n";
  else return res.status(400).send("Invalid power state");

  port.write(cmd, (err) => {
    if (err) {
      console.error("Error writing power command:", err);
      return res.status(500).send("Failed");
    }
    powerState = (state === 'on');
    console.log("Sent", cmd.trim(), "(powerState=", powerState, ")");
    res.send("OK");
  });
});

server.listen(3000, () => {
  console.log("Dashboard available at http://localhost:3000");
});
