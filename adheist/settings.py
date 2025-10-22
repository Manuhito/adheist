"""
Django settings for AdHeist project.

For more information on this file, see
https://docs.djangoproject.com/en/stable/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/stable/ref/settings/
"""

import os
import sys
from pathlib import Path

import environ
from django.utils.translation import gettext_lazy

# Build paths inside the project like this: BASE_DIR / "subdir".
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
env.read_env(os.path.join(BASE_DIR, ".env"))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/stable/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY", default="django-insecure-30jBKL34WPIjLSBO0SsYTKTCQvQS6QSAlaCKcWCT")

# SECURITY WARNING: don"t run with debug turned on in production!
DEBUG = env.bool("DEBUG", default=True)

# Note: It is not recommended to set ALLOWED_HOSTS to "*" in production
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

# CSRF Settings
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:8000"])
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)
SECURE_PROXY_SSL_HEADER = tuple(env.list("SECURE_PROXY_SSL_HEADER", default=None)) if env("SECURE_PROXY_SSL_HEADER", default=None) else None
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
USE_HTTPS_IN_ABSOLUTE_URLS = env.bool("USE_HTTPS_IN_ABSOLUTE_URLS", default=False)
# Controls whether robots meta tag is added to templates
# If True, no robots meta tag will be added
# If False, <meta name="robots" content="noindex, nofollow"> will be added
ROBOT_INDEX = env.bool("ROBOT_INDEX", default=False)

# Application definition

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.sitemaps",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.forms",
]

# Put your third-party apps here
THIRD_PARTY_APPS = [
    "allauth",  # allauth account/registration management
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.mfa",
    "rest_framework",
    "drf_spectacular",
    "celery_progress",
    "djstripe",  # stripe integration
    "waffle",
    "django_celery_beat",
    "django_summernote",
]

WAGTAIL_APPS = [
    "wagtail.contrib.forms",
    "wagtail.contrib.redirects",
    "wagtail.contrib.simple_translation",
    "wagtail.embeds",
    "wagtail.sites",
    "wagtail.users",
    "wagtail.snippets",
    "wagtail.documents",
    "wagtail.images",
    "wagtail.locales",
    "wagtail.search",
    "wagtail.admin",
    "wagtail",
    "wagtail.api.v2",
    "modelcluster",
    "taggit",
]

# Put your project-specific apps here
PROJECT_APPS = [
    "apps.blog",
    "apps.subscriptions.apps.SubscriptionConfig",
    "apps.users.apps.UserConfig",
    "apps.dashboard.apps.DashboardConfig",
    "apps.web.apps.WebConfig",
    "apps.ads",
    "apps.aiinterface",
    "apps.meta",
    "apps.apify.apps.ApifyConfig",
    "apps.termspages",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + PROJECT_APPS + WAGTAIL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "apps.web.middleware.locale.UserLocaleMiddleware",
    "apps.web.middleware.locale.UserTimezoneMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
    "waffle.middleware.WaffleMiddleware",
]


ROOT_URLCONF = "adheist.urls"


# used to disable the cache in dev, but turn it on in production.
# more here: https://nickjanetakis.com/blog/django-4-1-html-templates-are-cached-by-default-with-debug-true
_DEFAULT_LOADERS = [
    "django.template.loaders.filesystem.Loader",
    "django.template.loaders.app_directories.Loader",
]

_CACHED_LOADERS = [("django.template.loaders.cached.Loader", _DEFAULT_LOADERS)]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates",
        ],
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "apps.web.context_processors.project_meta",
                # this line can be removed if not using google analytics
                "apps.web.context_processors.google_analytics_id",
                "apps.web.context_processors.robot_index",
                # translations for i18n in React components
                "apps.web.context_processors.translations",
                "apps.web.context_processors.posthog_settings",
                "apps.web.context_processors.user_credits",
                "apps.web.context_processors.static_version",
            ],
            "loaders": _DEFAULT_LOADERS if DEBUG else _CACHED_LOADERS,
        },
    },
]

WSGI_APPLICATION = "adheist.wsgi.application"

FORM_RENDERER = "django.forms.renderers.TemplatesSetting"

# Database
# https://docs.djangoproject.com/en/stable/ref/settings/#databases

