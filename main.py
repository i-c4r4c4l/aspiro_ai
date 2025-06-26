from fastapi import FastAPI, HTTPException, Form, File, UploadFile, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from openai import OpenAI
import os
from dotenv import load_dotenv
import uvicorn
from typing import List, Optional
import base64
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import sqlite3
from pathlib import Path
import hashlib
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import json

# Load environment variables
load_dotenv()

app = FastAPI(title="Aspiro AI", description="English learning assistant for Uzbek students")

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "aspiro-ai-secret-key-2024-uzbekistan-education")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Security
security = HTTPBearer()

# Database setup
DATABASE_URL = "users.db"

def init_database():
    """Initialize SQLite database for users"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            subscription_plan TEXT DEFAULT 'free',
            subscription_expires TIMESTAMP
        )
    """)
    
    # Create chat sessions table for user history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create chat messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            user_message TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/src", StaticFiles(directory="src"), name="src")

# OpenAI configuration
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY") or os.getenv("REPLIT_SECRET")
)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

class User(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    subscription_plan: str
    created_at: str

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class LessonRequest(BaseModel):
    topic: str
    level: str  # beginner, intermediate, advanced

class PronunciationRequest(BaseModel):
    word: str
    
class GrammarRequest(BaseModel):
    uzbek_sentence: str

class ImageLearningRequest(BaseModel):
    image_data: str  # base64 encoded image
    
class ProverbRequest(BaseModel):
    uzbek_proverb: str

class GoogleAuthRequest(BaseModel):
    credential: str

# Utility functions for authentication
def verify_password(plain_password, hashed_password):
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str):
    """Get user from database by email"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "email": user[1],
            "full_name": user[2],
            "hashed_password": user[3],
            "is_active": bool(user[4]),
            "created_at": user[5],
            "last_login": user[6],
            "subscription_plan": user[7] or "free",
            "subscription_expires": user[8]
        }
    return None

def create_user(user_data: UserCreate):
    """Create new user in database"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    hashed_password = get_password_hash(user_data.password)
    
    try:
        cursor.execute("""
            INSERT INTO users (email, full_name, hashed_password) 
            VALUES (?, ?, ?)
        """, (user_data.email, user_data.full_name, hashed_password))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return get_user_by_email(user_data.email)
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Bu email manzil allaqachon ro'yxatdan o'tgan"
        )

def authenticate_user(email: str, password: str):
    """Authenticate user credentials"""
    user = get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Avtorizatsiya talab qilinadi",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    
    # Update last login
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?",
        (email,)
    )
    conn.commit()
    conn.close()
    
    return user

def update_user_subscription(user_id: int, plan: str, expires: Optional[datetime] = None):
    """Update user subscription plan"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    if expires:
        cursor.execute("""
            UPDATE users 
            SET subscription_plan = ?, subscription_expires = ? 
            WHERE id = ?
        """, (plan, expires.isoformat(), user_id))
    else:
        cursor.execute("""
            UPDATE users 
            SET subscription_plan = ? 
            WHERE id = ?
        """, (plan, user_id))
    
    conn.commit()
    conn.close()

# Enhanced System Prompt for Aspiro AI
SYSTEM_PROMPT = """Siz Aspiro AI - O'zbekiston o'quvchilari uchun maxsus yaratilgan aqlli ta'lim yordamchisisiz! 

🎯 ASOSIY VAZIFANGIZ:
- DOIM o'zbek tilida javob bering (faqat so'ralsa inglizcha yozing)
- Aniq, sodda va foydali tushuntirishlar bering
- O'zbekiston madaniyati va hayotidan misollar keltiring
- Har bir mavzuni bosqichma-bosqich tushuntiring

