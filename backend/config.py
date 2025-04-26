# backend/config.py
from dotenv import load_dotenv
import os

# .env 파일의 내용을 os.environ 에 채워 넣어 줍니다
load_dotenv()

class Settings:
    OPENAI_API_KEY        = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY     = os.getenv("ANTHROPIC_API_KEY")
    GOOGLE_API_KEY        = os.getenv("GOOGLE_API_KEY")
    GROK_API_KEY          = os.getenv("GROK_API_KEY")
    YOUTUBE_API_KEY       = os.getenv("YOUTUBE_API_KEY")
    GEMINI_API_KEY        = os.getenv("GEMINI_API_KEY")
    SERVER_GEMINI_API_KEY = os.getenv("SERVER_GEMINI_API_KEY")

settings = Settings()