if "DATABASE_URL" in env:
    DATABASES = {"default": env.db()}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DJANGO_DATABASE_NAME", default="adheist"),
            "USER": env("DJANGO_DATABASE_USER", default="postgres"),
            "PASSWORD": env("DJANGO_DATABASE_PASSWORD", default="***"),
            "HOST": env("DJANGO_DATABASE_HOST", default="localhost"),
            "PORT": env("DJANGO_DATABASE_PORT", default="5432"),
        }
    }

# Auth and Login

# Django recommends overriding the user model even if you don"t think you need to because it makes
# future changes much easier.
AUTH_USER_MODEL = "users.CustomUser"
LOGIN_URL = "account_login"
LOGIN_REDIRECT_URL = "/"

# Password validation
# https://docs.djangoproject.com/en/stable/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Allauth setup

ACCOUNT_ADAPTER = "apps.users.adapter.EmailAsUsernameAdapter"
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_SUBJECT_PREFIX = "[AdHeist] "
ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS = False  # don't send "forgot password" emails to unknown accounts
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE = True
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGIN_BY_CODE_ENABLED = True

ACCOUNT_FORMS = {
    "signup": "apps.users.forms.TermsSignupForm",
}
SOCIALACCOUNT_FORMS = {
    "signup": "apps.users.forms.CustomSocialSignupForm",
}


# User signup configuration: change to "mandatory" to require users to confirm email before signing in.
# or "optional" to send confirmation emails but not require them
ACCOUNT_EMAIL_VERIFICATION = env("ACCOUNT_EMAIL_VERIFICATION", default="none")

AUTHENTICATION_BACKENDS = (
    # Needed to login by username in Django admin, regardless of `allauth`
    "django.contrib.auth.backends.ModelBackend",
    # `allauth` specific authentication methods, such as login by e-mail
    "allauth.account.auth_backends.AuthenticationBackend",
)

# enable social login
SOCIALACCOUNT_PROVIDERS = {
    # Configuración de Google comentada para evitar duplicados con la configuración del admin
    # "google": {
    #     "APPS": [
    #         {
    #             "client_id": env("GOOGLE_CLIENT_ID", default=""),
    #             "secret": env("GOOGLE_SECRET_ID", default=""),
    #             "key": "",
    #         },
    #     ],
    #     "SCOPE": [
    #         "profile",
    #         "email",
    #     ],
    #     "AUTH_PARAMS": {
    #         "access_type": "online",
    #     },
    # },
}

# Email setup

# default email used by your server
SERVER_EMAIL = env("SERVER_EMAIL", default="noreply@localhost:8000")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="hey@adheist.ai")

# Get environment (dev, stage, prod)
APP_ENV = os.environ.get('APP_ENV', 'dev')

# Email backend configuration based on environment
# In development environment, use dummy backend that doesn't send emails
# In other environments, use the configured backend or console backend as default
if APP_ENV == 'dev':
    EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"  # No emails sent in dev
else:
    EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
ANYMAIL = {
    "RESEND_API_KEY": env("RESEND_API_KEY", default=None),
    "RESEND_API_URL": env("RESEND_API_URL", default="https://api.resend.com"),
}


# For turnstile captchas
TURNSTILE_KEY = env("TURNSTILE_KEY", default=None)
TURNSTILE_SECRET = env("TURNSTILE_SECRET", default=None)

# PostHog configuration
POSTHOG_KEY = env("POSTHOG_KEY", default=None)
POSTHOG_HOST = env("POSTHOG_HOST", default="https://app.posthog.com")
POSTHOG_ENABLED = POSTHOG_KEY is not None


# Internationalization
# https://docs.djangoproject.com/en/stable/topics/i18n/

LANGUAGE_CODE = "en-us"
LANGUAGE_COOKIE_NAME = "adheist_language"
LANGUAGES = WAGTAIL_CONTENT_LANGUAGES = [
    ("en", gettext_lazy("English")),
    ("fr", gettext_lazy("French")),
    ("es", gettext_lazy("Spanish")),
]
LOCALE_PATHS = (BASE_DIR / "locale",)

TIME_ZONE = "UTC"

USE_I18N = WAGTAIL_I18N_ENABLED = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/stable/howto/static-files/

