const socket = io();

const reactionEl = document.getElementById("reaction");
const indicator = document.getElementById("indicator");
const history = document.getElementById("history");
const avgTimeEl = document.getElementById("avgTime");
const bestTimeEl = document.getElementById("bestTime");
const totalTestsEl = document.getElementById("totalTests");

let reactionRecords = []; // Store full record objects with _id
let currentUser = null;

// Audio System
const AudioSystem = {
  context: null,
  masterGain: null,
  bgMusic: null,
  isMusicPlaying: false,
  isMuted: false,
  
  init() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.context.destination);
  },
  
  // Game Boy style beep sound
  playBeep(frequency = 440, duration = 0.1, type = 'square') {
    if (this.isMuted) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.context.currentTime);
    osc.stop(this.context.currentTime + duration);
  },
  
  // Click/button press sound
  playClick() {
    this.playBeep(800, 0.05, 'square');
  },
  
  // Power on sound
  playPowerOn() {
    this.playBeep(400, 0.1, 'square');
    setTimeout(() => this.playBeep(600, 0.1, 'square'), 100);
    setTimeout(() => this.playBeep(800, 0.15, 'square'), 200);
  },
  
  // Power off sound
  playPowerOff() {
    this.playBeep(800, 0.1, 'square');
    setTimeout(() => this.playBeep(600, 0.1, 'square'), 100);
    setTimeout(() => this.playBeep(400, 0.15, 'square'), 200);
  },
  
  // Success/reaction recorded sound
  playSuccess() {
    this.playBeep(523, 0.1, 'square'); // C
    setTimeout(() => this.playBeep(659, 0.1, 'square'), 100); // E
    setTimeout(() => this.playBeep(784, 0.2, 'square'), 200); // G
  },
  
  // Fast reaction (under 300ms)
  playFastReaction() {
    this.playBeep(1047, 0.08, 'square'); // C
    setTimeout(() => this.playBeep(1319, 0.08, 'square'), 80); // E
    setTimeout(() => this.playBeep(1568, 0.08, 'square'), 160); // G
    setTimeout(() => this.playBeep(2093, 0.15, 'square'), 240); // C
  },
  
  // Delete sound
  playDelete() {
    this.playBeep(800, 0.08, 'sawtooth');
    setTimeout(() => this.playBeep(600, 0.08, 'sawtooth'), 80);
    setTimeout(() => this.playBeep(400, 0.12, 'sawtooth'), 160);
  },
  
  // Game Boy background music loop
  startBackgroundMusic() {
    if (this.isMusicPlaying || this.isMuted) return;
    this.isMusicPlaying = true;
    this.playMusicLoop();
  },
  
  stopBackgroundMusic() {
    this.isMusicPlaying = false;
  },
  
  playMusicLoop() {
    if (!this.isMusicPlaying) return;
    
    // Simple Game Boy style melody
    const melody = [
      { freq: 523, dur: 0.2 },  // C
      { freq: 659, dur: 0.2 },  // E
      { freq: 784, dur: 0.2 },  // G
      { freq: 659, dur: 0.2 },  // E
      { freq: 698, dur: 0.3 },  // F
      { freq: 784, dur: 0.3 },  // G
      { freq: 880, dur: 0.4 },  // A
      { freq: 0, dur: 0.2 },    // Rest
    ];
    
    let time = 0;
    melody.forEach(note => {
      if (note.freq > 0) {
        setTimeout(() => {
          if (this.isMusicPlaying) {
            this.playBeep(note.freq, note.dur * 0.8, 'square');
          }
        }, time * 1000);
      }
      time += note.dur;
    });
    
    // Loop after melody finishes
    setTimeout(() => {
      if (this.isMusicPlaying) this.playMusicLoop();
    }, time * 1000 + 500);
  },
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    }
    return this.isMuted;
  }
};

// Initialize audio on first user interaction
let audioInitialized = false;
function initAudio() {
  if (!audioInitialized) {
    AudioSystem.init();
    audioInitialized = true;
    console.log('🔊 Audio system initialized');
  }
}

// Add audio controls to UI
function createAudioControls() {
  const controls = document.createElement('div');
  controls.className = 'audio-controls';
  controls.innerHTML = `
    <button id="musicToggle" class="audio-btn" title="Toggle Music">
      🎵
    </button>
    <button id="muteToggle" class="audio-btn" title="Mute All">
      🔊
    </button>
  `;
  document.querySelector('.container').appendChild(controls);
  
  // Music toggle
  document.getElementById('musicToggle').addEventListener('click', () => {
    initAudio();
    AudioSystem.playClick();
    
    if (AudioSystem.isMusicPlaying) {
      AudioSystem.stopBackgroundMusic();
      document.getElementById('musicToggle').innerHTML = '🎵';
      document.getElementById('musicToggle').style.opacity = '0.5';
    } else {
      AudioSystem.startBackgroundMusic();
      document.getElementById('musicToggle').innerHTML = '🎶';
      document.getElementById('musicToggle').style.opacity = '1';
    }
  });
  
  // Mute toggle
  document.getElementById('muteToggle').addEventListener('click', () => {
    initAudio();
    const isMuted = AudioSystem.toggleMute();
    document.getElementById('muteToggle').innerHTML = isMuted ? '🔇' : '🔊';
    document.getElementById('muteToggle').style.opacity = isMuted ? '0.5' : '1';
    if (!isMuted) AudioSystem.playClick();
  });
}

// Create audio controls after page load
window.addEventListener('load', () => {
  createAudioControls();
});

