"""
Loyalty Tap Game - Backend Server
================================
Flask API server for the Telegram Mini App game.

Endpoints:
- GET  /health          - Health check
- GET  /api/user/<id>   - Get user data
- POST /api/tap         - Save user points
- GET  /api/leaderboard - Get top 100 players
- POST /api/referral    - Track referral
- GET  /api/stats       - Get game statistics
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime, timedelta
from functools import wraps
import time

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIGURATION
# ============================================
# Database URL - prefer SUPABASE_URL over DATABASE_URL (Railway override issue)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
DATABASE_URL_ENV = os.environ.get('DATABASE_URL')
print(f"SUPABASE_URL exists: {SUPABASE_URL is not None}")
print(f"DATABASE_URL exists: {DATABASE_URL_ENV is not None}")

DATABASE_URL = SUPABASE_URL or DATABASE_URL_ENV
if not DATABASE_URL:
    print("WARNING: No database URL set!")
    DATABASE_URL = 'postgresql://localhost/loyalty_game'
else:
    # Print partial URL for debugging (hide password)
    print(f"Using DB URL containing: {'pooler' if 'pooler' in DATABASE_URL else 'direct'}")

# Rate limiting settings
RATE_LIMIT_WINDOW = 1  # seconds
RATE_LIMIT_MAX_REQUESTS = 20  # max requests per window
rate_limit_cache = {}

# Referral bonus points
REFERRAL_BONUS = 5000

# ============================================
# DATABASE FUNCTIONS
# ============================================
def get_db():
    """Get database connection with dict cursor"""
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def init_db():
    """Initialize database schema"""
    conn = get_db()
    c = conn.cursor()
    
    # Create users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username VARCHAR(255),
            points INTEGER DEFAULT 0,
            card VARCHAR(50) DEFAULT 'amex',
            referrer_id BIGINT,
            friends_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    ''')
    
    # Create indexes for performance
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC)
    ''')
    
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

# ============================================
# RATE LIMITING
# ============================================
def rate_limit(f):
    """Simple in-memory rate limiter decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get client identifier (IP or user_id from request)
        client_id = request.remote_addr
        
        current_time = time.time()
        
        # Clean old entries
        if client_id in rate_limit_cache:
            rate_limit_cache[client_id] = [
                t for t in rate_limit_cache[client_id] 
                if current_time - t < RATE_LIMIT_WINDOW
            ]
        else:
            rate_limit_cache[client_id] = []
        
        # Check rate limit
        if len(rate_limit_cache[client_id]) >= RATE_LIMIT_MAX_REQUESTS:
            return jsonify({'error': 'Rate limit exceeded. Please slow down!'}), 429
        
        # Add current request
        rate_limit_cache[client_id].append(current_time)
        
        return f(*args, **kwargs)
    return decorated_function

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/')
def index():
    """Serve the main game page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files (js, css, etc)"""
    if filename in ['style.css', 'script.js']:
        return send_from_directory('.', filename)
    return jsonify({'error': 'Not found'}), 404

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user data including points and rank"""
    try:
        conn = get_db()
        c = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user data with rank
        c.execute('''
            SELECT 
                telegram_id,
                username,
                points,
                card,
                friends_count,
                (SELECT COUNT(*) + 1 FROM users WHERE points > u.points) as rank
            FROM users u
            WHERE telegram_id = %s
        ''', (int(user_id),))
        
        result = c.fetchone()
        conn.close()
        
        if result:
            return jsonify({
                'telegram_id': result['telegram_id'],
                'username': result['username'],
                'points': result['points'],
                'card': result['card'],
                'friends_count': result['friends_count'],
                'rank': result['rank']
            })
        else:
            return jsonify({
                'points': 0,
                'rank': '-',
                'friends_count': 0
            })
    
    except Exception as e:
        print(f"Error in get_user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tap', methods=['POST'])
@rate_limit
def tap():
    """Save user points (with rate limiting)"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id')
        points = data.get('points', 0)
        username = data.get('username', '')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Validate points (basic anti-cheat)
        if points < 0 or points > 10000000:
            return jsonify({'error': 'Invalid points value'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Upsert: update if exists, insert if not
        c.execute('''
            INSERT INTO users (telegram_id, username, points, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (telegram_id) 
            DO UPDATE SET 
                points = GREATEST(users.points, EXCLUDED.points),
                username = COALESCE(NULLIF(EXCLUDED.username, ''), users.username),
                updated_at = NOW()
        ''', (int(user_id), username, int(points)))
        
        conn.commit()
        conn.close()
        
        return jsonify({'status': 'ok', 'points': points})
    
    except Exception as e:
        print(f"Error in tap: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    """Get top 100 players"""
    try:
        conn = get_db()
        c = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get top 100 with rank
        c.execute('''
            SELECT 
                telegram_id,
                username,
                points,
                ROW_NUMBER() OVER (ORDER BY points DESC) as rank
            FROM users
            WHERE points > 0
            ORDER BY points DESC
            LIMIT 100
        ''')
        
        results = c.fetchall()
        conn.close()
        
        leaderboard_data = [
            {
                'rank': int(r['rank']),
                'telegram_id': r['telegram_id'],
                'name': r['username'] or f"Player #{r['rank']}",
                'points': r['points']
            }
            for r in results
        ]
        
        return jsonify(leaderboard_data)
    
    except Exception as e:
        print(f"Error in leaderboard: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/referral', methods=['POST'])
@rate_limit
def referral():
    """Track referral and give bonus to referrer"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id')
        referrer_id = data.get('referrer_id')
        
        if not user_id or not referrer_id:
            return jsonify({'error': 'user_id and referrer_id are required'}), 400
        
        # Don't allow self-referral
        if str(user_id) == str(referrer_id):
            return jsonify({'error': 'Cannot refer yourself'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Check if user already exists (not a new user)
        c.execute('SELECT telegram_id, referrer_id FROM users WHERE telegram_id = %s', (int(user_id),))
        existing_user = c.fetchone()
        
        if existing_user and existing_user[1]:
            # User already has a referrer
            conn.close()
            return jsonify({'status': 'already_referred'})
        
        # Create user if doesn't exist, with referrer
        c.execute('''
            INSERT INTO users (telegram_id, referrer_id, points)
            VALUES (%s, %s, 0)
            ON CONFLICT (telegram_id) 
            DO UPDATE SET referrer_id = COALESCE(users.referrer_id, EXCLUDED.referrer_id)
            WHERE users.referrer_id IS NULL
        ''', (int(user_id), int(referrer_id)))
        
        # Give referrer bonus points and increment friends count
        c.execute('''
            UPDATE users 
            SET 
                points = points + %s,
                friends_count = friends_count + 1,
                updated_at = NOW()
            WHERE telegram_id = %s
        ''', (REFERRAL_BONUS, int(referrer_id)))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'ok',
            'bonus_given': REFERRAL_BONUS
        })
    
    except Exception as e:
        print(f"Error in referral: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Get game statistics"""
    try:
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT COUNT(*) FROM users')
        total_users = c.fetchone()[0]
        
        c.execute('SELECT COALESCE(SUM(points), 0) FROM users')
        total_points = c.fetchone()[0]
        
        c.execute('SELECT COALESCE(AVG(points), 0) FROM users WHERE points > 0')
        avg_points = c.fetchone()[0]
        
        c.execute('SELECT COALESCE(MAX(points), 0) FROM users')
        max_points = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL \'24 hours\'')
        active_today = c.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'total_users': total_users,
            'total_points': int(total_points),
            'avg_points': round(float(avg_points), 2),
            'max_points': int(max_points),
            'active_today': active_today
        })
    
    except Exception as e:
        print(f"Error in stats: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================
# ERROR HANDLERS
# ============================================
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================
# STARTUP
# ============================================
# Initialize DB on startup
try:
    init_db()
except Exception as e:
    print(f"Database initialization warning: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
