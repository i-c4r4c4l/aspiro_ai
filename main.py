from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

app = FastAPI(title="Aspiro AI", description="English learning assistant for Uzbek students")

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

@app.get("/")
async def read_root():
    """Serve the landing page"""
    from fastapi.responses import FileResponse
    return FileResponse("index.html")

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
    return FileResponse("test_features.html")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Handle chat requests with OpenAI - Enhanced for Uzbek students"""
    try:
        if not client.api_key:
            return ChatResponse(response="Kechirasiz, hozircha xizmat ishlamayapti. Iltimos, keyinroq qayta urinib ko'ring.")
        
        # Create chat completion with optimized settings
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using GPT-4o-mini for better performance and cost
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
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
        
        return ChatResponse(response=ai_response)
        
    except Exception as e:
        # Friendly error message in Uzbek
        error_messages = [
            "Kechirasiz, hozirda texnik nosozlik. Bir oz kutib, qayta urinib ko'ring.",
            "Serverda muammo yuz berdi. Iltimos, qayta urinib ko'ring.",
            "Internet aloqasini tekshiring va qayta harakat qiling."
        ]
        import random
        return ChatResponse(response=random.choice(error_messages))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Aspiro AI is running!"}

@app.post("/pronunciation")
async def pronunciation_help(request: PronunciationRequest):
    """Get pronunciation help for specific words"""
    try:
        prompt = f""""{request.word}" so'zining to'g'ri talaffuzini o'rgatib bering:
        1. Kirill harflarda yozib bering
        2. O'zbek tilida yaqin tovushlar bilan solishtirib ko'rsating
        3. Umumiy talaffuz xatolarini tuzatib ko'rsating
        4. 2-3 ta misol gap keltiring"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.3,
            top_p=0.9
        )
        
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pronunciation error: {str(e)}")

@app.post("/grammar-check")
async def grammar_correction(request: GrammarRequest):
    """Correct Uzbek sentences to proper English"""
    try:
        prompt = f"""O'zbek gapni ingliz tiliga to'g'ri tarjima qilib, grammatika xatolarini tushuntiring:
        
        O'zbek gap: "{request.uzbek_sentence}"
        
        Berish kerak:
        1. To'g'ri ingliz tarjimasi
        2. Grammatika tuzatmalar va tushuntirishlar
        3. O'zbek va ingliz grammatikasi orasidagi farqlar
        4. Qo'shimcha mashq gaplari"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3,
            top_p=0.9
        )
        
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grammar check error: {str(e)}")

@app.post("/lesson")
async def structured_lesson(request: LessonRequest):
    """Generate structured lessons by topic and level"""
    try:
        prompt = f""""{request.topic}" mavzusida {request.level} darajasidagi o'quvchi uchun struktirlangan dars tayyorlang:
        
        Dars rejasi:
        1. 📚 Asosiy tushunchalar (5-7 ta yangi so'z/grammatika)
        2. 💡 Misollar (o'zbek kontekstida)  
        3. 🎯 Amaliy mashqlar (3-4 ta)
        4. ✅ Nazorat savollari (2-3 ta)
        5. 🏠 Uy vazifasi
        
        Talaffuz va grammatika xatolariga alohida e'tibor bering."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=700,
            temperature=0.3,
            top_p=0.9
        )
        
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson generation error: {str(e)}")

@app.post("/image-learn")
async def image_learning(request: ImageLearningRequest):
    """Learn English from images using AI vision"""
    try:
        # For demo purposes, we'll use a simple prompt
        # In production, you'd use GPT-4 Vision or similar
        prompt = """Rasmda nimalar borligini ingliz tilida ayting va quyidagi formatda javob bering:
        
        🔍 Nima ko'rinmoqda: [object name in English]
        📝 Talaffuz: [phonetic transcription in Cyrillic]
        🇺🇿 O'zbek tilida: [Uzbek translation]
        📚 Misol gap: [example sentence]
        💡 Qo'shimcha ma'lumot: [cultural context or usage tips]
        
        Agar bir nechta narsalar ko'rinsa, eng muhim 3 tasini tanlang."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3,
            top_p=0.9
        )
        
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image learning error: {str(e)}")

@app.post("/proverb-translate")
async def proverb_translation(request: ProverbRequest):
    """Translate Uzbek proverbs to English equivalents"""
    try:
        prompt = f"""O'zbek maqolini ingliz tiliga tarjima qilib, madaniy kontekstini tushuntiring:
        
        O'zbek maqol: "{request.uzbek_proverb}"
        
        Berish kerak:
        📜 Ingliz ekvivalenti: [closest English equivalent]
        🔤 So'zma-so'z tarjima: [literal translation]
        🌍 Madaniy tushuntirish: [cultural explanation]
        💬 Qachon ishlatiladi: [when to use it]
        🎯 Ingliz tilida o'xshash iboralar: [similar English expressions]
        
        Agar aynan bir xil ma'noli ingliz maqoli bo'lmasa, eng yaqinini toping."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.3,
            top_p=0.9
        )
        
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proverb translation error: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 