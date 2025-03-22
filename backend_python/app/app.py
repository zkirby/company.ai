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
runtime = SingleThreadedAgentRuntime()


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

async def setup_runtime():
    """Initialize the runtime with all necessary agent registrations"""
    global runtime
    
    # Register the Delegator with the runtime
    await Delegator.register(
        runtime,
        type=delegator_topic,
        factory=lambda: Delegator(),
    )

    # Register the Builder with the runtime
    await Builder.register(
        runtime,
        type=builder_topic,
        factory=lambda: Builder(),
    )

@app.on_event("startup")
async def startup_event():
    """Run any startup tasks"""
    await setup_runtime()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  
    clients.append(websocket)

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

@app.get("/models")
async def get_models():
    from utils.models import SUPPORTED_MODELS
    # Return model names and their associated pricing info
    models = {
        model_name: {
            "price": model_info["price"],
            "context_window": model_info["context_window"]
        } 
        for model_name, model_info in SUPPORTED_MODELS.items()
    }
    return models

@app.put("/agents/{key}/model")
async def update_agent_model(key: str, model_data: dict):
    from utils.models import SUPPORTED_MODELS
    
    model_name = model_data.get("model")
    if model_name not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model {model_name} not supported")
    
    # First update in database
    async with get_db_context() as db:
        result = await db.execute(select(Agent).filter(Agent.id == key, Agent.project_id == GLOBAL_PROJECT_ID))
        agent = result.scalar_one_or_none()
        if agent is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent.model = model_name
        await db.commit()
    
    # Then, if the agent is in memory, also update its runtime configuration
    try:
        # Get the agent type and key from the database ID
        key_parts = key.split("|")
        if len(key_parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid agent key format")
        
        agent_type, agent_key = key_parts
        
        # Find the correct agent in the runtime
        # For Delegator
        if agent_type == delegator_topic:
            agent_instance = await runtime.get_agent(
                topic_id=TopicId(agent_type, source=agent_key)
            )
            if agent_instance:
                await agent_instance.update_model(model_name)
        
        # For Builder
        elif agent_type == builder_topic:
            agent_instance = await runtime.get_agent(
                topic_id=TopicId(agent_type, source=agent_key)
            )
            if agent_instance:
                await agent_instance.update_model(model_name)
    except Exception as e:
        # Don't fail the request if this part fails (agent might not be loaded yet)
        log(source="RUNTIME", content=f"Error updating agent model: {str(e)}", contentType=ContentType.ERROR)
        
    return {"message": f"Updated agent model to {model_name}"}

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