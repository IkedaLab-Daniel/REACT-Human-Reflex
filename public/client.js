const socket = io();

const reactionEl = document.getElementById("reaction");
const indicator = document.getElementById("indicator");
const history = document.getElementById("history");

let records = [];

// Power control (improved UI)
const powerBtn = document.getElementById("powerBtn");
const powerDot = document.getElementById("powerDot");
const powerLabel = document.getElementById("powerLabel");
let powerOn = false;
if (powerBtn) {
  powerBtn.addEventListener("click", () => {
    const target = powerOn ? "off" : "on";
    // show pending state and prevent rapid clicks
    powerBtn.classList.add('pending');
    powerBtn.disabled = true;
    fetch(`/power/${target}`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Power request failed");
        // rely on socket 'power_state' ACK to update UI; keep button disabled briefly as fallback
        setTimeout(() => {
          if (powerBtn.classList.contains('pending')) {
            powerBtn.classList.remove('pending');
            powerBtn.disabled = false;
          }
        }, 3000);
      })
      .catch((err) => {
        console.error(err);
        powerBtn.classList.remove('pending');
        powerBtn.disabled = false;
        alert("Failed to change power state. See console for details.");
      });
  });
}

// Sync power state from server (updated by Arduino ACKs)
socket.on('power_state', (isOn) => {
  powerOn = !!isOn;
  if (powerBtn) powerBtn.textContent = powerOn ? 'Power: On' : 'Power: Off';
});

socket.on("reaction_time", (ms) => {
  reactionEl.innerText = ms + " ms";

  // Indicator goes green on fast reaction
  if (ms < 300) indicator.style.background = "limegreen";
  else if (ms < 450) indicator.style.background = "orange";
  else indicator.style.background = "red";

  // Add to history
  records.unshift(ms);
  updateHistory();
});

function updateHistory() {
  history.innerHTML = "";
  records.slice(0, 10).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item + " ms";
    history.appendChild(li);
  });
}

// Sync power state from server (updated by Arduino ACKs)
socket.on('power_state', (isOn) => {
  powerOn = !!isOn;
  if (!powerBtn) return;
  powerBtn.classList.remove('pending');
  powerBtn.disabled = false;
  powerBtn.classList.toggle('power-on', powerOn);
  powerBtn.classList.toggle('power-off', !powerOn);
  powerBtn.setAttribute('aria-pressed', powerOn ? 'true' : 'false');
  if (powerLabel) powerLabel.textContent = powerOn ? 'Power: On' : 'Power: Off';
  if (powerDot) powerDot.style.background = powerOn ? 'limegreen' : '#ddd';
});
