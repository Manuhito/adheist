# Ad Generation (Initial)

## Overview
Initial ad generation creates **three AdRequestVersion records**, generates **three GPT-5 variations** (ad copy + image prompt), and then generates **three images** via Replicate (nano-banana). The flow starts from the Django view and runs image generation in Celery.

## Entry Point (View)
**File:** `apps/ads/views.py`

**`adrequest_version_create`**
1. Validates ownership + credits.
2. Creates **3** `AdRequestVersion` rows with status `unassigned`.
3. Collects context image URLs from `AdRequest`.
4. Sets versions to `processing`.
5. Kicks off Celery task `generate_image_task_replicate` with `version_ids` and `version_type="initial"`.

## Task Orchestration
**File:** `apps/aiinterface/tasks.py`

**`generate_image_task_replicate`** (multi-version branch)
1. Loads `AdRequest` using `ad_request_id`.
2. Calls `generate_prompt(...)` to get **one JSON response** containing 3 variations.
3. Parses `variations[]` and for each version:
   - Saves `image_prompt` to `AdRequestVersion.generated_prompt`.
   - Saves `ad_copy` into `AdCopyVersion.ad_copy_text`.
   - Enqueues **one per-version** `generate_image_task_replicate` call (single-version branch).

## Prompt Generation (GPT-5)
**File:** `apps/ads/gen_prompt.py`

**`generate_prompt`** builds `version_data` using:
- Brand data (from base assets/overrides)
- `original_ad_copy` (from `ad_library.ad_creative_bodies`)
- `user_prompt`
- Context images (see below)

**`generate_version_prompt`** sends GPT-5 a system prompt that:
- Preserves the **original ad concept and structure**
- Creates **3 slight variations**
- Returns strict JSON:
```json
{
  "variations": [
    {"version": 1, "ad_copy": "...", "image_prompt": "..."},
    {"version": 2, "ad_copy": "...", "image_prompt": "..."},
    {"version": 3, "ad_copy": "...", "image_prompt": "..."}
  ]
}
```

### Context Images (Initial)
When `version_type="initial"`:
- `ad_library.ad_image`
- `logo_override`
- `product_image_1_override`, `product_image_2_override`
- `app_image_1_override`, `app_image_2_override`
- `marketing_image_1_override`, `marketing_image_2_override`, `marketing_image_3_override`

These are sent to GPT-5 as base64 image inputs.

## Image Generation (Replicate)
**File:** `apps/aiinterface/services.py`

Single-version branch calls `ReplicateImageGenerationService.generate_image_from_text_and_images`:
- Uses `text_prompt` (the per-version `image_prompt` from GPT-5)
- Sends `image_urls` as context images
- Receives a generated image URL from Replicate
- Downloads image bytes and saves to `AdRequestVersion.generated_image`
- Marks status `completed`
- Deducts credits

## Status Updates
`AdRequestVersion` fields updated during the process:
- `status`: `unassigned` → `processing` → `completed` (or `failed`)
- `generated_prompt`: per-version `image_prompt`
- `openai_prompt_response_metadata`: GPT-5 cost + usage
- `openai_response_metadata`: Replicate response metadata

---

## Key Files
- `apps/ads/views.py` → `adrequest_version_create`
- `apps/aiinterface/tasks.py` → `generate_image_task_replicate`
- `apps/ads/gen_prompt.py` → `generate_prompt`, `generate_version_prompt`
- `apps/aiinterface/services.py` → `ReplicateImageGenerationService`
