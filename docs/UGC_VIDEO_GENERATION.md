# UGC Video Generation Implementation

## Overview

This is a proof-of-concept implementation for generating UGC (User-Generated Content) videos using fal.ai services. The implementation uses two AI services in sequence:

1. **ElevenLabs TTS** - Converts text to speech with natural-sounding voices
2. **Infinitalk** - Creates a talking avatar video from an image and audio

## Architecture

### Task Flow

```
generate_ugc_video_task(text)
    ↓
Step 1: _generate_tts_audio_with_elevenlabs(text)
    → Returns audio_url
    ↓
Step 2: _generate_talking_avatar_with_infinitalk(audio_url)
    → Returns video_url
    ↓
Return: {status, audio_url, video_url}
```

### Components

#### 1. `generate_ugc_video_task` (Main Task)
- **Type**: Celery shared task
- **Input**: `text` (string) - The text to convert to speech and animate
- **Output**: Dictionary with status, audio_url, and video_url
- **Location**: `apps/aiinterface/tasks.py`

#### 2. `_generate_tts_audio_with_elevenlabs` (Helper Method)
- **Purpose**: Generate TTS audio using ElevenLabs via fal.ai
- **Hardcoded Values**:
  - Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel voice)
  - Model: `fal-ai/elevenlabs/tts/eleven-v3`
- **Returns**: Audio URL or None if failed

#### 3. `_generate_talking_avatar_with_infinitalk` (Helper Method)
- **Purpose**: Create talking avatar video using Infinitalk via fal.ai
- **Hardcoded Values**:
  - Avatar Image: `https://v3.fal.media/files/koala/gmpc0QevDF9bBsL1EAYVF_1c637094161147559f0910a68275dc34.png`
  - Model: `fal-ai/infinitalk`
  - Prompt: "A person talking naturally with expressive facial movements."
- **Returns**: Video URL or None if failed

## Setup

### 1. Install Dependencies

```bash
pip install fal-client
```

Or compile from requirements:
```bash
pip-compile requirements/requirements.in
pip install -r requirements/requirements.txt
```

### 2. Configure API Key

Get your API key from [fal.ai](https://fal.ai) and add it to your `.env` file:

```bash
FAL_KEY="your-api-key-here"
```

The fal-client will automatically read the `FAL_KEY` environment variable.

### 3. Test the Task

```python
from apps.aiinterface.tasks import generate_ugc_video_task

# Call the task directly (synchronous)
result = generate_ugc_video_task("Hello, this is a test of the UGC video generation system.")

# Or call it asynchronously via Celery
task = generate_ugc_video_task.delay("Hello, this is a test of the UGC video generation system.")
result = task.get()
```

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "UGC video generated successfully",
  "audio_url": "https://v3.fal.media/files/.../output.mp3",
  "video_url": "https://v3.fal.media/files/.../output.mp4"
}
```

### Error Response (TTS Failed)
```json
{
  "status": "error",
  "message": "Failed to generate TTS audio",
  "step": "tts_generation"
}
```

### Error Response (Video Failed)
```json
{
  "status": "error",
  "message": "Failed to generate talking avatar video",
  "step": "video_generation",
  "audio_url": "https://v3.fal.media/files/.../output.mp3"
}
```

## Pricing

Based on fal.ai pricing (as of implementation):

- **ElevenLabs TTS**: $0.1 per 1000 characters
- **Infinitalk**: $0.3 per second of video (480p), $0.6 per second (720p)

Example cost calculation for 100-word text (~500 characters):
- TTS: $0.05
- Video (5 seconds at 480p): $1.50
- **Total**: ~$1.55 per video

## Customization

### Change Voice

Edit the `VOICE_ID` in `_generate_tts_audio_with_elevenlabs`:

```python
# Available ElevenLabs voices:
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel (default)
# Or use other voice IDs from ElevenLabs
```

### Change Avatar Image

Edit the `AVATAR_IMAGE_URL` in `_generate_talking_avatar_with_infinitalk`:

```python
AVATAR_IMAGE_URL = "https://your-image-url.com/avatar.png"
```

**Requirements for avatar image:**
- Format: JPG, PNG, WebP, GIF, or AVIF
- Clear face visible
- Good lighting
- Frontal or slightly angled view

### Change Video Quality

Modify the Infinitalk arguments to include resolution:

```python
response = fal_client.run(
    "fal-ai/infinitalk",
    arguments={
        "image_url": AVATAR_IMAGE_URL,
        "audio_url": audio_url,
        "prompt": "A person talking naturally with expressive facial movements.",
        "resolution": "720p"  # Add this for higher quality (doubles the cost)
    }
)
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Import Error**: Checks if fal-client is installed
2. **API Errors**: Catches and logs all fal.ai API errors
3. **Missing URLs**: Validates that audio/video URLs are returned
4. **Unexpected Errors**: Catches all other exceptions

All errors are logged with detailed context for debugging.

## Logging

The task logs detailed information at each step:

```
[UGC Video Task] Starting UGC video generation
[UGC Video Task] Text: Hello, this is a test...
[UGC Video Task] Step 1/2: Generating TTS audio...
[UGC Video - TTS] Starting audio generation with text: Hello, this is a test...
[UGC Video - TTS] Audio generated successfully: https://...
[UGC Video Task] Step 2/2: Generating talking avatar video...
[UGC Video - Infinitalk] Starting video generation with audio: https://...
[UGC Video - Infinitalk] Video generated successfully: https://...
[UGC Video Task] UGC video generation completed successfully
```

## Next Steps

For production use, consider:

1. **Dynamic Voice Selection**: Allow users to choose voices
2. **Custom Avatar Upload**: Let users upload their own avatar images
3. **Video Quality Options**: Provide quality/cost tradeoffs
4. **Progress Tracking**: Implement real-time progress updates via SSE
5. **Result Storage**: Save generated videos to S3/database
6. **Cost Tracking**: Monitor and track generation costs per user
7. **Rate Limiting**: Implement usage limits based on subscription tier
8. **Async Processing**: Use Celery's async capabilities for better UX

## References

- [fal.ai Documentation](https://docs.fal.ai)
- [ElevenLabs TTS on fal.ai](https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3)
- [Infinitalk on fal.ai](https://fal.ai/models/fal-ai/infinitalk)
- [fal-client Python Package](https://pypi.org/project/fal-client/)
