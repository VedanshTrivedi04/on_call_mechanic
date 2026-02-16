from channels.generic.websocket import AsyncJsonWebsocketConsumer

class UserConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.group_name = f"user_{self.user_id}"

        print("👤 USER CONNECTED:", self.group_name)

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def send_notification(self, event):
        print("📩 USER NOTIFICATION:", event)
        await self.send_json(event["payload"])
