# Configuración de Replicate para Generación de Imágenes con nano-banana

## Resumen

Se ha implementado una integración completa con Replicate API usando el modelo **google/nano-banana** para la generación de imágenes, como alternativa a OpenAI. La arquitectura es escalable y mantenible, permitiendo futuros casos de uso.

## Componentes Implementados

### 1. **Configuración (settings.py)**
```python
REPLICATE_API_KEY = env("REPLICATE_API_KEY", default="")
```

**Nota**: Se usa el SDK de Python de Replicate (`replicate` package) con `replicate.run(...)`.

### 2. **Modelo de Configuración (apps/aiinterface/models.py)**
- `ReplicateConfiguration`: Modelo singleton para gestionar configuración
- Campos configurables:
  - `image_replicate_model`: Modelo a usar (default: `google/nano-banana`)
  - `image_replicate_model_version`: Versión específica del modelo (opcional)
  - `image_generation_price`: Precio por imagen (default: $0.04)
  - `timeout_seconds`: Timeout para generación (default: 300s)
  - `polling_interval_seconds`: Intervalo de polling (default: 2s)
- Cache automático para optimizar consultas

### 3. **Servicio (apps/aiinterface/services.py)**
- `ReplicateImageGenerationService`: Servicio para generación de imágenes
- Características:
  - Entrada por `image_input` con URLs HTTP/HTTPS (no rutas locales)
  - Soporte para múltiples imágenes de contexto
  - Manejo de salida compatible con `nano-banana` (URL directa de imagen)
  - Manejo robusto de errores
  - Formato de respuesta compatible con sistema existente
  - Extracción de diagnóstico de predicción (`prediction_id`, `prediction_status`, `prediction_error`, `prediction_logs`)
  - Clasificación de fallos transitorios como `is_retryable` (timeout/throttle/errores temporales)

### 4. **Tarea Celery (apps/aiinterface/tasks.py)**
- `generate_image_task_replicate`: Tarea asíncrona para generación
- Funcionalidades:
  - Generación de prompts con GPT-5
  - Deducción automática de créditos
  - Tracking en PostHog con identificador 'service': 'replicate'
  - Notificaciones Slack en caso de error
  - Guardado de metadata en AdRequestVersion
  - Reintentos automáticos (max 3) en errores `retryable` (incluye timeout/transitorio), no solo 429

### 5. **Admin de Django (apps/aiinterface/admin.py)**
- Panel de administración para `ReplicateConfiguration`
- Organizado en secciones:
  - Model Configuration
  - Pricing Configuration
  - Performance Configuration
- Singleton: solo permite una instancia

## Configuración Inicial

### 1. Variables de Entorno
Añadir al archivo `.env`:
```bash
REPLICATE_API_KEY=tu_api_key_aqui
```

`REPLICATE_API_URL` no es requerido por el flujo actual basado en SDK.

### 2. Migraciones
Ejecutar migraciones para crear el modelo:
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Configuración en Admin
1. Acceder al admin de Django: `/admin/`
2. Ir a "Replicate Configuration"
3. Configurar:
   - Modelo (ej: `google/nano-banana-2`)
   - Precio por imagen
   - Timeouts según necesidad

## Uso Actual

El sistema **ya está configurado** para usar Replicate en lugar de OpenAI:

### Archivos Actualizados:
1. **`apps/ads/views.py`**:
   - `adrequest_version_create`: Usa `generate_image_task_replicate`
   - `adrequest_revision_create`: Usa `generate_image_task_replicate`

2. **`apps/aiinterface/api.py`**:
   - Endpoint `generate_image`: Usa `generate_image_task_replicate`

### Rollback Rápido
Para volver a OpenAI, cambiar los imports:
```python
# De:
from apps.aiinterface.tasks import generate_image_task_replicate
task = generate_image_task_replicate.delay(...)

# A:
from apps.aiinterface.tasks import generate_image_task
task = generate_image_task.delay(...)
```

## Diferencias con OpenAI

| Aspecto | OpenAI | Replicate |
|---------|--------|-----------|
| API | SDK oficial | SDK oficial (`replicate.run`) |
| Imágenes de entrada | Archivos/URLs (se procesan a binario para OpenAI edit) | URLs HTTP/HTTPS en `image_input` |
| Respuesta | Objeto con `b64_json` | URL de salida (string en nano-banana) |
| Metadata | `service` no incluido | `service: 'replicate'` |
| Pricing | Por tokens | Por imagen |
| Retry | Genérico según tarea | Reintento condicional por `is_retryable`/429 |

## Metadata Guardada

En `AdRequestVersion.openai_response_metadata`:
```json
{
  "model": "google/nano-banana-2",
  "service": "replicate",
  "prediction_id": "abc123...",
  "generation_time_seconds": 45.2,
  "metrics": {...},
  "costs": {
    "image_generation_cost": 0.04,
    "total_cost": 0.04
  }
}
```

## PostHog Tracking

Evento: `'Ad Generated'`
```python
properties={
    'version_type': 'initial' | 'revision',
    'service': 'replicate',
    'model': 'google/nano-banana-2',
    'total_cost': '0.04',
    'generated_image': 'https://...',
    'ad_request_id': 123,
    'version_id': 456,
    'timestamp': '2024-01-01T12:00:00'
}
```

## Notificaciones Slack

Errores incluyen contexto:
```python
{
    "prompt": "...",
    "canvas_size": "1024x1024",
    "version_id": 123,
    "version_type": "initial",
    "has_images": True,
    "service": "replicate",
    "status_code": 500,
    "response_data": "...",
    "is_retryable": True,
    "error_type": "replicate_api_error",
    "prediction_id": "...",
    "prediction_status": "failed",
    "prediction_error": "...",
    "prediction_logs": "..."
}
```

## Escalabilidad Futura

La arquitectura permite:

1. **Múltiples modelos**: Cambiar modelo desde admin sin código
2. **Múltiples servicios**: Añadir nuevos servicios (ej: Stability AI)
3. **A/B Testing**: Usar diferentes servicios por usuario
4. **Fallback**: Implementar fallback a OpenAI si Replicate falla
5. **Optimización de costos**: Elegir servicio según precio/calidad

## Mantenimiento

### Logs
- Todos los eventos se loguean con `logger.info/error/exception`
- Identificador: "Replicate" en mensajes

### Monitoreo
- PostHog: Evento 'Ad Generated' con `service: 'replicate'`
- Slack: Notificaciones automáticas en errores
- Admin: Revisar metadata en AdRequestVersion

### Troubleshooting

**Error: "REPLICATE_API_KEY is not configured"**
- Verificar variable en `.env`
- Reiniciar servidor Django

**Error: "Replicate prediction timed out"**
- Se marca como `is_retryable=True` y la tarea reintenta automáticamente (hasta `max_retries`)
- Revisar `prediction_logs` para confirmar causa (`ReadTimeout`, upstream, etc.)
- Verificar estado de Replicate API

**Error: "No prediction URL returned"**
- Verificar formato del modelo
- Revisar logs de Replicate

**Error con `ModelError` sin mensaje**
- Consultar el prediction con su `prediction_id` (API de Replicate)
- Revisar `prediction_logs`/`prediction_status` guardados en contexto y `error_logs`

## Próximos Pasos Sugeridos

1. **Monitoreo de costos**: Dashboard para tracking de gastos
2. **Optimización**: Cache de imágenes similares
3. **Múltiples modelos**: Permitir selección por usuario
4. **Fallback automático**: Si Replicate falla, usar OpenAI
5. **Batch processing**: Generar múltiples imágenes en paralelo
