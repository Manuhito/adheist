#!/usr/bin/env python
"""
Script para limpiar customers de modo LIVE cuando se trabaja en modo TEST.
Ejecutar con: python manage.py shell < fix_customer_mode.py
"""

from django.contrib.auth import get_user_model
from djstripe.models import Customer

User = get_user_model()

# Obtener todos los usuarios con customers
users_with_customers = User.objects.exclude(customer__isnull=True)

print(f"Encontrados {users_with_customers.count()} usuarios con customers")

for user in users_with_customers:
    customer_id = user.customer.id
    print(f"Usuario: {user.email} - Customer ID: {customer_id}")
    
    # Si el customer ID empieza con 'cus_' y no es de test, limpiarlo
    if customer_id.startswith('cus_'):
        print(f"  → Limpiando customer de modo LIVE para {user.email}")
        user.customer = None
        user.save()
        print(f"  ✓ Customer eliminado. Se creará uno nuevo en modo TEST.")

print("\n✓ Proceso completado")
