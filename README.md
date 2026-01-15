# 🎮 Loyalty Tap Game - Telegram Mini App

A fun tapping game for Telegram with leaderboards, referral system, and collectible cards.

## ✨ Features

- 🎯 **Tap to Earn** - Simple addictive gameplay
- 🏆 **Leaderboard** - Compete with other players
- 👥 **Referral System** - Invite friends, get bonus points
- 🎴 **Collectible Cards** - Unlock new card designs as you progress
- 📱 **Mobile Optimized** - Perfect for Telegram Mini Apps

## 📁 Project Structure

```
loyalty-tap-game/
├── index.html          # Frontend UI
├── style.css           # Styling
├── script.js           # Game logic
├── server.py           # Backend API
├── requirements.txt    # Python dependencies
├── Procfile            # Railway deployment
├── .gitignore          # Git ignore
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites
- GitHub account
- Railway account (free tier available)
- Vercel account (free tier available)
- Telegram account

### Step 1: Deploy Backend to Railway

1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to [railway.app](https://railway.app)
4. Create new project → Deploy from GitHub repo
5. Add PostgreSQL database (click "Add Service" → "Database" → "PostgreSQL")
6. Wait for deployment
7. Copy your Railway URL (e.g., `https://your-app.railway.app`)

### Step 2: Update Configuration

Edit `script.js` and update these lines:

```javascript
const API_URL = 'https://your-app.railway.app';  // Your Railway URL
const BOT_USERNAME = 'your_bot_username';         // Your bot username (without @)
```

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Deploy (Vercel auto-detects static site)
4. Copy your Vercel URL (e.g., `https://your-game.vercel.app`)

### Step 4: Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the bot token (save it securely)
5. Send `/setmenubutton`
6. Select your bot
7. Choose "🎮 Web App"
8. Enter button text: `Play`
9. Enter URL: Your Vercel URL

### Step 5: Test

Open `https://t.me/YOUR_BOT_NAME/app` in Telegram to play!

## 🔧 Configuration Options

### Environment Variables (Railway)

Railway automatically provides `DATABASE_URL` when you add PostgreSQL.

### Game Settings (script.js)

```javascript
const TAP_COOLDOWN = 50;        // Minimum ms between taps
const REFERRAL_BONUS = 500;     // Points for successful referral
```

### Card Unlock Thresholds (script.js)

```javascript
const CARDS = {
    amex: { unlockPoints: 0 },
    visa: { unlockPoints: 0 },
    mastercard: { unlockPoints: 500 },
    apple: { unlockPoints: 500 },
    google: { unlockPoints: 500 },
    black: { unlockPoints: 2000 },
    gold: { unlockPoints: 5000 },
    phantom: { unlockPoints: 10000 }
};
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/user/<id>` | GET | Get user data |
| `/api/tap` | POST | Save points |
| `/api/leaderboard` | GET | Top 100 players |
| `/api/referral` | POST | Track referral |
| `/api/stats` | GET | Game statistics |

## 🛡️ Security Features

- ✅ Rate limiting (20 requests/second)
- ✅ Input validation
- ✅ Anti-cheat: Points can only increase
- ✅ Self-referral prevention
- ✅ SQL injection protection (parameterized queries)

## 💰 Monetization (Optional)

### Adding RichAds

1. Sign up at [richads.com/publishers](https://richads.com/publishers)
2. Add your Mini App
3. Get your ad code
4. Add to `index.html`:

```html
<script src="https://richads.com/code/YOUR_CODE_HERE"></script>
```

## 🐛 Troubleshooting

### "Connection error" on load
- Check if Railway backend is running
- Verify `API_URL` in script.js is correct
- Check Railway logs for errors

### Points not saving
- Check browser console for errors
- Verify CORS is enabled on backend
- Check Railway database connection

### Bot not showing Mini App
- Verify you set the menu button correctly in BotFather
- Make sure Vercel URL is accessible
- Clear Telegram cache and try again

## 📈 Growth Tips

1. **Launch Strategy**: Start with friends and family
2. **Viral Loop**: Referral system gives 500 points bonus
3. **Engagement**: Daily login bonuses (add later)
4. **Competition**: Weekly leaderboard resets (add later)

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Support

If you have questions:
1. Check the troubleshooting section
2. Review Railway/Vercel logs
3. Test API endpoints directly

Good luck with your game! 🚀