📚 SOHALARИНГIZ:
✅ Matematika (algebra, geometriya, hisob)
✅ Fizika va Kimyo (sodda misollar bilan)
✅ Tarix (O'zbekiston va jahon tarixi)
✅ Adabiyot (klassik va zamonaviy)
✅ Ingliz tili (talaffuz, grammatika, lug'at)
✅ Geografiya va Tabiat
✅ Islom ta'limoti va axloq

🎨 JAVOB FORMATI:
1. Qisqa va aniq tushuntirish
2. O'zbekistondagi misollar
3. Bosqichma-bosqich yechim (agar kerak bo'lsa)
4. Qo'shimcha maslahatlar
5. Amaliy mashqlar

⚠️ MUHIM QOIDALAR:
- Hech qachon noto'g'ri ma'lumot bermang
- Bilmasangiz, "Aniq javobni bilmayman, lekin..." deb boshlang
- Diniy savollar uchun o'rtacha pozitsiyani saqlang
- O'quvchining yoshiga mos til ishlatang

🌟 MAQSAD: O'zbek o'quvchisini ChatGPT dan yaxshiroq tushuntirish va yordam berish!"""

# Authentication endpoints
@app.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register new user"""
    try:
        # Validate password strength
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Parol kamida 6 ta belgidan iborat bo'lishi kerak"
            )
        
        # Create user
        user = create_user(user_data)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_info": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "subscription_plan": user["subscription_plan"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Ro'yxatdan o'tishda xatolik yuz berdi")

@app.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    user = authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email yoki parol noto'g'ri",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=400,
            detail="Hisob faol emas"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "subscription_plan": user["subscription_plan"]
        }
    }

@app.get("/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "is_active": current_user["is_active"],
        "subscription_plan": current_user["subscription_plan"],
        "created_at": current_user["created_at"]
    }

@app.post("/auth/google", response_model=Token)
async def google_auth(google_data: GoogleAuthRequest):
    """Authenticate user with Google OAuth"""
    try:
        # Verify the Google ID token
        # Note: You'll need to set your Google Client ID in environment variables
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth not configured. Please contact administrator."
            )
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            google_data.credential, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information from Google
        google_user_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        email_verified = idinfo.get('email_verified', False)
        
        if not email_verified:
            raise HTTPException(
                status_code=400,
                detail="Google email not verified"
            )
        
        # Check if user exists
        user = get_user_by_email(email)
        
        if not user:
            # Create new user with Google account
            user_data = UserCreate(
                email=email,
                full_name=name,
                password=f"google_oauth_{google_user_id}"  # Random password for Google users
            )
            user = create_user(user_data)
            if not user:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to create user account"
                )
        
        # Update last login
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), user["id"])
        )
        conn.commit()
        conn.close()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        
        # Prepare user info for response
        user_info = {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "subscription_plan": user["subscription_plan"]
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_info": user_info
        }
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=400,
            detail="Invalid Google token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Google authentication failed: {str(e)}"
        )

@app.post("/logout")
async def logout():
    """Logout user (token will be handled on client side)"""
    return {"message": "Muvaffaqiyatli chiqildi"}

# Page routes
@app.get("/")
async def read_root():
    """Serve the landing page"""
    from fastapi.responses import FileResponse
    return FileResponse("index.html")

@app.get("/login-page")
async def login_page():
    """Serve the login page"""
    from fastapi.responses import FileResponse
    return FileResponse("static/login.html")

@app.get("/register-page")
async def register_page():
    """Serve the register page"""
    from fastapi.responses import FileResponse
    return FileResponse("static/register.html")

@app.get("/chat")
async def chat_page():
    """Serve the chatbot page"""
    from fastapi.responses import FileResponse
    return FileResponse("static/index.html")

@app.get("/app")
async def app_page():
    """Serve the chatbot page (alternative route)"""
    from fastapi.responses import FileResponse
    return FileResponse("static/index.html")

@app.get("/pricing")
async def pricing_page():
    """Serve the pricing page"""
    from fastapi.responses import FileResponse
    return FileResponse("static/pricing.html")

