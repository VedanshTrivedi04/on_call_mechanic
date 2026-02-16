from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.models import Booking, Service


@api_view(["GET"])
def user_bookings(request):
    """List all bookings for a user (history)."""
    user_id = request.query_params.get("user_id")
    if not user_id:
        return Response({"error": "user_id required"}, status=400)

    bookings = (
        Booking.objects.filter(user_id=user_id)
        .order_by("-requested_at")
        .values(
            "id",
            "problem",
            "location_text",
            "status",
            "fare",
            "requested_at",
            "completed_at",
        )
    )
    list_bookings = []
    for b in bookings:
        list_bookings.append({
            "id": b["id"],
            "problem": b["problem"] or "—",
            "location_text": b["location_text"] or "—",
            "status": b["status"],
            "fare": float(b["fare"]) if b["fare"] is not None else None,
            "requested_at": b["requested_at"].isoformat() if b["requested_at"] else None,
            "completed_at": b["completed_at"].isoformat() if b["completed_at"] else None,
        })
    return Response({"bookings": list_bookings})


@api_view(["GET"])
def get_services(request):
    """Get all available services."""
    services = Service.objects.all().values("id", "service_name")
    
    # Enhanced service details (can be moved to database later)
    # Includes all services from ServicesCarousel
    service_details = {
        "Flat Tire Repair": {
            "description": "Puncture repairs or spare tire installation at your location. We handle all vehicle types from hatchbacks to SUVs.",
            "price": "Starts at ₹299",
            "icon": "fas fa-tools",
            "features": [
                "On-site Puncture Repair",
                "Spare Wheel Swapping",
                "Air Pressure Check"
            ],
            "image": "/assets/images/service1.jpg"
        },
        "Battery Jumpstart": {
            "description": "Dead battery? Our mechanics carry heavy-duty jump cables and portable starters to get you moving instantly.",
            "price": "Starts at ₹199",
            "icon": "fas fa-bolt",
            "features": [
                "Voltage Testing",
                "Terminal Cleaning",
                "New Battery Replacement (Optional)"
            ],
            "image": "/assets/images/service2.jpg"
        },
        "Emergency Towing": {
            "description": "Safe and secure towing to the nearest workshop or your preferred destination when the car cannot be fixed on-site.",
            "price": "Starts at ₹999",
            "icon": "fas fa-truck-pickup",
            "features": [
                "Flatbed Towing available",
                "24/7 Availability",
                "Long-distance Towing"
            ],
            "image": "/assets/images/service3.jpg"
        },
        "Fluid Delivery": {
            "description": "Run out of engine oil, coolant, or other fluids? We'll deliver and top up fluids to get you back on the road.",
            "price": "Starts at ₹399",
            "icon": "fas fa-gas-pump",
            "features": [
                "Engine Oil Delivery",
                "Coolant & Water Delivery",
                "Brake Fluid Top-up"
            ],
            "image": "/assets/images/service4.jpg"
        },
        "Scanning & Diagnostics": {
            "description": "Professional scanning and diagnostics to identify engine issues and provide detailed reports for your vehicle.",
            "price": "Starts at ₹499",
            "icon": "fas fa-cog",
            "features": [
                "OBD-II Scanning",
                "Error Code Reading",
                "Detailed Diagnostic Report"
            ],
            "image": "/assets/images/service6.jpg"
        },
        "Engine Diagnostics": {
            "description": "Professional scanning and diagnostics to identify engine issues and provide solutions.",
            "price": "Starts at ₹499",
            "icon": "fas fa-cog",
            "features": [
                "OBD-II Scanning",
                "Error Code Reading",
                "Detailed Report"
            ],
            "image": "/assets/images/service6.jpg"
        },
        "Brake Repair": {
            "description": "Brake issues? Our mechanics can diagnose and fix brake problems on-site when possible, ensuring your safety.",
            "price": "Starts at ₹599",
            "icon": "fas fa-circle-notch",
            "features": [
                "Brake Pad Replacement",
                "Brake Fluid Check",
                "Brake System Inspection"
            ],
            "image": "/assets/images/service6.jpg"
        },
        "Key & Lockout": {
            "description": "Locked out of your vehicle? Our experts can help you get back inside safely without damaging your car.",
            "price": "Starts at ₹349",
            "icon": "fas fa-key",
            "features": [
                "Car Lockout Service",
                "Key Duplication",
                "Remote Programming"
            ],
            "image": "/assets/images/service6.jpg"
        },
        "Minor On-site Fixes": {
            "description": "Quick fixes for minor issues like loose wires, fuses, belts, and other small repairs that can be done on-site.",
            "price": "Starts at ₹249",
            "icon": "fas fa-wrench",
            "features": [
                "Fuse Replacement",
                "Belt Adjustments",
                "Minor Electrical Fixes"
            ],
            "image": "/assets/images/service6.jpg"
        },
        "Fuel Delivery": {
            "description": "Run out of fuel? We'll deliver fuel to your location so you can get back on the road.",
            "price": "Starts at ₹399",
            "icon": "fas fa-gas-pump",
            "features": [
                "Petrol/Diesel Delivery",
                "Quick Service",
                "All Vehicle Types"
            ],
            "image": "/assets/images/service4.jpg"
        }
    }
    
    services_list = []
    for service in services:
        service_name = service["service_name"]
        details = service_details.get(service_name, {
            "description": f"Professional {service_name} service.",
            "price": "Contact for pricing",
            "icon": "fas fa-wrench",
            "features": ["Professional Service", "24/7 Available"],
            "image": "/assets/images/service1.jpg"
        })
        
        services_list.append({
            "id": service["id"],
            "name": service_name,
            "description": details["description"],
            "price": details["price"],
            "icon": details["icon"],
            "features": details["features"],
            "image": details["image"]
        })
    
    return Response({"services": services_list})
