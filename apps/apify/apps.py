from django.apps import AppConfig


class ApifyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.apify"
    label = "apify"
    
    def ready(self):
        """
        Importar y registrar las tareas de Celery cuando la aplicación esté lista.
        Este método se llama cuando Django ha terminado de cargar todas las aplicaciones.
        """
        # Importar las tareas aquí para evitar problemas de inicialización circular
        # No hacemos nada más, Celery autodescubrirá las tareas
        pass
