// ============================================
// CONFIGURATION - UPDATE THESE VALUES!
// ============================================
const API_URL = 'https://loyalty-tap-game-production.up.railway.app';
const BOT_USERNAME = 'AlphaTapper_Bot';

// ============================================
// STATE
// ============================================
let state = {
    userId: null,
    username: null,
    points: 0,
    rank: '-',
    sessionTaps: 0,
    sessionStart: Date.now(),
    friendsCount: 0,
    currentCard: 'starter',
    isLoading: false,
    lastTapTime: 0
};

// Minimum time between taps (milliseconds) - anti-spam
const TAP_COOLDOWN = 50;

// ============================================
// CARDS DEFINITION
// ============================================
const CARDS = {
    starter: { name: 'STARTER', icon: '💳', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', unlockPoints: 0 },
    basic: { name: 'BASIC', icon: '💳', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', unlockPoints: 0 },
    bronze: { name: 'BRONZE', icon: '🥉', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', unlockPoints: 500 },
    silver: { name: 'SILVER', icon: '🥈', color: 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)', unlockPoints: 500 },
    ruby: { name: 'RUBY', icon: '💎', color: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', unlockPoints: 500 },
    black: { name: 'BLACK', icon: '⬛', color: 'linear-gradient(135deg, #232526 0%, #414345 100%)', unlockPoints: 2000 },
    gold: { name: 'GOLD', icon: '🥇', color: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', unlockPoints: 5000 },
    diamond: { name: 'DIAMOND', icon: '💠', color: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)', unlockPoints: 10000 }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    
    try {
        // Initialize Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Apply Telegram theme
            if (tg.colorScheme === 'dark') {
                document.body.classList.add('tg-theme-dark');
            }
            
            const userData = tg.initDataUnsafe.user;
            if (userData) {
                state.userId = userData.id;
                state.username = userData.username || userData.first_name || `User${userData.id}`;
            }
        }
        
        // Fallback for testing outside Telegram
        if (!state.userId) {
            state.userId = localStorage.getItem('testUserId') || Math.floor(Math.random() * 1000000);
            localStorage.setItem('testUserId', state.userId);
            state.username = `Test${state.userId}`;
            console.log('Testing mode - User ID:', state.userId);
        }

        // Initialize user data from server
        await initializeUser();
        
        // Load leaderboard
        await loadLeaderboard();
        
        // Check referral parameter
        checkReferral();
        
        // Start timer
        setInterval(updateTimer, 1000);
        
        // Auto-save points every 30 seconds
        setInterval(() => {
            if (state.sessionTaps > 0) {
                savePoints();
            }
        }, 30000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Connection error. Please try again.');
    } finally {
        showLoading(false);
    }
});

// ============================================
// USER FUNCTIONS
// ============================================
async function initializeUser() {
    try {
        const response = await fetch(`${API_URL}/api/user/${state.userId}`);
        
        if (response.ok) {
            const data = await response.json();
            state.points = data.points || 0;
            state.rank = data.rank || '-';
            state.friendsCount = data.friends_count || 0;
        }
    } catch (error) {
        console.error('Error initializing user:', error);
    }
    
    updateUI();
}

// ============================================
// TAP FUNCTION
// ============================================
function tap() {
    // Anti-spam: check cooldown
    const now = Date.now();
    if (now - state.lastTapTime < TAP_COOLDOWN) {
        return;
    }
    state.lastTapTime = now;
    
    // Play tap animation
    const card = document.getElementById('card');
    card.classList.remove('tap-animation');
    void card.offsetWidth; // Trigger reflow
    card.classList.add('tap-animation');
    
    // Vibrate on mobile (if supported)
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
    // Increment points
    state.points++;
    state.sessionTaps++;
    
    // Update UI immediately
    updateUI();
    
    // Show particle effect
    showParticle(event);
    
    // Save to server every 5 taps (batching for performance)
    if (state.sessionTaps % 5 === 0) {
        savePoints();
    }

    // Refresh leaderboard every 20 taps
    if (state.sessionTaps % 20 === 0) {
        loadLeaderboard();
    }

    // Show ad every 150 taps
    if (state.sessionTaps % 150 === 0 && state.sessionTaps > 0) {
        showAd();
    }
}

// ============================================
// ADS SYSTEM
// ============================================
function showAd() {
    const adSpace = document.getElementById('ad-space');
    if (adSpace) {
        // Scroll to ad space to make it visible
        adSpace.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Show a notification that ad is loading
        showToast('📺 Loading reward...');

        // RichAds will handle the actual ad display
        // This function is called every 150 taps
        console.log('Ad triggered at tap:', state.sessionTaps);
    }
}

// ============================================
// SERVER COMMUNICATION
// ============================================
async function savePoints() {
    try {
        await fetch(`${API_URL}/api/tap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: state.userId,
                username: state.username,
                points: state.points
            })
        });
    } catch (error) {
        console.error('Error saving points:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/api/leaderboard`);
        
        if (!response.ok) {
            throw new Error('Failed to load leaderboard');
        }
        
        const data = await response.json();
        
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';
        
        if (data.length === 0) {
            leaderboard.innerHTML = '<div class="leaderboard-item"><div class="name">No players yet. Be the first!</div></div>';
            return;
        }
        
        data.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            // Highlight current user
            const isCurrentUser = String(user.telegram_id) === String(state.userId);
            if (isCurrentUser) {
                item.classList.add('current-user');
                state.rank = user.rank;
            }
            
            // Medal emoji for top 3
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            // Display name - show actual username or "You" for current user
            const displayName = isCurrentUser ? 'You' : (user.name || `Player #${user.rank}`);
            
            item.innerHTML = `
                <div class="rank">${medal || user.rank}</div>
                <div class="name">${displayName}</div>
                <div class="points">${formatNumber(user.points)}</div>
            `;
            
            leaderboard.appendChild(item);
        });
        
        updateUI();
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// ============================================
// REFERRAL SYSTEM
// ============================================
function checkReferral() {
    const params = new URLSearchParams(window.location.search);
    const referrerId = params.get('ref') || params.get('startapp');
    
    if (referrerId && referrerId !== String(state.userId)) {
        // Track referral
        fetch(`${API_URL}/api/referral`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: state.userId,
                referrer_id: referrerId
            })
        }).then(() => {
            showToast('Welcome! You joined via a friend\'s invite! 🎉');
        }).catch(error => console.error('Error tracking referral:', error));
    }
}

function invite() {
    const link = `https://t.me/${BOT_USERNAME}/app?startapp=${state.userId}`;
    const text = `🎮 Join me in AlphaTapper and let's compete! Tap to earn points and climb the leaderboard!`;
    
    // Use Telegram's native share if available
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(link).then(() => {
            showToast('Invite link copied to clipboard! 📋');
        }).catch(() => {
            showToast('Could not copy link');
        });
    }
}

