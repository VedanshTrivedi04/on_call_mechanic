# One-by-one request queue (Uber/Ola style)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_mechanic_vehicle_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='mechanic_queue',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='current_index',
            field=models.IntegerField(default=0),
        ),
    ]
