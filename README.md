# 🎓 Aspiro AI - Ingliz tilini o'rganish yordamchisi

**Aspiro AI** - O'zbekiston maktab o'quvchilari va talabalari uchun ingliz tilini o'rganishda yordam beruvchi AI yordamchisi.

## 🌟 Asosiy xususiyatlar

- 🇺🇿 **O'zbek tilida interfeys** - mahalliy tildan boshlang
- 🤖 **AI yordamchisi** - OpenAI GPT bilan ishlaydigan aqlli chatbot
- ⚡ **Tez savollar** - frazeologik fe'llar, rasm tasvirlash va IELTS maslahatlar
- 🎨 **Zamonaviy dizayn** - ko'k/oq rang sxemasi va responsive layout
- 🌙 **Tungi/Kunduzgi rejim** - ko'zlarni himoya qilish uchun
- 💾 **Chat tarixi** - so'nggi suhbatlar saqlanadi
- 📱 **Mobil uchun moslashtirilgan** - barcha qurilmalarda ishlaydi

## 🛠️ Texnologiyalar

### Backend
- **FastAPI** - zamonaviy Python web framework
- **OpenAI GPT** - sun'iy intellekt API
- **Python-dotenv** - muhit o'zgaruvchilari uchun

### Frontend  
- **HTML5/CSS3** - zamonaviy web standartlari
- **Vanilla JavaScript** - qo'shimcha kutubxonalarsiz
- **Font Awesome** - chiroyli ikonkalar
- **Inter Font** - o'qish uchun qulay shrift

## 🚀 O'rnatish va ishga tushirish

### 1. Talablar
- Python 3.8+ 
- OpenAI API kaliti ([bu yerdan oling](https://platform.openai.com/api-keys))

### 2. Loyihani klonlash
```bash
git clone https://github.com/sizning-username/aspiro-ai.git
cd aspiro-ai
```

### 3. Virtual muhit yaratish
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux  
python3 -m venv venv
source venv/bin/activate
```

### 4. Bog'liqliklarni o'rnatish
```bash
pip install -r requirements.txt
```

### 5. Muhit o'zgaruvchilarini sozlash
`env.example` faylidan nusxa ko'chiring va `.env` nomini bering:
```bash
# Windows
copy env.example .env

# macOS/Linux
cp env.example .env
```

`.env` faylini tahrirlang va OpenAI API kalitingizni qo'shing:
```
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
PORT=8000
```

### 6. Serverni ishga tushirish
```bash
python main.py
```

Brauzeringizda `http://localhost:8000` manzilini oching.

## 🌐 Deploy qilish

### Replit
1. Replit.com saytida yangi Python loyiha yarating
2. Barcha fayllarni yuklang
3. Secrets (🔐) bo'limida `REPLIT_SECRET` kalitini qo'shing va OpenAI API kalitingizni kiriting
4. "Run" tugmasini bosing

### Vercel/Netlify  
1. GitHub repositoriyangizni ulang
2. Build komandasi: `pip install -r requirements.txt`
3. Start komandasi: `python main.py`
4. Environment variables bo'limiga `OPENAI_API_KEY` qo'shing

### Heroku
```bash
# Heroku CLI o'rnatilgan bo'lishi kerak
heroku create aspiro-ai-app
heroku config:set OPENAI_API_KEY=your-api-key
git push heroku main
```

## 📖 Foydalanish

1. **Savollar berish**: Pastdagi input maydoniga ingliz tili haqidagi savolingizni yozing
2. **Tez tugmalar**: Uchta tayyor savol tugmalaridan foydalaning:
   - "Frazeologik fe'l nima?" - phrasal verbs haqida ma'lumot
   - "Rasmdagi holatni tasvirla" - rasm tasvirlash bo'yicha maslahat  
   - "IELTS yozma bo'yicha maslahatlar" - IELTS essay yozish uchun ko'rsatmalar
3. **Tungi rejim**: Yuqori o'ng burchakdagi oy/quyosh tugmasini bosing
4. **Chat tarixi**: Oxirgi 10 ta xabar avtomatik saqlanadi

## 🎯 Maqsadli auditoriya

- 🎒 Maktab o'quvchilari (7-11 sinflar)
- 🎓 Kollej va universitet talabalari  
- 📚 Ingliz tilini o'rganmoqchi bo'lganlar
- 📝 IELTS/TOEFL imtihonlariga tayyorlanuvchilar
- 👨‍🏫 Ingliz tili o'qituvchilari

## 🔧 Rivojlantirish

### Loyihaning tuzilishi
```
aspiro-ai/
├── main.py              # FastAPI backend server
├── requirements.txt     # Python dependencies
├── env.example         # Environment variables template
├── README.md           # Bu fayl
└── static/             # Frontend fayllari
    ├── index.html      # Asosiy HTML sahifa
    ├── style.css       # CSS styling
    └── script.js       # JavaScript functionality
```

### Yangi xususiyat qo'shish
1. Backend: `main.py` faylida yangi endpoint yarating
2. Frontend: `static/script.js` da yangi funksiyalar qo'shing
3. Styling: `static/style.css` da yangi stillar yarating

### API Endpoints
- `GET /` - Asosiy sahifa
- `POST /chat` - AI bilan suhbat
- `GET /health` - Server holati

## 🐛 Muammolarni hal qilish

### OpenAI API xatolari
- API kaliti to'g'ri ekanligini tekshiring
- Hisobingizda mablag' borligiga ishonch hosil qiling
- [OpenAI Status](https://status.openai.com/) sahifasini tekshiring

### Server xatolari  
```bash
# Log fayllarini ko'rish
python main.py

# Port band bo'lsa, boshqa portdan foydalaning
PORT=8001 python main.py
```

### Frontend muammolari
- Brauzer cache ni tozalang (Ctrl+F5)
- Developer Console ni oching (F12) va xatolarni tekshiring
- Internet aloqasi mavjudligini tasdiqlang

## 🤝 Hissa qo'shish

1. Loyihani fork qiling
2. Yangi branch yarating (`git checkout -b feature/yangi-xususiyat`)
3. O'zgarishlarni commit qiling (`git commit -am 'Yangi xususiyat qo'shildi'`)
4. Branch ni push qiling (`git push origin feature/yangi-xususiyat`)
5. Pull Request yarating

## 📄 Litsenziya

MIT License - batafsil ma'lumot uchun LICENSE faylini ko'ring.

## 📞 Bog'lanish

- **Email**: support@aspiro-ai.uz
- **Telegram**: @aspiro_ai_bot
- **Website**: https://aspiro-ai.uz

---

## 🇺🇸 English Version

**Aspiro AI** - An AI-powered English learning assistant designed specifically for school children and students in Uzbekistan.

### Features
- Uzbek-first interface with English learning focus
- AI chatbot powered by OpenAI GPT
- Quick action buttons for common questions
- Modern, responsive design
- Dark/light theme toggle
- Chat history persistence
- Mobile-friendly interface

### Quick Start
1. Install Python 3.8+
2. Clone repository and install dependencies
3. Set up OpenAI API key in `.env` file
4. Run `python main.py`
5. Open `http://localhost:8000`

### Tech Stack
- **Backend**: FastAPI, OpenAI API, Python
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Deployment**: Replit, Vercel, Heroku

### Contributing
Pull requests are welcome! Please read the contributing guidelines above.

---

💡 **Maslahat**: Agar biror muammo yuzaga kelsa, GitHub Issues bo'limida savolingizni bering!

🎓 **Omad tilaymiz ingliz tilini o'rganishda!** 