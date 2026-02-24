# Arquitectura de Celery - Sistema de Colas y Prioridades

## Índice
1. [Visión General](#visión-general)
2. [Topología de Colas y Workers](#topología-de-colas-y-workers)
3. [Configuración de Celery](#configuración-de-celery)
4. [Tareas por Cola y Prioridad](#tareas-por-cola-y-prioridad)
5. [Flujos de Ejecución por Contexto](#flujos-de-ejecución-por-contexto)
6. [Observabilidad y Monitoreo](#observabilidad-y-monitoreo)
7. [Troubleshooting](#troubleshooting)
8. [Consideraciones Importantes](#consideraciones-importantes)

---

## Visión General

El sistema utiliza **Celery** como motor de tareas asíncronas con **Redis** como broker. La arquitectura implementa un modelo de **dos colas** (`priority` y `general`) con **aislamiento estricto** mediante workers dedicados.

### Principios de Diseño

1. **Aislamiento por Cola**: Cada worker consume exclusivamente de una cola específica
2. **Priorización Dinámica**: Las tareas en la cola `general` usan prioridades (1-3) según contexto de invocación
3. **SLA Diferenciado**: La cola `priority` garantiza ejecución inmediata para tareas críticas de UX
4. **Simplicidad Operativa**: Configuración explícita, sin autoscaling automático

---

## Topología de Colas y Workers

### Colas Definidas

| Cola | Propósito | SLA Esperado | Workers Dedicados |
|------|-----------|--------------|-------------------|
| `priority` | Tareas críticas de UX (generación de imágenes) | < 5s | `celery-priority` |
| `general` | Resto de tareas con prioridad dinámica | Variable según prioridad | `celery-general` |

### Workers Configurados

#### `celery-priority`
```bash
celery -A adheist worker -l INFO -Q priority --pool=prefork --concurrency=2
```
- **Cola**: `priority` (exclusiva)
- **Pool**: `prefork` (prod/stage), `solo` (dev/local)
- **Concurrencia**: 2 workers (prod/stage), 1 (dev/local)
- **Propósito**: Garantizar respuesta rápida para generación de imágenes

#### `celery-general`
```bash
celery -A adheist worker -l INFO -Q general --pool=prefork --concurrency=2
```
- **Cola**: `general` (exclusiva)
- **Pool**: `prefork` (prod/stage), `solo` (dev/local)
- **Concurrencia**: 2 workers (prod/stage), 1 (dev/local)
- **Propósito**: Procesar tareas con prioridad dinámica (1=alta, 2=media, 3=baja)

#### `celery-beat`
```bash
celery -A adheist beat -l INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
- **Propósito**: Scheduler para tareas periódicas
- **Scheduler**: Django Celery Beat (configuración en base de datos)

---

## Configuración de Celery

### `adheist/settings.py`

```python
# Broker y Backend
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Scheduler
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Cola por defecto
CELERY_TASK_DEFAULT_QUEUE = "general"

# Definición de colas
CELERY_TASK_QUEUES = (
    Queue("priority"),
    Queue("general"),
)

# Enrutamiento de tareas
CELERY_TASK_ROUTES = {
    # Priority queue (tareas críticas de UX, SLA estricto)
    "apps.aiinterface.tasks.generate_image_task": {"queue": "priority"},
    "apps.aiinterface.tasks.generate_image_task_replicate": {"queue": "priority"},
    
    # General queue (resto de tareas, prioridad se fija en apply_async por contexto)
    # Prioridad 1 (alta): onboarding, user-triggered interactivo
    "apps.ads.tasks.capture_screenshot_task": {"queue": "general"},
    "apps.ads.tasks.analyze_website_task": {"queue": "general"},
    "apps.apify.tasks.competitor_research_task": {"queue": "general"},
    
    # Prioridad 2 (media): creación de AdLibrary desde datasets
    "apps.apify.tasks.create_adlibrary_from_single_ad_task": {"queue": "general"},
    "apps.apify.tasks.create_adlibrary_from_cards_task": {"queue": "general"},
    
    # Prioridad 3 (baja): fetch batch, backload, tareas programadas
    "apps.apify.tasks.fetch_apify_ads": {"queue": "general"},
    "apps.apify.tasks.run_backload_queries": {"queue": "general"},
    "apps.blog.tasks.import_blog_posts_task": {"queue": "general"},
    "apps.ads.tasks.update_ad_runtime_scores": {"queue": "general"},
    
    # Obsoletas (Meta API, mantener por compatibilidad)
    "apps.meta.tasks.fetch_meta_ads": {"queue": "general"},
    "apps.meta.tasks.create_ad_library_entry": {"queue": "general"},
}
```

### Semántica de Configuración

#### `CELERY_TASK_QUEUES`
Define las colas disponibles en el sistema. Solo se declaran `priority` y `general`.

#### `CELERY_TASK_ROUTES`
Mapea cada tarea a su cola de destino. **No define prioridad** (se establece en `apply_async`).

#### `CELERY_TASK_DEFAULT_QUEUE`
Cola por defecto para tareas sin routing explícito. Configurada como `general`.

#### `apply_async(queue, priority)`
Método de invocación que permite especificar:
- `queue`: Cola de destino (sobrescribe `CELERY_TASK_ROUTES` si se especifica)
- `priority`: Nivel de prioridad (0-9, donde 0 es más alta). Usamos 1, 2, 3.

---

## Tareas por Cola y Prioridad

### Cola `priority`

| Tarea | Contexto | Prioridad | SLA |
|-------|----------|-----------|-----|
| `generate_image_task` | Generación de imágenes con DALL-E | Implícita (cola priority) | < 5s |
| `generate_image_task_replicate` | Generación de imágenes con Replicate | Implícita (cola priority) | < 5s |

**Invocación**: Automática vía `CELERY_TASK_ROUTES`, sin necesidad de especificar `queue` en `apply_async`.

### Cola `general`

#### Prioridad 1 (Alta) - Onboarding y User-Triggered

| Tarea | Contexto | Invocación | Archivo |
|-------|----------|------------|---------|
| `competitor_research_task` | Onboarding: investigación de competidores | `apply_async(queue="general", priority=1)` | `apps/ads/views.py:170` |
| `capture_screenshot_task` | Onboarding/User: captura de screenshot | Automática (routing) | `apps/ads/tasks.py` |
| `analyze_website_task` | Onboarding/User: análisis de website | Automática (routing) | `apps/ads/tasks.py` |

**Características**:
- Ejecutadas durante flujos interactivos (onboarding, requests manuales)
- Requieren respuesta rápida para buena UX
- Prioridad más alta en cola `general`

#### Prioridad 2 (Media) - Procesamiento de Datasets

| Tarea | Contexto | Invocación | Archivo |
|-------|----------|------------|---------|
| `create_adlibrary_from_single_ad_task` | Creación de AdLibrary desde Apify dataset | `.delay()` (prioridad implícita) | `apps/apify/tasks.py` |
| `create_adlibrary_from_cards_task` | Creación de AdLibrary desde cards | `.delay()` (prioridad implícita) | `apps/apify/tasks.py` |

**Características**:
- Ejecutadas como consecuencia de `fetch_apify_ads`
- Procesamiento de datos ya obtenidos
- Prioridad media (importante pero no crítico)

#### Prioridad 3 (Baja) - Batch y Tareas Programadas

| Tarea | Contexto | Invocación | Archivo |
|-------|----------|------------|---------|
| `fetch_apify_ads` | View: request advertiser discover | `apply_async(queue="general", priority=3)` | `apps/ads/views.py:3306` |
| `fetch_apify_ads` | Admin: run query manual | `apply_async(queue="general", priority=3)` | `apps/apify/admin.py:115` |
| `fetch_apify_ads` | Management: backload queries | `apply_async(queue="general", priority=3)` | `apps/apify/management/commands/run_backload_queries.py:84` |
| `run_backload_queries` | Tarea programada (nightly) | Automática (routing) | `apps/apify/tasks.py` |
| `import_blog_posts_task` | Importación de posts de blog | Automática (routing) | `apps/blog/tasks.py` |
| `update_ad_runtime_scores` | Actualización de scores de anuncios | Automática (routing) | `apps/ads/tasks.py` |

**Características**:
- Tareas batch, backload, o programadas
- No requieren respuesta inmediata
- Prioridad más baja para no bloquear tareas interactivas

#### Tareas Obsoletas (Compatibilidad)

| Tarea | Estado | Cola |
|-------|--------|------|
| `fetch_meta_ads` | Obsoleta (Meta API) | `general` |
| `create_ad_library_entry` | Obsoleta (Meta API) | `general` |
| `generate_ad_copy_text_task` | Obsoleta | `priority` |

---

## Flujos de Ejecución por Contexto

### 1. Onboarding - Competitor Research

**Punto de entrada**: `POST /ads/competitor-research/`

```
Usuario ingresa URL
    ↓
competitor_research_task (priority=1, queue=general)
    ↓
fetch_apify_ads (inline, NO encolado)
    ↓
process_apify_dataset
    ↓
create_adlibrary_from_single_ad_task.delay() (priority implícita 2)
create_adlibrary_from_cards_task.delay() (priority implícita 2)
```

**Nota importante**: `fetch_apify_ads` se ejecuta **inline** (llamada directa, no vía Celery) dentro de `competitor_research_task`. Por tanto, su prioridad efectiva es la del task padre (priority=1).

### 2. Onboarding - Website Analysis

**Punto de entrada**: `POST /ads/analyze-website/`

```
Usuario ingresa URL
    ↓
Parallel execution:
    ├─ capture_screenshot_task (priority=1, queue=general)
    └─ analyze_website_task (priority=1, queue=general)
```

**Características**:
- Ambas tareas se ejecutan en paralelo
- Prioridad alta (onboarding)
- Notificaciones SSE al completar

### 3. Request Advertiser Discover (User-Triggered)

**Punto de entrada**: `POST /ads/request-brand-ads/`

```
Usuario solicita anuncios de marca
    ↓
fetch_apify_ads.apply_async(queue="general", priority=3)
    ↓
process_apify_dataset
    ↓
create_adlibrary_from_single_ad_task.delay()
create_adlibrary_from_cards_task.delay()
```

**Características**:
- Prioridad 3 (baja) porque no es crítico para UX inmediata
- Usuario puede continuar navegando mientras se procesa

### 4. Admin Manual Query

**Punto de entrada**: Django Admin → Backload → "Run Fetch Command"

```
Admin ejecuta query manual
    ↓
fetch_apify_ads.apply_async(queue="general", priority=3)
    ↓
process_apify_dataset
    ↓
create_adlibrary_from_single_ad_task.delay()
create_adlibrary_from_cards_task.delay()
```

**Características**:
- Prioridad 3 (baja) porque es operación administrativa
- No afecta UX de usuarios finales

### 5. Backload Programado (Nightly)

**Punto de entrada**: Management command `run_backload_queries` (ejecutado por Celery Beat)

```
Celery Beat trigger (scheduled)
    ↓
run_backload_queries (tarea programada)
    ↓
Para cada Backload pendiente:
    fetch_apify_ads.apply_async(queue="general", priority=3)
        ↓
        process_apify_dataset
        ↓
        create_adlibrary_from_single_ad_task.delay()
        create_adlibrary_from_cards_task.delay()
```

**Características**:
- Prioridad 3 (baja) porque es batch nocturno
- Procesa múltiples backloads en secuencia

### 6. Generación de Imágenes (User-Triggered)

**Punto de entrada**: Request de usuario para generar imagen

```
Usuario solicita generación de imagen
    ↓
generate_image_task.apply_async() (queue=priority, implícito)
    ↓
Llamada a DALL-E/Replicate
    ↓
Retorna imagen generada
```

**Características**:
- Cola `priority` (SLA < 5s)
- Crítico para UX (usuario espera resultado inmediato)
- Worker dedicado garantiza no bloqueo

---

## Observabilidad y Monitoreo

### Comandos de Inspección

#### Ver workers activos
```bash
docker-compose exec celery-general celery -A adheist inspect active
```

#### Ver colas activas (todos los workers)
```bash
docker-compose exec celery-general celery -A adheist inspect active_queues
```

**Nota**: `inspect active_queues` muestra **todos los workers del cluster**, no solo el worker local. Es normal ver múltiples nodos.

#### Ver tareas registradas
```bash
docker-compose exec celery-general celery -A adheist inspect registered
```

#### Ver estadísticas de workers
```bash
docker-compose exec celery-general celery -A adheist inspect stats
```

### Métricas Manuales

#### Queue Depth (Tareas Pendientes)

**Redis CLI**:
```bash
docker-compose exec redis redis-cli

# Ver longitud de cola priority
LLEN priority

# Ver longitud de cola general
LLEN general

# Ver todas las claves relacionadas con Celery
KEYS celery*
```

**Interpretación**:
- `0-10`: Normal
- `10-50`: Carga moderada
- `> 50`: Considerar aumentar concurrencia o workers

#### Wait Time p95 (Tiempo de Espera)

**Método manual**:
1. Registrar timestamp al encolar tarea
2. Registrar timestamp al iniciar ejecución
3. Calcular diferencia
4. Agregar en percentil 95

**Implementación sugerida** (futuro):
```python
# En cada task
@shared_task
def my_task():
    enqueued_at = self.request.get('enqueued_at')
    started_at = time.time()
    wait_time = started_at - enqueued_at
    # Log o enviar a sistema de métricas
```

### Logs de Workers

#### Ver logs en tiempo real
```bash
# Worker priority
docker-compose logs -f celery-priority

# Worker general
docker-compose logs -f celery-general

# Celery beat
docker-compose logs -f celery-beat
```

#### Verificar comando de inicio de worker
```bash
docker-compose exec celery-priority ps aux | grep celery
docker-compose exec celery-general ps aux | grep celery
```

**Salida esperada**:
```
celery -A adheist worker -l INFO -Q priority --pool=prefork --concurrency=2
celery -A adheist worker -l INFO -Q general --pool=prefork --concurrency=2
```

---

## Troubleshooting

### Problema: Tareas no se ejecutan

**Síntomas**:
- Tareas encoladas pero no procesadas
- `LLEN <queue>` muestra tareas pendientes pero workers inactivos

**Diagnóstico**:
```bash
# 1. Verificar workers activos
docker-compose ps | grep celery

# 2. Ver logs de workers
docker-compose logs celery-priority celery-general

# 3. Verificar conexión a Redis
docker-compose exec celery-general celery -A adheist inspect ping
```

**Soluciones**:
- Reiniciar workers: `docker-compose restart celery-priority celery-general`
- Verificar Redis: `docker-compose ps redis`
- Verificar configuración de colas en `settings.py`

### Problema: Tareas en cola incorrecta

**Síntomas**:
- Tarea esperada en `priority` aparece en `general` o viceversa

**Diagnóstico**:
```bash
# Ver routing de tareas
docker-compose exec celery-general celery -A adheist inspect registered
```

**Soluciones**:
- Verificar `CELERY_TASK_ROUTES` en `settings.py`
- Verificar invocación con `apply_async(queue=...)`
- Reiniciar workers después de cambios en `settings.py`

### Problema: Workers escuchan colas incorrectas

**Síntomas**:
- `inspect active_queues` muestra workers escuchando múltiples colas

**Diagnóstico**:
```bash
# Verificar comando de inicio
docker-compose exec celery-priority ps aux | grep celery
docker-compose exec celery-general ps aux | grep celery
```

**Soluciones**:
- Verificar `docker-compose.yml` (argumento `-Q`)
- Reconstruir contenedores: `docker-compose down && docker-compose up --build -d`

### Problema: Prioridades no se respetan

**Síntomas**:
- Tareas de baja prioridad se ejecutan antes que las de alta prioridad

**Diagnóstico**:
```bash
# Ver tareas activas y su orden
docker-compose exec celery-general celery -A adheist inspect active
```

**Causas comunes**:
- Prioridad no especificada en `apply_async` (usa default)
- Worker con concurrency=1 procesa tareas en orden FIFO estricto
- Redis no configurado para prioridades (requiere `CELERY_ACKS_LATE=True`)

**Soluciones**:
- Verificar `apply_async(priority=X)` en código
- Aumentar concurrency si es necesario
- Configurar `CELERY_ACKS_LATE=True` en `settings.py` (si no está)

### Problema: Workers consumen demasiada memoria

**Síntomas**:
- Contenedores Docker usan > 1GB RAM
- OOM kills en logs

**Diagnóstico**:
```bash
docker stats
```

**Soluciones**:
- Reducir concurrency en `docker-compose.yml`
- Configurar `CELERYD_MAX_TASKS_PER_CHILD=100` en `settings.py`
- Usar pool `solo` en dev/local (ya configurado)

---

## Consideraciones Importantes

### 1. Ejecución Inline vs Encolada

**Inline** (llamada directa):
```python
result = my_task(arg1, arg2)  # Se ejecuta en el proceso actual
```

**Encolada** (asíncrona):
```python
my_task.delay(arg1, arg2)  # Se encola en Celery
my_task.apply_async(args=[arg1, arg2], queue="general", priority=1)  # Con opciones
```

**Caso especial**: `fetch_apify_ads` en `competitor_research_task`
- Se ejecuta **inline** (no encolado)
- Hereda la prioridad del task padre
- No aparece como tarea separada en logs de Celery

### 2. Prioridades en Redis

Redis no soporta prioridades nativas. Celery implementa prioridades mediante:
- Múltiples listas internas por nivel de prioridad
- Workers consultan listas en orden de prioridad

**Limitación**: Si un worker está ocupado, tareas de alta prioridad esperan igual.

**Solución**: Aumentar concurrency o workers dedicados.

### 3. Colas Obsoletas

Las siguientes colas fueron reemplazadas:
- `interactive` → `general` (priority=1)
- `user_ingestion` → `general` (priority=1)
- `batch_ingestion` → `general` (priority=3)
- `low` → `general` (priority=3)

**No eliminar de `CELERY_TASK_ROUTES`** si hay tareas legacy que aún las referencian.

### 4. Cambios en Configuración

**Después de modificar `settings.py`**:
```bash
# Reiniciar workers
docker-compose restart celery-priority celery-general celery-beat

# O reconstruir si cambios en Dockerfile
docker-compose down
docker-compose up --build -d
```

**Después de modificar `docker-compose.yml`**:
```bash
docker-compose down
docker-compose up -d
```

### 5. Pool Types

| Pool | Uso | Ventajas | Desventajas |
|------|-----|----------|-------------|
| `prefork` | Producción/Staging | Paralelismo real, robusto | Mayor consumo de memoria |
| `solo` | Desarrollo/Local | Bajo consumo, fácil debug | Sin paralelismo |
| `gevent` | I/O intensivo | Alta concurrencia | Requiere código async-aware |

**Configuración actual**:
- Prod/Stage: `prefork` con `concurrency=2`
- Dev/Local: `solo` (single-threaded)

### 6. Monitoring Futuro

**Recomendaciones para implementar**:
- **Flower**: UI web para monitoreo de Celery
- **Prometheus + Grafana**: Métricas de queue depth, wait time, throughput
- **Sentry**: Tracking de errores en tareas
- **Custom metrics**: Logging estructurado de tiempos de ejecución

### 7. Escalado

**Horizontal (más workers)**:
```yaml
# docker-compose.yml
celery-general-2:
  <<: *celery-general  # Hereda configuración
  container_name: celery-general-2
```

**Vertical (más concurrency)**:
```yaml
celery-general:
  command: celery -A adheist worker -l INFO -Q general --pool=prefork --concurrency=4
```

**Recomendación**: Escalar horizontalmente (más workers) antes que verticalmente.

### 8. Playwright y Recursos

Las tareas que usan Playwright (`capture_screenshot_task`, `analyze_website_task`) consumen más recursos:
- Lanzan instancias de Chromium
- Requieren más memoria y CPU

**Consideración**: Limitar concurrency de workers que ejecutan estas tareas si hay problemas de recursos.

### 9. Retry y Error Handling

**Configuración de retry** (ejemplo):
```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def my_task(self):
    try:
        # código
    except Exception as exc:
        raise self.retry(exc=exc)
```

**Tareas actuales**: Verificar si tienen retry configurado. Considerar añadir para tareas críticas.

### 10. Seguridad

**Variables de entorno sensibles**:
- `REDIS_URL`: Debe estar en `.env`, no hardcodeado
- `OPENAI_API_KEY`: Usado en tareas de análisis
- Credentials de Apify, Meta API, etc.

**Verificar**: Todas las credenciales están en `.env` y no en código.

---

## Resumen de Comandos Útiles

```bash
# Ver estado de contenedores
docker-compose ps

# Reiniciar workers
docker-compose restart celery-priority celery-general

# Ver logs en tiempo real
docker-compose logs -f celery-general

# Inspeccionar workers
docker-compose exec celery-general celery -A adheist inspect active
docker-compose exec celery-general celery -A adheist inspect active_queues
docker-compose exec celery-general celery -A adheist inspect stats

# Redis CLI
docker-compose exec redis redis-cli
> LLEN general
> LLEN priority
> KEYS celery*

# Verificar comando de worker
docker-compose exec celery-general ps aux | grep celery

# Reconstruir todo
docker-compose down
docker-compose up --build -d
```

---

## Changelog

### 2026-02-24 - Implementación de Sistema de Dos Colas

**Cambios principales**:
1. Migración de 4 colas (`interactive`, `user_ingestion`, `batch_ingestion`, `low`) a 2 colas (`priority`, `general`)
2. Implementación de prioridades dinámicas (1, 2, 3) en cola `general`
3. Actualización de todas las invocaciones de `fetch_apify_ads` a `apply_async(queue="general", priority=3)`
4. Actualización de `competitor_research_task` a `apply_async(queue="general", priority=1)`
5. Configuración de workers dedicados en todos los `docker-compose.yml`
6. Fix de `download_website_content_with_playwright` para usar `domcontentloaded` (evitar 404 en SPAs)

**Archivos modificados**:
- `adheist/settings.py`: Configuración de colas y routing
- `apps/ads/views.py`: Actualización de `competitor_research` y `request_brand_ads`
- `apps/apify/admin.py`: Actualización de `run_fetch_command`
- `apps/apify/management/commands/run_backload_queries.py`: Actualización de invocación
- `docker-compose.yml`, `.dev`, `.local`, `.prod`, `.stage`: Configuración de workers
- `apps/ads/website_analysis.py`: Fix de Playwright para SPAs

**Verificado**:
- No quedan referencias a colas antiguas en código Python
- Workers escuchan exclusivamente sus colas asignadas
- Tareas se ejecutan correctamente en cola `general`
- Screenshot y análisis de website funcionan correctamente

---

**Documentación generada**: 2026-02-24  
**Versión**: 1.0  
**Autor**: Sistema de Documentación Automática