// Make functions globally accessible
window.deleteReaction = deleteReaction;
window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.showAbout = showAbout;
window.closeAbout = closeAbout;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.logout = logout;

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
      <button onclick="showAbout()" class="about-btn">ℹ️ About</button>
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
    initAudio();
    AudioSystem.playClick();
    
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
  
  // Play power sound
  if (audioInitialized) {
    if (isOn) {
      AudioSystem.playPowerOn();
    } else {
      AudioSystem.playPowerOff();
    }
  }
  
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
  
  // Play appropriate sound
  if (audioInitialized) {
    if (ms < 300) {
      AudioSystem.playFastReaction(); // Special sound for fast reactions
    } else {
      AudioSystem.playSuccess();
    }
  }

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
  initAudio();
  AudioSystem.playClick();
  
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.querySelectorAll('.auth-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 0);
  });
}

function showRegisterForm() {
  initAudio();
  AudioSystem.playClick();
  
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.querySelectorAll('.auth-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 1);
  });
}

async function logout() {
  initAudio();
  AudioSystem.playClick();
  
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

// Show About Modal
function showAbout() {
  initAudio();
  AudioSystem.playClick();
  
  displayAboutModal();
}

function displayAboutModal() {
  let modal = document.getElementById('aboutModal');
  if (modal) modal.remove();
  
  modal = document.createElement('div');
  modal.id = 'aboutModal';
  modal.className = 'about-modal';
  
  modal.innerHTML = `
    <div class="about-modal-content">
      <div class="about-header">
        <h2>About REACT</h2>
        <button class="close-btn" onclick="closeAbout()">×</button>
      </div>
      
      <div class="about-body">
        <div class="about-section">
          <h3>🎮 The Project</h3>
          <p><strong>REACT – IoT Reflex Analyzer</strong> is an innovative system designed to measure and analyze human reaction times using cutting-edge IoT technology. Combining Arduino hardware with modern web technologies, it creates an engaging platform for testing and tracking your reflexes.</p>
          
          <div class="tech-stack">
            <span class="tech-badge">Arduino</span>
            <span class="tech-badge">Node.js</span>
            <span class="tech-badge">Express</span>
            <span class="tech-badge">MongoDB</span>
            <span class="tech-badge">Socket.IO</span>
            <span class="tech-badge">Web Audio API</span>
          </div>
        </div>
        
        <div class="about-section">
          <h3>✨ Key Features</h3>
          <ul class="features-list">
            <li>⚡ Real-time reaction measurement with millisecond precision</li>
            <li>🔐 Secure user authentication and data persistence</li>
            <li>📊 Personal statistics and global leaderboards</li>
            <li>🎵 Immersive Game Boy-style audio experience</li>
            <li>🌐 Real-time communication via WebSockets</li>
            <li>🎨 Nostalgic retro-inspired UI design</li>
          </ul>
        </div>
        
        <div class="about-section">
          <h3>🏗️ System Architecture</h3>
          <p>The system consists of three integrated layers:</p>
          <div class="architecture-grid">
            <div class="arch-card">
              <div class="arch-icon">🔌</div>
              <h4>Hardware Layer</h4>
              <p>Arduino microcontroller with LED indicator and physical button for precise input detection</p>
            </div>
            <div class="arch-card">
              <div class="arch-icon">⚙️</div>
              <h4>Backend Layer</h4>
              <p>Node.js server managing serial communication, user authentication, and MongoDB database operations</p>
            </div>
            <div class="arch-card">
              <div class="arch-icon">💻</div>
              <h4>Frontend Layer</h4>
              <p>Interactive web dashboard with real-time updates, retro aesthetics, and immersive audio</p>
            </div>
          </div>
        </div>
        
        <div class="about-section">
          <h3>👥 Development Team</h3>
          <div class="team-grid">
            <div class="team-member">
              <div class="team-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=dev1" alt="Developer 1">
              </div>
              <h4>Developer 1</h4>
              <p class="team-role">Hardware & Firmware</p>
              <p class="team-desc">Arduino programming and circuit design</p>
            </div>
            <div class="team-member">
              <div class="team-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=dev2" alt="Developer 2">
              </div>
              <h4>Developer 2</h4>
              <p class="team-role">Backend Development</p>
              <p class="team-desc">Server architecture and database design</p>
            </div>
            <div class="team-member">
              <div class="team-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=dev3" alt="Developer 3">
              </div>
              <h4>Developer 3</h4>
              <p class="team-role">Frontend Development</p>
              <p class="team-desc">UI/UX design and client-side logic</p>
            </div>
            <div class="team-member">
              <div class="team-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=dev4" alt="Developer 4">
              </div>
              <h4>Developer 4</h4>
              <p class="team-role">Full Stack & Audio</p>
              <p class="team-desc">Integration and audio system design</p>
            </div>
          </div>
        </div>
        
        <div class="about-section">
          <h3>🎯 Project Goals</h3>
          <p>This project demonstrates the seamless integration of IoT hardware with modern web technologies to create an engaging, educational, and competitive platform for measuring human reflexes. It serves as both a practical tool for reaction time analysis and a showcase of full-stack development capabilities.</p>
        </div>
        
        <div class="about-footer">
          <p>Built with ❤️ using Arduino, Node.js, and Web Technologies</p>
          <p class="version">Version 1.0.0 | 2025</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
}

function closeAbout() {
  initAudio();
  AudioSystem.playClick();
  
  const modal = document.getElementById('aboutModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// Delete reaction
async function deleteReaction(id) {
  initAudio();
  
  if (!confirm('Delete this reaction time?')) return;
  
  AudioSystem.playDelete();
  
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
  initAudio();
  AudioSystem.playClick();
  
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