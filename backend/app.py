import asyncio
import logging
import os

from autogen_core import TRACE_LOGGER_NAME, SingleThreadedAgentRuntime, TopicId
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from agents.Delegator import Delegator
from agents.Builder import Builder
from Message import Message, delegator_topic, builder_topic

load_dotenv(".env.development")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = "gpt-4o-mini"
# model = "llama3.2:latest"
api_key = os.getenv("OPENAPI_KEY")
# api_key = "placeholder"
# model_info = {
# "vision": False,
# "function_calling": False,
# "json_output": False,
# "family": "unknown",
# }
model_info = None
# base_url = "http://localhost:11434/v1"
base_url = None

clients: list[WebSocket] = []


class WebSocketHandler(logging.Handler):
    def __init__(self):
        super().__init__()

    def emit(self, record):
        log_entry = self.format(record)
        asyncio.create_task(self.send_log(log_entry))

    async def send_log(self, message: str):
        global clients
        for client in clients:
            try:
                await client.send_text(message)
            except Exception:
                clients.remove(client)


ws_handler = WebSocketHandler()
logger = logging.getLogger(TRACE_LOGGER_NAME)
logger.setLevel(logging.DEBUG)
logger.addHandler(ws_handler)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    runtime = SingleThreadedAgentRuntime()

    await Delegator.register(
        runtime,
        type=delegator_topic,
        factory=lambda: Delegator(api_key, model, base_url, model_info),
    )

    await Builder.register(
        runtime,
        type=builder_topic,
        factory=lambda: Builder(api_key, model, base_url, model_info),
    )

    try:
        while True:
            user_input = await websocket.receive_text()
            logger.info("RUNTIME[$]start")
            runtime.start()

            await runtime.publish_message(
                Message(content=user_input),
                topic_id=TopicId(delegator_topic, source="default"),
            )

            await runtime.stop_when_idle()
            logger.info("RUNTIME[$]end")
    except WebSocketDisconnect:
        clients.remove(websocket)
        await websocket.close()
