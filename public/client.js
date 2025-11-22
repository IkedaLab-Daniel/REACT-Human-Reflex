const socket = io();

const reactionEl = document.getElementById("reaction");
const indicator = document.getElementById("indicator");
const history = document.getElementById("history");
const avgTimeEl = document.getElementById("avgTime");
const bestTimeEl = document.getElementById("bestTime");
const totalTestsEl = document.getElementById("totalTests");

let reactionRecords = []; // Store full record objects with _id
let currentUser = null;

// Check authentication status on load
checkAuth();

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      onAuthenticated();
    } else {
      showAuthModal();
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    showAuthModal();
  }
}

function onAuthenticated() {
  hideAuthModal();
  
  // Authenticate socket connection
  socket.emit('authenticate', { userId: currentUser.id });
  
  // Show user info
  updateUserDisplay();
  
  // Load stats and history
  loadStats();
  loadHistory();
}

function updateUserDisplay() {
  const userDisplayEl = document.getElementById('userDisplay');
  if (userDisplayEl && currentUser) {
    userDisplayEl.innerHTML = `
      <span>👤 ${currentUser.username}</span>
      <button onclick="showLeaderboard()" class="leaderboard-btn">🏆 Leaderboard</button>
      <button onclick="logout()" class="logout-btn">Logout</button>
    `;
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const stats = await res.json();
      if (avgTimeEl) avgTimeEl.textContent = stats.average ? `${stats.average}ms` : '—';
      if (bestTimeEl) bestTimeEl.textContent = stats.best ? `${stats.best}ms` : '—';
      if (totalTestsEl) totalTestsEl.textContent = stats.total || '0';
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/reactions?limit=50');
    if (res.ok) {
      const data = await res.json();
      reactionRecords = data.reactions; // Store full objects
      updateHistory();
    }
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

// Power control
const powerBtn = document.getElementById("powerBtn");
const powerDot = document.getElementById("powerDot");
const powerLabel = document.getElementById("powerLabel");
let powerOn = false;

if (powerBtn) {
  powerBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert('Please log in first');
      return;
    }
    
    const target = powerOn ? "off" : "on";
    powerBtn.classList.add('pending');
    powerBtn.disabled = true;
    
    fetch(`/power/${target}`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Power request failed");
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
        alert("Failed to change power state");
      });
  });
}

// Socket events
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

socket.on("reaction_time", async (ms) => {
  if (!currentUser) return;
  
  reactionEl.innerText = ms + " ms";
  indicator.classList.remove('active', 'success');
  indicator.classList.add('success');

  // Color coding
  if (ms < 300) indicator.style.background = "limegreen";
  else if (ms < 450) indicator.style.background = "orange";
  else indicator.style.background = "red";

  // Save to database
  try {
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionTime: ms })
    });
    
    if (res.ok) {
      const data = await res.json();
      reactionRecords.unshift(data.reaction); // Add full record object
      updateHistory();
      loadStats(); // Refresh statistics
    }
  } catch (err) {
    console.error('Failed to save reaction:', err);
  }
});

socket.on('history_loaded', (reactions) => {
  reactionRecords = reactions; // Store full objects
  updateHistory();
});

function updateHistory() {
  if (!history) return;
  
  if (reactionRecords.length === 0) {
    history.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>No reaction times recorded yet</div>
      </div>
    `;
    return;
  }
  
  history.innerHTML = "";
  reactionRecords.slice(0, 10).forEach((record) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="history-time">${record.reactionTime}ms</span>
      <span class="history-label">${getPerformanceLabel(record.reactionTime)}</span>
      <button class="delete-btn" onclick="deleteReaction('${record._id}')" title="Delete">×</button>
    `;
    history.appendChild(li);
  });
}

function getPerformanceLabel(ms) {
  if (ms < 250) return '🔥 Lightning';
  if (ms < 350) return '⚡ Fast';
  if (ms < 450) return '✓ Good';
  if (ms < 600) return '○ Average';
  return '○ Slow';
}

