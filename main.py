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

# System prompt in Uzbek
SYSTEM_PROMPT = """Siz Aspiro AI yordamchisiz. O'quvchilarga ingliz tili bo'yicha sodda, foydali, misollar bilan tushuntirib berasiz. Har doim o'zbek tilida gapiring. 

Quyidagi qoidalarga amal qiling:
- Javoblarni sodda va tushunarli qiling
- Misollar keltiring
- O'zbek tilida tushuntiring
- Ingliz tilidagi so'zlar uchun talaffuz ko'rsatmalarini bering
- Qisqa va aniq javob bering"""

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

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Handle chat requests with OpenAI"""
    try:
        if not client.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Create chat completion
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        return ChatResponse(response=ai_response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Aspiro AI is running!"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 