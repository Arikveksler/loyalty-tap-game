שצריך לעשות
אני אגיד לך מתי להעלו# Loyalty Tap Game - Project Documentation

## Overview
Telegram Mini App game where users tap to earn loyalty points, compete on leaderboards, and invite friends for bonuses.

---

## Live URLs

| Service | URL |
|---------|-----|
| **Game** | https://web-production-9a96.up.railway.app |
| **Health Check** | https://web-production-9a96.up.railway.app/health |
| **API** | https://web-production-9a96.up.railway.app/api/ |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Flask (Python 3.12) |
| Database | PostgreSQL (Supabase) |
| Hosting | Railway |
| Frontend | HTML/CSS/JavaScript |
| Platform | Telegram Mini App |

---

## Project Structure

```
loyalty-tap-game/
├── server.py          # Flask backend API
├── index.html         # Game frontend
├── script.js          # Game logic
├── style.css          # Styling
├── requirements.txt   # Python dependencies
├── runtime.txt        # Python version
├── Procfile           # Railway/Heroku config
├── .env               # Local environment (not in git)
├── .gitignore         # Git ignore rules
└── README.md          # Project readme
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Game page |
| GET | `/health` | Health check |
| GET | `/api/user/<id>` | Get user data & rank |
| POST | `/api/tap` | Save user points |
| GET | `/api/leaderboard` | Top 100 players |
| POST | `/api/referral` | Track referral & bonus |
| GET | `/api/stats` | Game statistics |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (auto-set by Railway) |

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    points INTEGER DEFAULT 0,
    card VARCHAR(50) DEFAULT 'amex',
    referrer_id BIGINT,
    friends_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

---

## Credentials & Access

### Supabase (Database)
- **Project**: loyalty-tap-game
- **Region**: eu-central-1
- **Connection String**:
  ```
  postgresql://postgres:Garik2026!!@db.ssvvaljepowyfqmtrrqx.supabase.co:5432/postgres
  ```

### Railway (Hosting)
- **Project**: loyalty-tap-game
- **Service**: web
- **Domain**: web-production-9a96.up.railway.app

### GitHub Repository
- **URL**: https://github.com/Arikveksler/loyalty-tap-game

---

## Telegram Bot Setup

### Step 1: Create Bot
1. Open @BotFather in Telegram
2. Send `/newbot`
3. Choose name: `Loyalty Tap Game`
4. Choose username: `LoyaltyTapGameBot` (must end with `bot`)
5. Save the Token

### Step 2: Create Mini App
1. Send `/newapp` to BotFather
2. Select your bot
3. Fill details:
   - **Title**: Loyalty Tap
   - **Description**: Tap to earn points!
   - **Photo**: Upload 640x360 image
   - **URL**: `https://web-production-9a96.up.railway.app`

---

## Local Development

### Setup
```bash
# Clone repo
git clone https://github.com/Arikveksler/loyalty-tap-game.git
cd loyalty-tap-game

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "DATABASE_URL=postgresql://postgres:Garik2026!!@db.ssvvaljepowyfqmtrrqx.supabase.co:5432/postgres" > .env

# Run locally
python server.py
```

### Access locally
- http://localhost:5000

---

## Deployment

### Push changes to production
```bash
git add .
git commit -m "Your message"
git push
```
Railway auto-deploys on push to `main` branch.

---

## Game Features

- **Tap to Earn**: Click/tap to accumulate points
- **Leaderboard**: Top 100 players ranking
- **Referral System**: Invite friends, earn 500 bonus points
- **Multiple Cards**: Different card designs (AMEX, Visa, etc.)
- **Session Tracking**: Today's taps, session time
- **Rate Limiting**: 20 requests/second anti-abuse

---

## Created
- **Date**: January 16, 2026
- **Author**: Arik Veksler + Claude AI
