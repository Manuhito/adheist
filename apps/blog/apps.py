from django.apps import AppConfig


class BlogConfig(AppConfig):
    name = 'apps.blog'
    verbose_name = 'Blog'

    def ready(self):
        """
        Import signal handlers when the app is ready
        """
        # Import Celery tasks to ensure they are registered
        import apps.blog.tasks  # noqa
