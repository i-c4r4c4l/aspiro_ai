#!/usr/bin/env python3
"""
Aspiro AI Startup Script
Bu skript Aspiro AI ilovasini ishga tushirish uchun mo'ljallangan.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Python versiyasini tekshirish"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 yoki undan yuqori versiyasi kerak!")
        print(f"   Sizda: Python {sys.version}")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    return True

def check_dependencies():
    """Bog'liqliklarni tekshirish"""
    try:
        import fastapi
        import openai
        import uvicorn
        print("✅ Barcha bog'liqliklar o'rnatilgan")
        return True
    except ImportError as e:
        print(f"❌ Bog'liqlik topilmadi: {e}")
        print("   Quyidagi komandani bajaring: pip install -r requirements.txt")
        return False

def check_env_file():
    """Environment faylini tekshirish"""
    if not Path(".env").exists():
        print("⚠️  .env fayli topilmadi")
        print("   env.example faylidan nusxa ko'chiring va API kalitingizni qo'shing")
        print("   Windows: copy env.example .env")
        print("   macOS/Linux: cp env.example .env")
        return False
    
    # .env faylini o'qish
    try:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("REPLIT_SECRET")
        if not api_key or api_key == "your_openai_api_key_here":
            print("⚠️  OpenAI API kaliti sozlanmagan")
            print("   .env faylida OPENAI_API_KEY ni to'g'ri qiymat bilan o'zgartiring")
            return False
        print("✅ Environment o'zgaruvchilari to'g'ri sozlangan")
        return True
    except Exception as e:
        print(f"❌ Environment fayli xatosi: {e}")
        return False

def check_static_files():
    """Static fayllarni tekshirish"""
    static_dir = Path("static")
    required_files = ["index.html", "style.css", "script.js"]
    
    if not static_dir.exists():
        print("❌ static papkasi topilmadi")
        return False
    
    missing_files = []
    for file in required_files:
        if not (static_dir / file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Quyidagi fayllar topilmadi: {', '.join(missing_files)}")
        return False
    
    print("✅ Barcha static fayllar mavjud")
    return True

def start_server():
    """Serverni ishga tushirish"""
    print("\n🚀 Aspiro AI serverni ishga tushirmoqda...")
    print("   Brauzeringizda http://localhost:8000 manzilini oching")
    print("   Serverni to'xtatish uchun Ctrl+C ni bosing\n")
    
    try:
        os.system("python main.py")
    except KeyboardInterrupt:
        print("\n👋 Server to'xtatildi. Rahmat!")
    except Exception as e:
        print(f"\n❌ Server xatosi: {e}")
        print("   Qo'shimcha yordam uchun README.md faylini o'qing")

def main():
    """Asosiy funksiya"""
    print("🎓 Aspiro AI - Startup Script")
    print("=" * 40)
    
    # Barcha tekshiruvlarni o'tkazish
    checks = [
        check_python_version(),
        check_dependencies(),
        check_env_file(),
        check_static_files()
    ]
    
    if all(checks):
        print("\n✅ Barcha tekshiruvlar muvaffaqiyatli!")
        start_server()
    else:
        print("\n❌ Ba'zi muammolar topildi. Iltimos, yuqoridagi ko'rsatmalarni bajaring.")
        print("   Qo'shimcha yordam uchun README.md faylini o'qing.")
        sys.exit(1)

if __name__ == "__main__":
    main() 