from django.shortcuts import render
from django.utils.translation import gettext_lazy as _
from django.shortcuts import redirect

def home(request):
    if request.user.is_authenticated:
        return redirect("ads:ads_home")
    else:
        return render(request, "web/landing_page.html")


def simulate_error(request):
    raise Exception("This is a simulated error.")
