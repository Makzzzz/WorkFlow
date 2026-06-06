import io
import os
import time
import wave
import numpy as np
import requests
import uuid
import urllib3
from dotenv import load_dotenv
from fastapi import HTTPException


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

AUTHORIZATION_KEY = os.getenv("SALUTE_SPEECH_AUTH_KEY", "")
OAUTH_URL = os.getenv(
    "SALUTE_SPEECH_OAUTH_URL",
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
)
RECOGNIZE_URL = os.getenv(
    "SALUTE_SPEECH_RECOGNIZE_URL",
    "https://smartspeech.sber.ru/rest/v1/speech:recognize"
)

OUTPUT_RATE = 16000

_access_token = None
_token_expires_at = 0


def get_access_token() -> str | None:
    """Получает (или обновляет) Access Token для SaluteSpeech API"""
    global _access_token, _token_expires_at

    if _access_token and time.time() < _token_expires_at:
        return _access_token

    try:
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "RqUID": str(uuid.uuid4()),
            "Authorization": f"Basic {AUTHORIZATION_KEY}"
        }
        data = {"scope": "SALUTE_SPEECH_PERS"}

        response = requests.post(OAUTH_URL, headers=headers, data=data, verify=False, timeout=10)
        response.raise_for_status()

        result = response.json()
        _access_token = result["access_token"]
        expires_in = result.get("expires_in", 1800)
        _token_expires_at = time.time() + expires_in - 60

        return _access_token

    except requests.exceptions.RequestException as e:
        print(f"Ошибка получения токена: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Детали: {e.response.text}")
        return None


def read_wav_to_pcm(wav_bytes: bytes) -> bytes:
    """
    Читает WAV-файл и возвращает сырой PCM 16-bit mono.
    Если частота не 16kHz - делает простой ресемплинг через numpy.
    """
    with wave.open(io.BytesIO(wav_bytes), 'rb') as wf:
        n_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)

    # Проверяем формат
    if sample_width != 2:
        raise HTTPException(
            status_code=400,
            detail=f"Ожидается 16-bit audio, получено {sample_width*8}-bit"
        )

    # Если стерео - берём только первый канал
    if n_channels == 2:
        audio_np = np.frombuffer(raw_data, dtype=np.int16).reshape(-1, 2)[:, 0]
    else:
        audio_np = np.frombuffer(raw_data, dtype=np.int16)

    # Простой ресемплинг до 16kHz, если нужно (линейная интерполяция)
    if framerate != 16000:
        duration = len(audio_np) / framerate
        target_samples = int(duration * 16000)
        indices = np.linspace(0, len(audio_np) - 1, target_samples)
        audio_np = np.interp(indices, np.arange(len(audio_np)), audio_np.astype(np.float32))
        audio_np = audio_np.astype(np.int16)

    return audio_np.tobytes()

def recognize_speech(pcm_bytes: bytes) -> str:
    """
    Отправляет сырые PCM-данные (16-bit, 16kHz, mono) в SaluteSpeech API.
    Возвращает распознанный текст.
    """
    token = get_access_token()
    if not token:
        raise RuntimeError("Не удалось получить токен SaluteSpeech")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"audio/x-pcm;bit=16;rate={OUTPUT_RATE}"
    }

    try:
        response = requests.post(
            RECOGNIZE_URL,
            headers=headers,
            data=pcm_bytes,
            verify=False,
            timeout=60
        )
        response.raise_for_status()

        result = response.json()

        # result["result"] — это список строк
        if "result" in result and isinstance(result["result"], list) and len(result["result"]) > 0:
            return result["result"][0]
        return ""

    except requests.exceptions.RequestException as e:
        print(f"Ошибка API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Статус: {e.response.status_code}")
            print(f"Детали: {e.response.text}")
        raise