from django.db import connection
from core.models import Mechanic

def find_nearby_mechanics(lat, lng, radius_km=10, limit=20):
    sql = """
    SELECT id, (6371 * acos(
      cos(radians(lat)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(%s)) +
      sin(radians(lng)) * sin(radians(latitude))
    )) AS distance_km
    FROM core_mechanic
    WHERE is_available = 1
    HAVING distance_km <= %s
    ORDER BY distance_km
    LIMIT %s;
    """
    params = [lat, lng, lat, radius_km, limit]
    with connection.cursor() as c:
        c.execute(sql, params)
        rows = c.fetchall()
    ids = [r[0] for r in rows]
    mechanics = list(Mechanic.objects.filter(id__in=ids))
    # preserve order by ids list
    mechanics_sorted = sorted(mechanics, key=lambda m: ids.index(m.id))
    return mechanics_sorted