STATIC_ROOT = BASE_DIR / "static_root"
STATIC_URL = "/static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        # swap these to use manifest storage to bust cache when files change
        # note: this may break image references in sass/css files which is why it is not enabled by default
        # "BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage",
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

USE_S3_MEDIA = env.bool("USE_S3_MEDIA", default=False)
if USE_S3_MEDIA:
    # Media file storage in S3
    # Using this will require configuration of the S3 bucket
    # See https://docs.saaspegasus.com/configuration.html?#storing-media-files
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="adheist-media")
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    PUBLIC_MEDIA_LOCATION = "media"
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{PUBLIC_MEDIA_LOCATION}/"
    STORAGES["default"] = {
        "BACKEND": "apps.web.storage_backends.PublicMediaStorage",
    }

# Default primary key field type
# https://docs.djangoproject.com/en/stable/ref/settings/#default-auto-field

# future versions of Django will use BigAutoField as the default, but it can result in unwanted library
# migration files being generated, so we stick with AutoField for now.
# change this to BigAutoField if you"re sure you want to use it and aren"t worried about migrations.
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

# Removes deprecation warning for future compatibility.
# see https://adamj.eu/tech/2023/12/07/django-fix-urlfield-assume-scheme-warnings/ for details.
FORMS_URLFIELD_ASSUME_HTTPS = True

# Django sites

SITE_ID = 1

# DRF config
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
}


SPECTACULAR_SETTINGS = {
    "TITLE": "AdHeist",
    "DESCRIPTION": "AdHeist description",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_SETTINGS": {
        "displayOperationId": True,
    },
}

# Redis, cache, and/or Celery setup
if "REDIS_URL" in env:
    REDIS_URL = env("REDIS_URL")
elif "REDIS_TLS_URL" in env:
    REDIS_URL = env("REDIS_TLS_URL")
else:
    REDIS_HOST = env("REDIS_HOST", default="localhost")
    REDIS_PORT = env("REDIS_PORT", default="6379")
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

if REDIS_URL.startswith("rediss"):
    REDIS_URL = f"{REDIS_URL}?ssl_cert_reqs=none"

DUMMY_CACHE = {
    "BACKEND": "django.core.cache.backends.dummy.DummyCache",
}
REDIS_CACHE = {
    "BACKEND": "django.core.cache.backends.redis.RedisCache",
    "LOCATION": REDIS_URL,
}
CACHES = {
    "default": DUMMY_CACHE if DEBUG else REDIS_CACHE,
}

CELERY_BROKER_URL = CELERY_RESULT_BACKEND = REDIS_URL
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# Wagtail config

WAGTAIL_SITE_NAME = "AdHeist"
WAGTAILADMIN_BASE_URL = "http://localhost:8000"


# Pegasus config

# replace any values below with specifics for your project
PROJECT_METADATA = {
    "NAME": gettext_lazy("AdHeist | #1 Ai Ad Generator"), # Meta Title
    "URL": "https://adheist.ai",
    "DESCRIPTION": gettext_lazy("AdHeist is an AI Ad Generator that produces professional advertising creatives and content instantly."),
    "IMAGE": "{{STATIC_URL}}images/web/logo-adheist.png",
    "KEYWORDS": "AI, Ads, SaaS, AdHeist",
    "CONTACT_EMAIL": "hey@adheist.ai",
}

# set this to True in production to have URLs generated with https instead of http
USE_HTTPS_IN_ABSOLUTE_URLS = env.bool("USE_HTTPS_IN_ABSOLUTE_URLS", default=False)

ADMINS = [("AdHeist", "info@adheist.ai")]

# Add your google analytics ID to the environment to connect to Google Analytics
GOOGLE_ANALYTICS_ID = env("GOOGLE_ANALYTICS_ID", default="")

# these daisyui themes are used to set the dark and light themes for the site
# they must be valid themes included in your tailwind.config.js file.
# more here: https://daisyui.com/docs/themes/
LIGHT_THEME = "light"
DARK_THEME = "dark"

