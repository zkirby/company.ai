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
from utils.log import log, ContentType

# Load environment variables from the .env.development file
load_dotenv(".env.development")

# Create an instance of the FastAPI application
app = FastAPI()

# Add CORS middleware to the app to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow any HTTP methods
    allow_headers=["*"],  # Allow any HTTP headers
)

model = "gpt-4o-mini"  # Define the model name to be used
# model = "llama3.2:latest"  # Alternative model option (commented out)
api_key = os.getenv("OPENAPI_KEY")  # Retrieve API key from environment variables
# api_key = "placeholder"  # Placeholder for API key (commented out)
# model_info = {
# "vision": False,
# "function_calling": False,
# "json_output": False,
# "family": "unknown",
# }
model_info = None  # Placeholder for model information (currently not used)
# base_url = "http://localhost:11434/v1"  # Base URL for API (commented out)
base_url = None  # Placeholder for base URL (currently not used)

clients: list[WebSocket] = []  # List to keep track of connected WebSocket clients


class WebSocketHandler(logging.Handler):
    def __init__(self):
        super().__init__()  # Initialize the logging handler

    def emit(self, record):
        log_entry = self.format(record)  # Format the log entry
        asyncio.create_task(
            self.send_log(log_entry)
        )  # Send the log entry asynchronously

    async def send_log(self, message: str):
        global clients
        for client in clients:
            try:
                await client.send_text(message)  # Send the log message to each client
            except Exception:
                clients.remove(client)  # Remove the client if there's an error


ws_handler = WebSocketHandler()  # Create a WebSocketHandler instance
logger = logging.getLogger(
    TRACE_LOGGER_NAME
)  # Get the logger instance with the TRACE_LOGGER_NAME
logger.setLevel(logging.DEBUG)  # Set the logging level to DEBUG
logger.addHandler(ws_handler)  # Add the WebSocket handler to the logger


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  # Accept the WebSocket connection
    clients.append(websocket)  # Add the new client to the list of connected clients
    runtime = SingleThreadedAgentRuntime()  # Create an instance of the agent runtime

    # Register the Delegator with the runtime, using the provided factory method
    await Delegator.register(
        runtime,
        type=delegator_topic,
        factory=lambda: Delegator(api_key, model, base_url, model_info),
    )

    # Register the Builder with the runtime, using the provided factory method
    await Builder.register(
        runtime,
        type=builder_topic,
        factory=lambda: Builder(api_key, model, base_url, model_info),
    )

    try:
        while True:
            user_input = (
                await websocket.receive_text()
            )  # Wait for user input from the WebSocket
            log(source="RUNTIME", content="start", contentType=ContentType.SYSTEM)  # Log the start of the runtime
            runtime.start()  # Start the runtime

            # Publish the user input as a message to the delegator topic
            await runtime.publish_message(
                Message(content=user_input),
                topic_id=TopicId(delegator_topic, source="default"),
            )

            await runtime.stop_when_idle()  # Stop the runtime when it is idle
            log(source="RUNTIME", content="end", contentType=ContentType.SYSTEM)  # Log the end of the runtime
    except WebSocketDisconnect:
        clients.remove(websocket)  # Remove the client on disconnection
        # await websocket.close()  # Close the WebSocket connection