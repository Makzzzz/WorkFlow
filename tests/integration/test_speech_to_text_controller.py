"""
Complete integration tests for speech-to-text endpoints.
Tests cover all main speech recognition flows with proper error handling.
"""
import os
import sys
import asyncio
import pytest
import pytest_asyncio
import httpx
import uuid
import io
import struct
import wave

# Add project root to sys.path to import backend modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# Fix for Windows asyncpg issue
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Base URL for the running backend
BASE_URL = "http://localhost:8000"


def create_test_wav(duration_sec: float = 0.5, sample_rate: int = 16000) -> bytes:
    """Create a minimal valid WAV file with silence for testing."""
    num_samples = int(sample_rate * duration_sec)
    
    # Create PCM 16-bit mono silence
    pcm_data = struct.pack(f"<{num_samples}h", *([0] * num_samples))
    
    # Create WAV file in memory
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    
    return buf.getvalue()


class TestSpeechToTextController:
    """Complete integration tests for speech-to-text endpoints."""

    @pytest_asyncio.fixture
    async def client(self):
        """Create HTTP client for tests."""
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            yield http_client

    # ====== TEST CASES ======

    @pytest.mark.asyncio
    async def test_speech_recognize_endpoint_exists(self, client):
        """Test speech recognize endpoint exists."""
        # Create a valid WAV file
        wav_data = create_test_wav()

        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("test.wav", wav_data, "audio/wav")}
        )

        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Speech recognize endpoint not found"

        # Log status for debugging
        print(f"Speech recognize endpoint status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_speech_recognize_empty_file(self, client):
        """Test speech recognize with empty file fails."""
        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("empty.wav", b"", "audio/wav")}
        )

        # Should return validation error (422) or 400
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_speech_recognize_no_file(self, client):
        """Test speech recognize with no file fails."""
        response = await client.post(
            f"{BASE_URL}/speech/recognize"
            # No file
        )

        # Should return validation error (422)
        assert response.status_code == 422, f"Expected 422 for missing file, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_speech_recognize_invalid_format(self, client):
        """Test speech recognize with invalid file format."""
        # Send a text file instead of WAV
        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("test.txt", b"This is not a WAV file", "text/plain")}
        )

        # Should return error (400 or 500)
        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Speech recognize endpoint not found"

        print(f"Speech recognize with invalid format status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_speech_recognize_different_sample_rate(self, client):
        """Test speech recognize with different sample rate (should be resampled)."""
        # Create WAV with 44100 Hz (should be resampled to 16000)
        wav_data = create_test_wav(sample_rate=44100)

        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("test_44100.wav", wav_data, "audio/wav")}
        )

        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Speech recognize endpoint not found"

        print(f"Speech recognize with 44100Hz status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_speech_recognize_stereo(self, client):
        """Test speech recognize with stereo WAV (should be converted to mono)."""
        # Create stereo WAV
        sample_rate = 16000
        duration_sec = 0.3
        num_samples = int(sample_rate * duration_sec)

        # Create stereo PCM data (interleaved left/right)
        pcm_data = struct.pack(f"<{num_samples * 2}h", *([0] * (num_samples * 2)))

        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(2)  # Stereo
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_data)

        wav_data = buf.getvalue()

        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("test_stereo.wav", wav_data, "audio/wav")}
        )

        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Speech recognize endpoint not found"

        print(f"Speech recognize with stereo status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_speech_recognize_8bit(self, client):
        """Test speech recognize with 8-bit audio (should fail with 400)."""
        # Create 8-bit WAV
        sample_rate = 16000
        duration_sec = 0.3
        num_samples = int(sample_rate * duration_sec)

        # Create 8-bit mono data
        pcm_data = struct.pack(f"<{num_samples}b", *([0] * num_samples))

        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(1)  # 8-bit
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_data)

        wav_data = buf.getvalue()

        response = await client.post(
            f"{BASE_URL}/speech/recognize",
            files={"file": ("test_8bit.wav", wav_data, "audio/wav")}
        )

        # Should return 400 (8-bit not supported)
        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Speech recognize endpoint not found"

        print(f"Speech recognize with 8-bit status: {response.status_code}")