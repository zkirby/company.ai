import asyncio
import logging
import os
import json
from autogen_core import TRACE_LOGGER_NAME, SingleThreadedAgentRuntime, TopicId
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents.Delegator import Delegator
from agents.Builder import Builder
from Message import Message, delegator_topic, builder_topic, Conversation
from utils.log import log, ContentType, UserTopics
from Models import Project, Agent
from db import get_db_context
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from store import GLOBAL_PROJECT_ID

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow any HTTP methods
    allow_headers=["*"],  # Allow any HTTP headers
)
clients: list[WebSocket] = [] 


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


ws_handler = WebSocketHandler() 
logger = logging.getLogger(
    TRACE_LOGGER_NAME
) 
logger.setLevel(logging.DEBUG)  
logger.addHandler(ws_handler)  

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  
    clients.append(websocket)  
    runtime = SingleThreadedAgentRuntime()  

    # Register the Delegator with the runtime, using the provided factory method
    await Delegator.register(
        runtime,
        type=delegator_topic,
        factory=lambda: Delegator(),
    )

    # Register the Builder with the runtime, using the provided factory method
    await Builder.register(
        runtime,
        type=builder_topic,
        factory=lambda: Builder(),
    )

    try:
        while True:
            user_input = (
                await websocket.receive_text()
            )  
            log(source="RUNTIME", content="start", contentType=ContentType.SYSTEM)  
            runtime.start()  

            [topic, _id, message] = user_input.split("[$]")

            if topic == UserTopics.CONVERSATION.value:
                [agent, source] = _id.split("/")
                await runtime.publish_message(
                    Conversation(chat=message),
                    topic_id=TopicId(agent, source=source),
                )
            elif topic == UserTopics.TASK.value:
                await runtime.publish_message(
                    Message(content=message),
                    topic_id=TopicId(delegator_topic, source="default"),
                )

            await runtime.stop_when_idle()  
            log(source="RUNTIME", content="end", contentType=ContentType.SYSTEM)  
    except WebSocketDisconnect:
        clients.remove(websocket)  
        # await websocket.close()  # Close the WebSocket connection

@app.get("/info/{key}")
async def get_value(key: str):
    async with get_db_context() as db:
        result = await db.execute(select(Agent).filter(Agent.id == key, Agent.project_id == GLOBAL_PROJECT_ID))
        agent = result.scalar_one_or_none()
        if agent is None:
            return {"cost": 0, "model": "none", "input_tokens": 0, "output_tokens": 0}
        return {"cost": agent.cost, "model": agent.model, "input_tokens": agent.input_tokens, "output_tokens": agent.output_tokens}

@app.post("/projects/")
async def create_project(project: dict):
    async with get_db_context() as db:
        db_project = Project(name=project["name"])
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project

@app.get("/projects/")
async def get_projects():
    async with get_db_context() as db:
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        return projects

@app.get("/projects/active")
async def get_active_project():
    async with get_db_context() as db:
        # Get project
        result = await db.execute(select(Project).filter(Project.id == GLOBAL_PROJECT_ID))
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all agents for this project
        agents_result = await db.execute(select(Agent).filter(Agent.project_id == GLOBAL_PROJECT_ID))
        agents = agents_result.scalars().all()
        
        # Calculate totals
        total_input_tokens = sum(agent.input_tokens for agent in agents)
        total_output_tokens = sum(agent.output_tokens for agent in agents)
        total_cost = sum(agent.cost for agent in agents)
        
        # Add totals to project response
        project_dict = {
            "id": project.id,
            "name": project.name,
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens, 
            "total_tokens": total_input_tokens + total_output_tokens,
            "total_cost": total_cost
        }
        
        return project_dict


@app.post("/projects/{project_id}/activate")
async def set_active_project(project_id: int):
    async with get_db_context() as db:
        # Verify project exists
        result = await db.execute(select(Project).filter(Project.id == project_id))
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Set global project ID
        global GLOBAL_PROJECT_ID
        GLOBAL_PROJECT_ID = project_id
        return {"message": f"Activated project {project_id}"}