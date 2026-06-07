from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.src.services.speech_to_text_service import recognize_speech, read_wav_to_pcm


router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    """Распознать речь из WAV-файла"""
    wav_bytes = await file.read()
    if not wav_bytes:
        raise HTTPException(status_code=400, detail="Пустой файл")

    try:
        pcm_bytes = read_wav_to_pcm(wav_bytes)
        text = recognize_speech(pcm_bytes)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))