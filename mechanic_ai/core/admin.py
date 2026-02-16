from django.contrib import admin
from .models import *
# Register your models here.
admin.site.register(User),
admin.site.register(Mechanic),
admin.site.register(Service),
admin.site.register(MechanicService),
admin.site.register(CallLog),
admin.site.register(Booking),
admin.site.register(Rating),
admin.site.register(VoiceSession),
admin.site.register(ServiceRequest),