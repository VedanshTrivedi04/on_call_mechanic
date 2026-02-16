def calculate_fare(distance_km, duration_minutes, parts_cost=0,
                   base_fare=50, per_km=20, per_min=5):
    fare = base_fare + distance_km * per_km + duration_minutes * per_min + parts_cost
    return round(fare, 2)
