from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def render_form_fields(form):
    rendered_values = [render_field(form[field]) for field in form.fields]
    return mark_safe("".join(rendered_values))


@register.simple_tag
def render_field(form_field, **attrs):
    render_function = {
        "select": render_select_input,
        "checkbox": render_checkbox_input,
    }.get(form_field.widget_type, render_text_input)
    return render_function(form_field, **attrs)


@register.simple_tag
def render_text_input(form_field, **attrs):
    TEXT_INPUT_TEMPLATE = """<div class="form-control w-full">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" for="{{ form_field.id_for_label }}">
        {{ form_field.label }}
      </label>
      <div>
        {{ form_field }}
      </div>
      {% if form_field.help_text %}
        <small class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ form_field.help_text|safe }}</small>
      {% endif %}
      {% if form_field.errors %}
        <div class="mt-2 text-sm text-red-600 dark:text-red-400">
          {{ form_field.errors }}
        </div>
      {% endif %}
    </div>
    """
    # Add modern input classes to the field
    if 'class' not in form_field.field.widget.attrs:
        form_field.field.widget.attrs['class'] = ''
    form_field.field.widget.attrs['class'] += ' block w-full px-3 py-2 rounded-md border dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 sm:text-sm'
    
    return _render_field(TEXT_INPUT_TEMPLATE, form_field, **attrs)


@register.simple_tag
def render_select_input(form_field, **attrs):
    SELECT_INPUT_TEMPLATE = """<div class="form-control w-full" {% include "django/forms/attrs.html" %}>
      <label class="label font-bold" for="{{ form_field.id_for_label }}">{{ form_field.label }}</label>
      {{ form_field }}
      <small class="form-text pg-text-muted">{{ form_field.help_text|safe }}</small>
      {{ form_field.errors }}
    </div>
    """
    return _render_field(SELECT_INPUT_TEMPLATE, form_field, **attrs)


@register.simple_tag
def render_checkbox_input(form_field, **attrs):
    CHECKBOX_INPUT_TEMPLATE = """
    <div class="form-control" {% include "django/forms/attrs.html" %}>
      <div class="form-check">
        <label class="label font-bold cursor-pointer">
          {{ form_field }}
          <span class="label-text">{{ form_field.label }}</span>
        </label>
      </div>
      <small class="form-text pg-text-muted">{{ form_field.help_text|safe }}</small>
      {{ form_field.errors }}
    </div>
    """
    return _render_field(CHECKBOX_INPUT_TEMPLATE, form_field, **attrs)


def _render_field(template_text, form_field, **attrs):
    if not form_field.is_hidden:
        template_object = template.Template(template_text)
    else:
        template_object = template.Template("{{ form_field }}")
    attrs = _transform_x_attrs(attrs)
    context = template.Context({"form_field": form_field, "attrs": attrs})
    return template_object.render(context)


def _transform_x_attrs(attrs):
    """
    No support for `@click` style attributes or `.` modifiers
    """

    def _make_x_attr(key):
        if key.startswith("x"):
            # support `x-bind:placeholder` style options
            key = key[1:].replace("__", ":")
            return f"x-{key}"
        return key

    return {_make_x_attr(key): value for key, value in attrs.items()}
