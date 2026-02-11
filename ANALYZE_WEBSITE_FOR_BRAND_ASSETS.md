# analyze_website_for_brand_assets

## Vista (Django)

- **Ruta**: `POST /ads/analyze-website-for-brand-assets/` (según urls del app; ver referencias internas en views).
- **Auth**: `@login_required`.
- **Entrada** (POST):
  - `website_url` (requerido).
  - `is_onboarding` (opcional, string `'true'` o `'false'`).
- **Validación/normalización**:
  - Si falta `website_url` → `400` con `{ success: false, error }`.
  - Si no tiene `http/https` → se prefija con `https://`.
- **Comportamiento**:
  - Lanza tarea Celery `analyze_website_task(user_id, website_url, is_onboarding)`.
  - Responde inmediatamente con `{ success: true, task_id, message }`.

Referencias: `apps/ads/views.py`.

---

## Tarea Celery: `analyze_website_task`

- **Ubicación**: `apps/ads/tasks.py`.
- **Entrada**: `user_id`, `website_url`, `is_onboarding`.
- **Flujo**:
  1. Carga usuario.
  2. Ejecuta `extract_brand_assets_from_website(user, website_url, ad_request_id=None)`.
  3. Si `success`:
     - Si `is_onboarding` y hay `brand`, guarda `brand_id` en `UserOnboarding`.
     - Emite SSE `analysis_completed` con `success`, `extracted_assets`, `brand`, `brand_created`, `cost`.
  4. Si falla o lanza excepción:
     - Emite SSE `analysis_completed` con `success: false` y `error`.

Referencias: `apps/ads/tasks.py`.

---

## SSE: entrega de resultados

- **Canal**: `user:{user_id}:adrequest_updates` en Redis.
- **Evento**: `analysis_completed`.
- **Payload**:
  - `success` (bool), `timestamp`.
  - En éxito: `extracted_assets`, `brand`, `brand_created`, `cost`.
  - En error: `error`.
- **Endpoint SSE**: `/ads/sse/adrequest-updates/` (streaming via Redis).

Referencias: `apps/ads/tasks.py`, `apps/ads/sse.py`.

---

## Extracción de assets desde el sitio

### Función principal

- **`extract_brand_assets_from_website`** en `apps/ads/website_analysis.py`.
- **Pasos**:
  1. **Créditos**: usa `check_user_credits` (general + extra_general) contra `AppConfiguration.brand_assets_generation_cost`. Si no alcanza, lanza excepción.
  2. **Registro**: crea `BrandAssetExtraction(status='processing')`.
  3. **Scraping**: `download_website_content(url, selectors)` decide modo (HTML simple, JSON embebido, Playwright, etc.).
  4. **OpenAI**: `analyze_website_with_openai` envía prompt con `OpenAIConfiguration.get_webparsing_config()`, usa `response_format=json_object`.
  5. **Persistencia**: guarda modelo usado, tokens, costos y `extracted_assets`.
  6. **Creación automática**: `create_brand_from_extraction` crea `UserBrand` y `AdRequestAssets`.
  7. **Créditos**: solo descuenta si la creación del brand fue exitosa (`deduct_extraction_credits`).
  8. **Estado final**: `completed` si brand creado, `failed` si falla.

Referencias: `apps/ads/website_analysis.py`.

### Campos extraídos (OpenAI)

Se espera JSON con:

- `brand_name`, `industry`, `product_description`, `target_audience`, `tone_of_voice`,
  `core_features`, `functional_benefits`, `emotional_benefits`, `proof_points`, `value_propositions`, `brand_colors`.

---

## Creación de Brand + Assets

- **`create_brand_from_extraction`**:
  - Si el nombre existe, lo hace único con sufijo `(1)`, `(2)`, ...
  - Crea `UserBrand` y `AdRequestAssets`.
  - Mapea campos a `AdRequestAssets` (incluye `company_website`, `main_hex_color`, etc.).
  - `main_hex_color` guarda lista de hex válidos como JSON string.

Referencias: `apps/ads/website_analysis.py`.

---

## Frontend: consumo del SSE

- `CreateBrandModal.jsx` escucha `analysis_completed` en `/ads/sse/adrequest-updates/`.
- Si `success`, rellena campos del formulario y muestra notificación cuando se crea brand automáticamente.

Referencias: `assets/javascript/app/components/CreateBrandModal.jsx`.
