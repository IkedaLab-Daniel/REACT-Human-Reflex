const socket = io();

socket.on("button_state", (state) => {
  document.getElementById("state").innerText = state;
});
