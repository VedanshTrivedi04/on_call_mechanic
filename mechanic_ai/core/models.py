from django.db import models

class User(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("mechanic", "Mechanic"),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email
    

class EmailOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} - {self.otp}"

class Mechanic(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    location_text = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_available = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    rating = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    VEHICLE_TYPE_CHOICES = [
        ("2W", "2 Wheeler"),
        ("4W", "4 Wheeler"),
        ("EV", "EV Vehicle"),
    ]
    vehicle_type = models.CharField(
        max_length=3,
        choices=VEHICLE_TYPE_CHOICES,
        default="4W",
        help_text="Type of vehicles this mechanic services",
    )



class Service(models.Model):
    service_name = models.CharField(max_length=100)

    def __str__(self):
        return self.service_name


class MechanicService(models.Model):
    mechanic = models.ForeignKey(Mechanic, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)





class Booking(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ACCEPTED", "Accepted"),
        ("EN_ROUTE", "En Route"),
        ("ON_SITE", "On Site"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled")
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mechanic = models.ForeignKey(Mechanic, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    problem = models.CharField(max_length=255, blank=True)
    location_text = models.CharField(max_length=255, blank=True, null=True)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    requested_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)  # when mechanic starts moving
    completed_at = models.DateTimeField(null=True, blank=True)
    fare = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    distance_km = models.FloatField(null=True, blank=True)




class CallLog(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE)
    caller_number = models.CharField(max_length=15)
    receiver_number = models.CharField(max_length=15)
    call_sid = models.CharField(max_length=100)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)





class Rating(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE)
    rating = models.IntegerField()
    feedback = models.TextField(blank=True)


class VoiceSession(models.Model):
    session_id = models.CharField(max_length=100, unique=True)
    state = models.CharField(
        max_length=50,
        default="START"
    )
    problem = models.CharField(max_length=100, null=True, blank=True)
    location = models.TextField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
class ConversationMessage(models.Model):
    session = models.ForeignKey("VoiceSession", on_delete=models.CASCADE)
    role = models.CharField(max_length=10)  # user / assistant
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class ServiceRequest(models.Model):
    """
    One per user request. Shown to mechanics one-by-one (Uber/Ola style).
    mechanic_queue: list of mechanic ids (nearest first); current_index: who is being shown.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    claimed_by = models.ForeignKey(Mechanic, null=True, blank=True, on_delete=models.SET_NULL)
    claimed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    mechanic_queue = models.JSONField(default=list, blank=True)  # [mechanic_id, ...] nearest first
    current_index = models.IntegerField(default=0)  # which mechanic is currently seeing the request