# Stripe config
# modeled to be the same as https://github.com/dj-stripe/dj-stripe
# Note: don"t edit these values here - edit them in your .env file or environment variables!
# The defaults are provided to prevent crashes if your keys don"t match the expected format.
STRIPE_LIVE_PUBLIC_KEY = env("STRIPE_LIVE_PUBLIC_KEY", default="pk_live_***")
STRIPE_LIVE_SECRET_KEY = env("STRIPE_LIVE_SECRET_KEY", default="sk_live_***")
STRIPE_TEST_PUBLIC_KEY = env("STRIPE_TEST_PUBLIC_KEY", default="pk_test_***")
STRIPE_TEST_SECRET_KEY = env("STRIPE_TEST_SECRET_KEY", default="sk_test_***")
# Change to True in production
STRIPE_LIVE_MODE = env.bool("STRIPE_LIVE_MODE", False)

# djstripe settings
# Get it from the section in the Stripe dashboard where you added the webhook endpoint
# or from the stripe CLI when testing
DJSTRIPE_WEBHOOK_SECRET = env("DJSTRIPE_WEBHOOK_SECRET", default="whsec_***")
DJSTRIPE_WEBHOOK_VALIDATION = env("DJSTRIPE_WEBHOOK_VALIDATION", default="verify_signature")

DJSTRIPE_FOREIGN_KEY_TO_FIELD = "id"  # change to "djstripe_id" if not a new installation

SILENCED_SYSTEM_CHECKS = [
    "djstripe.I002",  # Pegasus uses the same settings as dj-stripe for keys, so don't complain they are here
]

if "test" in sys.argv:
    # Silence unnecessary warnings in tests
    SILENCED_SYSTEM_CHECKS.append("djstripe.I002")

# Base directory for log files in non-dev environments
LOG_DIR = os.environ.get('DJANGO_LOG_DIR', '/var/log/django/')

# Ensure log directory exists in stage/prod
if APP_ENV in ['stage', 'prod']:
    os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": '[{asctime}] {levelname} "{name}" {message}',
            "style": "{",
            "datefmt": "%d/%b/%Y %H:%M:%S",
        },
        "json": {
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(module)s"}',
            "class": "logging.Formatter",
        },
    },
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": env("DJANGO_LOG_LEVEL", default="INFO"),
            "propagate": True,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {  # Para el código de la aplicación
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "apps.performance": {  # Logger especial para métricas de rendimiento
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "adheist": {
            "handlers": ["console"],
            "level": env("ADHEIST_LOG_LEVEL", default="INFO"),
        },
        "apps.aiinterface": {
            "handlers": ["console"],
            "level": env("AIINTERFACE_LOG_LEVEL", default="INFO"),
        },
    },
}

# Añadir handlers de archivos en entornos de stage y producción
if APP_ENV in ['stage', 'prod']:
    # Definir handlers de archivos
    LOGGING["handlers"]["file_app"] = {
        "level": "INFO",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": os.path.join(LOG_DIR, "app.log"),
        "maxBytes": 10 * 1024 * 1024,  # 10MB
        "backupCount": 5,
        "formatter": "verbose",
    }
    
    LOGGING["handlers"]["file_performance"] = {
        "level": "INFO",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": os.path.join(LOG_DIR, "performance.log"),
        "maxBytes": 10 * 1024 * 1024,  # 10MB
        "backupCount": 5,
        "formatter": "json",
    }
    
    LOGGING["handlers"]["file_errors"] = {
        "level": "ERROR",
        "class": "logging.handlers.RotatingFileHandler",
        "filename": os.path.join(LOG_DIR, "errors.log"),
        "maxBytes": 10 * 1024 * 1024,  # 10MB
        "backupCount": 5,
        "formatter": "verbose",
    }
    
    # Actualizar loggers para usar handlers de archivos
    LOGGING["loggers"]["django"]["handlers"].append("file_app")
    LOGGING["loggers"]["django.request"]["handlers"].append("file_errors")
    LOGGING["loggers"]["apps"]["handlers"] = ["console", "file_app", "file_errors"]
    LOGGING["loggers"]["apps.performance"]["handlers"].append("file_performance")
    
    # Registrar el entorno en el que estamos ejecutando
    import logging
    logging.getLogger("adheist").info(f"Running in {APP_ENV} environment with DEBUG={DEBUG}")

# OpenAI API configuration
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")

# Pricing model configuration
PRICING_MODEL = env("PRICING_MODEL", default="STANDARD")

# Static files versioning for cache busting
# Increment this version number when deploying changes to force browser cache refresh
STATIC_VERSION = env('STATIC_VERSION', default='1.1.7')
