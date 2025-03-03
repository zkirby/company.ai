import json
from autogen_core import RoutedAgent
from autogen_core.models import SystemMessage, UserMessage
from pydantic import BaseModel
from utils.models import SUPPORTED_MODELS, DEFAULT_MODEL
from utils.log import log, ContentType
from utils.cost import calculate_cost
from store import GLOBAL_PROJECT_ID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from Models import Agent
from db import get_db

class BaseAgent(RoutedAgent):
    def __init__(self, description: str, system_message: str, response_format: BaseModel) -> None:
        super().__init__(description)
        self._system_message = SystemMessage(content=system_message) 
        self.model = DEFAULT_MODEL

        model_config = SUPPORTED_MODELS[self.model]
        self._model_client = model_config["get_model"](response_format)
        self.response_format = response_format
        self.url_friendly_id = f"{self.id.key}|{self.id.type}"
        self.description = description

        import asyncio
        asyncio.create_task(self.create_agent())

    async def create_agent(self):
        print(GLOBAL_PROJECT_ID)
        db = await get_db()

        # Check if agent already exists for this project
        result = await db.execute(select(Agent).filter(Agent.id == self.url_friendly_id, Agent.project_id == GLOBAL_PROJECT_ID))
        existing_agent = result.scalar_one_or_none()
        
        if existing_agent is None:
            db_agent = Agent(
                id=self.url_friendly_id,
                project_id=GLOBAL_PROJECT_ID
            )
            db.add(db_agent)
            await db.commit()
            await db.refresh(db_agent)
            return db_agent
        
        return existing_agent

    

    async def call(self, prompt: str) -> None:
        log(source=self.id, content=prompt, contentType=ContentType.MESSAGE)
        llm_result = await self._model_client.create(
            messages=[
                self._system_message,
                UserMessage(content=prompt, source=self.id.key),
            ],
        )

        input_tokens = llm_result.usage.prompt_tokens
        output_tokens = llm_result.usage.completion_tokens
        cost = calculate_cost(input_tokens, output_tokens, self.model)

        db = await get_db()
        result = await db.execute(select(Agent).filter(Agent.id == self.url_friendly_id, Agent.project_id == GLOBAL_PROJECT_ID))
        db_agent = result.scalar_one()
        db_agent.input_tokens += input_tokens
        db_agent.output_tokens += output_tokens 
        db_agent.cost += cost
        await db.commit()

        log(source=self.id, content=json.dumps({ "cost": cost, "input_tokens": input_tokens, "output_tokens": output_tokens }), contentType=ContentType.INFO)

        content = self.response_format.model_validate_json(llm_result.content)
        return content