// ========== AUTH MODAL ==========

function showAuthModal() {
  let modal = document.getElementById('authModal');
  if (!modal) {
    modal = createAuthModal();
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
}

function createAuthModal() {
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <h2>Welcome to REACT</h2>
      <p class="auth-subtitle">Test and track your reaction time</p>
      
      <div class="auth-tabs">
        <button class="auth-tab active" onclick="showLoginForm()">Login</button>
        <button class="auth-tab" onclick="showRegisterForm()">Register</button>
      </div>
      
      <form id="loginForm" class="auth-form">
        <div class="form-group">
          <label>Username or Email</label>
          <input type="text" id="loginUsername" required autocomplete="username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPassword" required autocomplete="current-password">
        </div>
        <button type="submit" class="auth-btn">Login</button>
        <div id="loginError" class="error-message"></div>
      </form>
      
      <form id="registerForm" class="auth-form" style="display:none;">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="regUsername" required autocomplete="username">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="regEmail" required autocomplete="email">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="regPassword" required autocomplete="new-password" minlength="6">
        </div>
        <button type="submit" class="auth-btn">Create Account</button>
        <div id="registerError" class="error-message"></div>
      </form>
    </div>
  `;
  
  // Login form handler
  modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        currentUser = data.user;
        onAuthenticated();
      } else {
        errorEl.textContent = data.error || 'Login failed';
      }
    } catch (err) {
      errorEl.textContent = 'Network error. Please try again.';
    }
  });
  
  // Register form handler
  modal.querySelector('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('registerError');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        currentUser = data.user;
        onAuthenticated();
      } else {
        errorEl.textContent = data.error || 'Registration failed';
      }
    } catch (err) {
      errorEl.textContent = 'Network error. Please try again.';
    }
  });
  
  return modal;
}

function showLoginForm() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.querySelectorAll('.auth-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 0);
  });
}

function showRegisterForm() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.querySelectorAll('.auth-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 1);
  });
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    reactionRecords = [];
    updateHistory();
    showAuthModal();
    
    const userDisplayEl = document.getElementById('userDisplay');
    if (userDisplayEl) userDisplayEl.innerHTML = '';
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// Delete reaction
async function deleteReaction(id) {
  if (!confirm('Delete this reaction time?')) return;
  
  try {
    const res = await fetch(`/api/reactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      reactionRecords = reactionRecords.filter(r => r._id !== id);
      updateHistory();
      loadStats();
    } else {
      alert('Failed to delete reaction');
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Failed to delete reaction');
  }
}

// Show leaderboard
async function showLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Failed to load leaderboard');
    
    const data = await res.json();
    displayLeaderboardModal(data.leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    alert('Failed to load leaderboard');
  }
}

function displayLeaderboardModal(leaderboard) {
  let modal = document.getElementById('leaderboardModal');
  if (modal) modal.remove();
  
  modal = document.createElement('div');
  modal.id = 'leaderboardModal';
  modal.className = 'leaderboard-modal';
  
  let tableRows = '';
  leaderboard.forEach((entry, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    const isCurrentUser = currentUser && entry.username === currentUser.username;
    const highlightClass = isCurrentUser ? 'highlight-user' : '';
    
    tableRows += `
      <tr class="${highlightClass}">
        <td class="rank-cell">${medal}</td>
        <td class="username-cell">${entry.username}${isCurrentUser ? ' (You)' : ''}</td>
        <td class="time-cell">${entry.bestTime}ms</td>
        <td class="avg-cell">${entry.avgTime}ms</td>
        <td class="tests-cell">${entry.totalTests}</td>
      </tr>
    `;
  });
  
  modal.innerHTML = `
    <div class="leaderboard-modal-content">
      <div class="leaderboard-header">
        <h2>🏆 Global Leaderboard</h2>
        <button class="close-btn" onclick="closeLeaderboard()">×</button>
      </div>
      <div class="leaderboard-body">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Best Time</th>
              <th>Avg Time</th>
              <th>Tests</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5" class="no-data">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}