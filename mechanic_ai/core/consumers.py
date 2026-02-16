from channels.generic.websocket import AsyncJsonWebsocketConsumer


# -------------------------
# MECHANIC LISTENER
# -------------------------
class MechanicConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.mechanic_id = self.scope["url_route"]["kwargs"]["mechanic_id"]
        self.group_name = f"mechanic_{self.mechanic_id}"

        print("🔥 Mechanic connected to group:", self.group_name)

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

    async def send_request(self, event):
        print("🔥 SEND_REQUEST TRIGGERED:", event)
        await self.send_json(event["payload"])

# -------------------------
# BOOKING LISTENER (generic room per booking)
# -------------------------
class BookingConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.booking_id = self.scope["url_route"]["kwargs"]["booking_id"]
        self.group_name = f"booking_{self.booking_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

    async def location_update(self, event):
        await self.send_json(event["payload"])
class VideoCallConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.booking_id = self.scope["url_route"]["kwargs"]["booking_id"]
        self.group_name = f"video_{self.booking_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

    async def receive_json(self, content):
        # legacy video signaling (kept for backward compatibility)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "video_signal",
                "payload": content,
            },
        )

    async def video_signal(self, event):
        await self.send_json(event["payload"])


class UserConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.group_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def send_notification(self, event):
        await self.send_json(event["payload"])

class TrackingConsumer(AsyncJsonWebsocketConsumer):
    """Single consumer for ws/tracking/<booking_id>/ – location & status updates."""

    async def connect(self):
        self.booking_id = self.scope["url_route"]["kwargs"]["booking_id"]
        self.group_name = f"tracking_{self.booking_id}"
        print("🟢 Tracking connected:", self.group_name)
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        print("🔴 Tracking disconnected:", self.group_name)
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def tracking_message(self, event):
        print("📡 Tracking message:", event["payload"].get("type"))
        await self.send_json(event["payload"])

    # mechanic moving (from booking room)
    async def location_update(self, event):
        await self.send_json(event["payload"])

    # live location updates from update_tracking view
    async def send_location(self, event):
        await self.send_json(event["payload"])

    # mechanic accepted
    async def mechanic_assigned(self, event):
        await self.send_json(event["payload"])

    # job completed
    async def job_completed(self, event):
        await self.send_json(event["payload"])


# -------------------------
# CALL SIGNALLING (WebRTC) – ws/call/<booking_id>/
# Message types: start_call, incoming_call, accept_call, reject_call,
#                offer, answer, ice-candidate, end_call
# IMPORTANT: Do NOT allow offer/answer/ice-candidate exchange before accept_call
# -------------------------
_call_states = {}  # {booking_id: {"accepted": bool, "caller": str}}


class CallConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        try:
            # URL route gives booking_id as string (from re_path \d+)
            self.booking_id = str(self.scope["url_route"]["kwargs"]["booking_id"])
            self.group_name = f"call_{self.booking_id}"
            print(f"[CALL] connect booking_id={self.booking_id} group={self.group_name} channel={self.channel_name}")

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )
            await self.accept()
            print(f"[CALL] accept done booking_id={self.booking_id}")
        except Exception as e:
            print(f"[CALL] connect ERROR: {e}")
            raise

    async def disconnect(self, close_code):
        bid = getattr(self, "booking_id", None)
        gname = getattr(self, "group_name", None)
        print(f"[CALL] disconnect booking_id={bid} close_code={close_code}")
        _call_states.pop(bid, None)
        if gname:
            await self.channel_layer.group_discard(gname, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """
        Call flow:
        1. Caller sends start_call → Server forwards incoming_call to receiver only
        2. Receiver sends accept_call → Server marks accepted, notifies caller
        3. Only after accept_call: offer, answer, ice-candidate are forwarded
        4. reject_call / end_call → reset state, notify other peer
        """
        try:
            if not isinstance(content, dict):
                print(f"[CALL] receive_json invalid content type: {type(content)}")
                return
            msg_type = content.get("type")
            sender = content.get("sender")
            print(f"[CALL] receive_json booking_id={self.booking_id} type={msg_type} sender={sender}")

            if self.booking_id not in _call_states:
                _call_states[self.booking_id] = {"accepted": False, "caller": None}

            # start_call → send incoming_call to other peer only
            if msg_type == "start_call":
                _call_states[self.booking_id]["caller"] = sender
                payload = {
                    "type": "incoming_call",
                    "booking_id": self.booking_id,
                    "from": sender,
                }
                await self._forward(payload)
                return

            # accept_call → mark accepted, forward to caller
            if msg_type == "accept_call":
                _call_states[self.booking_id]["accepted"] = True
                await self._forward({"type": "accept_call", "sender": sender})
                return

            # reject_call → reset state, forward to caller
            if msg_type == "reject_call":
                _call_states[self.booking_id]["accepted"] = False
                _call_states[self.booking_id]["caller"] = None
                await self._forward({"type": "reject_call", "sender": sender})
                return

            # end_call → reset state, forward to other peer
            if msg_type == "end_call":
                _call_states[self.booking_id]["accepted"] = False
                _call_states[self.booking_id]["caller"] = None
                await self._forward({"type": "end_call", "sender": sender})
                return

            # offer, answer, ice-candidate → only forward if call already accepted
            if msg_type in ("offer", "answer", "ice-candidate"):
                if not _call_states[self.booking_id].get("accepted", False):
                    print(f"[CALL] drop {msg_type} (call not accepted yet)")
                    return
                await self._forward(content)
                return

            await self._forward(content)
        except Exception as e:
            print(f"[CALL] receive_json ERROR: {e}")
            # Do not re-raise: avoid closing the socket on client message errors

    async def _forward(self, payload):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "forward_signal",
                "payload": payload,
                "sender_channel_name": self.channel_name,
            },
        )

    async def forward_signal(self, event):
        if event.get("sender_channel_name") == self.channel_name:
            return
        try:
            await self.send_json(event["payload"])
        except Exception as e:
            print(f"[CALL] forward_signal send_json ERROR: {e}")