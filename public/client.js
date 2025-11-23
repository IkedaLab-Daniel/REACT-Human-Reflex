const socket = io();

const reactionEl = document.getElementById("reaction");
const indicator = document.getElementById("indicator");
const history = document.getElementById("history");

let records = [];

// Power control
const powerBtn = document.getElementById("powerBtn");
let powerOn = false;
if (powerBtn) {
  powerBtn.addEventListener("click", () => {
    const target = powerOn ? "off" : "on";
    fetch(`/power/${target}`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Power request failed");
        powerOn = !powerOn;
        powerBtn.textContent = powerOn ? "Power: On" : "Power: Off";
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to change power state. See console for details.");
      });
  });
}

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