@app.get("/test")
async def test_page():
    """Serve the test features page"""
    from fastapi.responses import FileResponse
    return FileResponse("test_ui.html")

# Protected chat endpoints (require authentication)
@app.post("/chat")
async def chat_with_ai(
    request: ChatRequest = None,
    current_user: dict = Depends(get_current_user)
):
    """Handle text-only chat requests with OpenAI (Protected)"""
    if request:
        return await process_chat_message(request.message, [], current_user)
    else:
        return {"response": "Xabar topilmadi. Iltimos, xabar yuboring."}

@app.post("/chat-with-files", response_model=ChatResponse)
async def chat_with_files(
    message: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user)
):
    """Handle chat requests with file uploads (Protected)"""
    return await process_chat_message(message, files, current_user)

async def process_chat_message(user_message: str, files: List[UploadFile], current_user: dict):
    """Process chat message with optional files (now includes user context)"""
    try:
        if not client.api_key:
            return ChatResponse(response="Kechirasiz, hozircha xizmat ishlamayapti. Iltimos, keyinroq qayta urinib ko'ring.")
        
        # Validate message
        if not user_message:
            return ChatResponse(response="Xabar topilmadi. Iltimos, xabar yuboring.")
        
        # Check subscription limits (basic implementation)
        if current_user["subscription_plan"] == "free":
            # Add usage tracking here if needed
            pass
        
        # Process uploaded files if any
        file_descriptions = []
        if files and len(files) > 0:
            for file in files:
                if file.filename:  # Check if file is actually uploaded
                    file_content = await file.read()
                    file_size = len(file_content)
                    
                    if file.content_type.startswith('image/'):
                        # For images, describe what we received
                        file_descriptions.append(f"Rasm fayli: {file.filename} ({file_size} bayt)")
                    elif file.content_type.startswith('audio/'):
                        # For audio files, describe what we received
                        file_descriptions.append(f"Audio fayli: {file.filename} ({file_size} bayt)")
                    else:
                        # For other files, just note the file
                        file_descriptions.append(f"Fayl: {file.filename} ({file_size} bayt)")
        
        # Enhance message with file information and user context
        enhanced_message = user_message
        if file_descriptions:
            enhanced_message += f"\n\nQo'shimcha ma'lumot: Foydalanuvchi quyidagi fayllarni yukladi:\n" + "\n".join(file_descriptions)
            enhanced_message += "\n\nIltimos, yuklangan fayllar haqida ma'lumot bering yoki ular bilan bog'liq savolga javob bering."
        
        # Add user context to system prompt
        user_context = f"\n\nFoydalanuvchi ma'lumotlari: {current_user['full_name']} ({current_user['subscription_plan']} rejasi)"
        
        # Create chat completion with optimized settings
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using GPT-4o-mini for better performance and cost
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + user_context},
                {"role": "user", "content": enhanced_message}
            ],
            max_tokens=800,  # Increased for detailed educational responses
            temperature=0.3,  # Lower temperature for consistent educational tone
            top_p=0.9,       # Focused but creative responses
            frequency_penalty=0.1,  # Avoid repetition
            presence_penalty=0.1    # Encourage diverse vocabulary
        )
        
        ai_response = response.choices[0].message.content
        
        # Ensure response is not empty
        if not ai_response or ai_response.strip() == "":
            return ChatResponse(response="Kechirasiz, javob yasay olmadim. Savolingizni boshqacha tarzda bering.")
        
        # Save chat to user's history (optional)
        save_chat_to_history(current_user["id"], user_message, ai_response)
        
        return ChatResponse(response=ai_response)
        
    except Exception as e:
        # Log the actual error for debugging
        print(f"Error in process_chat_message: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Friendly error message in Uzbek
        error_messages = [
            "Kechirasiz, hozirda texnik nosozlik. Bir oz kutib, qayta urinib ko'ring.",
            "Xatolik yuz berdi. Iltimos, qaytadan harakat qiling.",
            "Hozircha xizmat ishlamayapti. Keyinroq qayta urinib ko'ring."
        ]
        
        import random
        return ChatResponse(response=random.choice(error_messages))

def save_chat_to_history(user_id: int, user_message: str, ai_response: str):
    """Save chat to user's history"""
    try:
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get or create current session
        cursor.execute("""
            SELECT id FROM chat_sessions 
            WHERE user_id = ? 
            ORDER BY updated_at DESC 
            LIMIT 1
        """, (user_id,))
        
        session = cursor.fetchone()
        
        if not session:
            # Create new session
            cursor.execute("""
                INSERT INTO chat_sessions (user_id, session_title) 
                VALUES (?, ?)
            """, (user_id, f"Suhbat {datetime.now().strftime('%Y-%m-%d %H:%M')}"))
            session_id = cursor.lastrowid
        else:
            session_id = session[0]
            # Update session timestamp
            cursor.execute("""
                UPDATE chat_sessions 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (session_id,))
        
        # Save message
        cursor.execute("""
            INSERT INTO chat_messages (session_id, user_message, ai_response) 
            VALUES (?, ?, ?)
        """, (session_id, user_message, ai_response))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving chat history: {e}")

@app.get("/chat-history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Get user's chat history"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cs.id, cs.session_title, cs.created_at, cs.updated_at,
               COUNT(cm.id) as message_count
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        WHERE cs.user_id = ?
        GROUP BY cs.id
        ORDER BY cs.updated_at DESC
        LIMIT 50
    """, (current_user["id"],))
    
    sessions = cursor.fetchall()
    conn.close()
    
    return {
        "sessions": [
            {
                "id": session[0],
                "title": session[1],
                "created_at": session[2],
                "updated_at": session[3],
                "message_count": session[4]
            }
            for session in sessions
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "service": "Aspiro AI"}

# Protected specialized learning endpoints
@app.post("/pronunciation")
async def pronunciation_help(
    request: PronunciationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Provide pronunciation help for English words (Protected)"""
    try:
        if not client.api_key:
            return {"error": "OpenAI API not configured"}
        
        # Enhanced pronunciation prompt with cultural context
        pronunciation_prompt = f"""
        Siz ingliz tili talaffuzi bo'yicha mutaxassiz o'qituvchisiz. 
        
        "{request.word}" so'zining talaffuzini o'zbek o'quvchilariga o'rgating:
        
        1. So'zning ma'nosi (o'zbek tilida)
        2. Fonetik yozuv (IPA belgisida) 
        3. O'zbek tilida yaqin tovushlar bilan taqqoslash
        4. Talaffuz uchun maslahatlar
        5. Misol jumlalar (inglizcha va o'zbekcha tarjima bilan)
        6. Umumiy xatolar va ulardan qanday saqlanish
        
        Javobni qisqa va amaliy qiling. O'zbek o'quvchisiga mos til ishlatingh.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": pronunciation_prompt},
                {"role": "user", "content": f"So'z: {request.word}"}
            ],
            max_tokens=600,
            temperature=0.3
        )
        
        return {"pronunciation_help": response.choices[0].message.content}
        
    except Exception as e:
        return {"error": "Talaffuz yordamini olishda xatolik yuz berdi"}

@app.post("/grammar-check")
async def grammar_correction(
    request: GrammarRequest,
    current_user: dict = Depends(get_current_user)
):
    """Check and correct grammar for Uzbek students (Protected)"""
    try:
        if not client.api_key:
            return {"error": "OpenAI API not configured"}
        
        grammar_prompt = f"""
        Siz ingliz tili grammatikasi bo'yicha o'qituvchisiz. O'zbek o'quvchisiga yordam berasiz.
        
        Quyidagi gapni ingliz tiliga tarjima qiling va grammatik tuzatishlar bering:
        
        "{request.uzbek_sentence}"
        
        Javob formati:
        1. To'g'ri tarjima
        2. Grammatika tushuntirishi (o'zbek tilida)
        3. Agar xato bo'lsa, qanday tuzatish kerak
        4. Shunga o'xshash misollar
        5. Eslab qolish uchun maslahat
        
        O'zbek tilida tushuntiring.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": grammar_prompt},
                {"role": "user", "content": request.uzbek_sentence}
            ],
            max_tokens=700,
            temperature=0.2
        )
        
        return {"grammar_help": response.choices[0].message.content}
        
    except Exception as e:
        return {"error": "Grammatika tekshirishda xatolik yuz berdi"}

@app.post("/lesson")
async def structured_lesson(
    request: LessonRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate structured English lesson (Protected)"""
    try:
        if not client.api_key:
            return {"error": "OpenAI API not configured"}
        
        lesson_prompt = f"""
        Siz professional ingliz tili o'qituvchisisiz. O'zbek o'quvchilari uchun strukturali dars tayyorlang.
        
        Mavzu: {request.topic}
        Daraja: {request.level}
        
        Dars rejasi:
        1. Maqsad va vazifalar
        2. Yangi so'zlar (8-10 ta, ma'no va talaffuz bilan)
        3. Grammatika qoidasi (misol va amaliy mashqlar bilan)
        4. Dialog yoki matn (o'zbek madaniyatiga mos)
        5. Amaliy mashqlar (3-5 ta savol)
        6. Uyga vazifa
        7. Foydalanish uchun maslahatlar
        
        Barcha tushuntirishlarni o'zbek tilida bering. Inglizcha misollardan keyin o'zbekcha tarjima qo'shing.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": lesson_prompt},
                {"role": "user", "content": f"Mavzu: {request.topic}, Daraja: {request.level}"}
            ],
            max_tokens=1000,
            temperature=0.4
        )
        
        return {"lesson": response.choices[0].message.content}
        
    except Exception as e:
        return {"error": "Dars tayyorlashda xatolik yuz berdi"}

@app.post("/image-learn")
async def image_learning(
    request: ImageLearningRequest,
    current_user: dict = Depends(get_current_user)
):
    """Learn English from images with cultural context (Protected)"""
    try:
        if not client.api_key:
            return {"error": "OpenAI API not configured"}
        
        # Note: This would need OpenAI Vision API for full implementation
        # For now, we'll provide a template response
        
        return {
            "learning_content": """
            📸 Rasm orqali o'rganish!
            
            Bu funksiya tez orada ishga tushadi. U sizga quyidagi imkoniyatlarni beradi:
            
            🔹 Rasmdagi narsalarni inglizcha o'rganish
            🔹 Matn va yozuvlarni tarjima qilish  
            🔹 Rang, shakl, o'lcham so'zlarini o'rganish
            🔹 O'zbek madaniyatiga mos misollar
            
            Hozircha matinli savollar bilan davom eting!
            """
        }
        
    except Exception as e:
        return {"error": "Rasm orqali o'rganishda xatolik yuz berdi"}

@app.post("/proverb-translate")
async def proverb_translation(
    request: ProverbRequest,
    current_user: dict = Depends(get_current_user)
):
    """Translate Uzbek proverbs and find English equivalents (Protected)"""
    try:
        if not client.api_key:
            return {"error": "OpenAI API not configured"}
        
        proverb_prompt = f"""
        Siz til va madaniyat ekspentisiz. O'zbek maqolini ingliz tiliga tarjima qiling va ekvivalentini toping.
        
        O'zbek maqoli: "{request.uzbek_proverb}"
        
        Quyidagi formatda javob bering:
        1. So'zma-so'z tarjima (literal translation)
        2. Ma'no bo'yicha tarjima (meaning-based translation)
        3. Ingliz tilidagi ekvivalent maqol (agar mavjud bo'lsa)
        4. Madaniy kontekst tushuntirishi
        5. Qachon va qanday ishlatilishi haqida misollar
        6. Shunga o'xshash ingliz maqollar
        
        O'zbek va ingliz madaniyatlarini bog'lab tushuntiring.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": proverb_prompt},
                {"role": "user", "content": request.uzbek_proverb}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        return {"proverb_analysis": response.choices[0].message.content}
        
    except Exception as e:
        return {"error": "Maqol tarjimasida xatolik yuz berdi"}

# User Profile and Settings Endpoints
class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class FeedbackRequest(BaseModel):
    rating: int
    type: str
    message: str

@app.put("/update-profile")
async def update_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Update user information
        if user_update.full_name:
            cursor.execute(
                "UPDATE users SET full_name = ? WHERE id = ?",
                (user_update.full_name, current_user["id"])
            )
        
        conn.commit()
        
        # Get updated user data
        cursor.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],))
        updated_user = cursor.fetchone()
        conn.close()
        
        return {
            "id": updated_user[0],
            "email": updated_user[1],
            "full_name": updated_user[2],
            "is_active": bool(updated_user[4]),
            "created_at": updated_user[5],
            "subscription_plan": updated_user[7] or "free"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

@app.get("/user-stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user usage statistics"""
    try:
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get total chat sessions
        cursor.execute(
            "SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?",
            (current_user["id"],)
        )
        total_chats = cursor.fetchone()[0]
        
        # Get total messages
        cursor.execute("""
            SELECT COUNT(*) FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = ?
        """, (current_user["id"],))
        total_messages = cursor.fetchone()[0]
        
        # Calculate streak days (simplified - days with activity in last 30 days)
        cursor.execute("""
            SELECT COUNT(DISTINCT DATE(cs.created_at)) as streak_days
            FROM chat_sessions cs
            WHERE cs.user_id = ? 
            AND cs.created_at >= datetime('now', '-30 days')
        """, (current_user["id"],))
        streak_days = cursor.fetchone()[0]
        
        # Estimate total time (simplified calculation)
        # Assume average 2 minutes per message
        estimated_time = total_messages * 2 * 60  # in seconds
        
        conn.close()
        
        return {
            "total_chats": total_chats,
            "total_messages": total_messages,
            "total_time": estimated_time,
            "streak_days": streak_days,
            "subscription_plan": current_user.get("subscription_plan", "free")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting user stats: {str(e)}")

@app.post("/submit-feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit user feedback"""
    try:
        conn = sqlite3.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Create feedback table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Insert feedback
        cursor.execute("""
            INSERT INTO feedback (user_id, rating, type, message)
            VALUES (?, ?, ?, ?)
        """, (current_user["id"], feedback.rating, feedback.type, feedback.message))
        
        conn.commit()
        conn.close()
        
        return {"message": "Feedback submitted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@app.get("/subscription-info")
async def get_subscription_info(current_user: dict = Depends(get_current_user)):
    """Get user subscription information"""
    try:
        return {
            "plan": current_user.get("subscription_plan", "free"),
            "expires": current_user.get("subscription_expires"),
            "features": {
                "unlimited_chats": current_user.get("subscription_plan") == "premium",
                "file_uploads": current_user.get("subscription_plan") == "premium",
                "voice_messages": current_user.get("subscription_plan") == "premium",
                "advanced_features": current_user.get("subscription_plan") == "premium"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting subscription info: {str(e)}")

@app.post("/upgrade-subscription")
async def upgrade_subscription(
    plan: str,
    current_user: dict = Depends(get_current_user)
):
    """Upgrade user subscription (placeholder for payment integration)"""
    try:
        # In a real implementation, you would integrate with a payment processor
        # like Stripe, PayPal, or local payment gateways
        
        # For now, just return a placeholder response
        return {
            "message": "Subscription upgrade initiated",
            "plan": plan,
            "status": "pending_payment",
            "payment_url": f"/payment?plan={plan}&user_id={current_user['id']}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upgrading subscription: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 