// ============================================
// CARDS SYSTEM
// ============================================
function showCards() {
    const modal = document.getElementById('cards-modal');
    const grid = document.getElementById('cards-grid');
    
    grid.innerHTML = '';
    
    Object.entries(CARDS).forEach(([key, card]) => {
        const isUnlocked = state.points >= card.unlockPoints;
        const isSelected = state.currentCard === key;
        
        const div = document.createElement('div');
        div.className = `card-item ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`;
        
        if (isUnlocked) {
            div.onclick = () => selectCard(key);
        }
        
        div.innerHTML = `
            <div style="font-size: 30px; margin-bottom: 10px;">${card.icon}</div>
            <div style="font-weight: bold; margin-bottom: 5px;">${card.name}</div>
            <div style="font-size: 12px; opacity: 0.8;">
                ${isSelected ? '✓ Selected' : (isUnlocked ? 'Tap to select' : `🔒 ${formatNumber(card.unlockPoints)} pts`)}
            </div>
        `;
        
        grid.appendChild(div);
    });
    
    modal.style.display = 'block';
}

function closeCards() {
    document.getElementById('cards-modal').style.display = 'none';
}

function selectCard(cardKey) {
    if (state.points >= CARDS[cardKey].unlockPoints) {
        state.currentCard = cardKey;
        
        // Update card appearance
        const card = document.getElementById('card');
        card.style.background = CARDS[cardKey].color;
        
        updateUI();
        closeCards();
        showToast(`${CARDS[cardKey].name} selected! ✨`);
    }
}

// ============================================
// UI FUNCTIONS
// ============================================
function updateUI() {
    const currentCard = CARDS[state.currentCard];
    
    document.getElementById('card-name').textContent = currentCard.name;
    document.getElementById('card-points').textContent = formatNumber(state.points);
    document.getElementById('user-points').textContent = formatNumber(state.points);
    document.getElementById('user-rank').textContent = state.rank;
    document.getElementById('today-taps').textContent = formatNumber(state.sessionTaps);
    document.getElementById('friends-count').textContent = state.friendsCount;
    
    // Update card color
    document.getElementById('card').style.background = currentCard.color;
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('session-time').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showParticle(event) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = '+1';
    
    // Position at click/tap location or center
    if (event && event.clientX) {
        particle.style.left = event.clientX + 'px';
        particle.style.top = event.clientY + 'px';
    } else {
        particle.style.left = '50%';
        particle.style.top = '40%';
        particle.style.transform = 'translateX(-50%)';
    }
    
    document.body.appendChild(particle);
    
    // Remove after animation
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 800);
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
    state.isLoading = show;
}

function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('cards-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Save points before user leaves
window.addEventListener('beforeunload', () => {
    if (state.sessionTaps > 0) {
        // Use sendBeacon for reliable delivery
        navigator.sendBeacon(`${API_URL}/api/tap`, JSON.stringify({
            user_id: state.userId,
            username: state.username,
            points: state.points
        }));
    }
});

// Handle visibility change (save when app goes to background)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.sessionTaps > 0) {
        savePoints();
    }
});
