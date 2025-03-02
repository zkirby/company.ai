import json
from autogen_core import RoutedAgent
from autogen_core.models import SystemMessage, UserMessage
from pydantic import BaseModel
from utils.models import SUPPORTED_MODELS, DEFAULT_MODEL
from utils.log import log, ContentType
from utils.cost import calculate_cost
from store import global_store

class Agent(RoutedAgent):
    def __init__(self, description: str, system_message: str, response_format: BaseModel) -> None:
        super().__init__(description)
        self._system_message = SystemMessage(content=system_message) 
        self.model = DEFAULT_MODEL

        model_config = SUPPORTED_MODELS[self.model]
        self._model_client = model_config["get_model"](response_format)
        self.response_format = response_format
        self.url_friendly_id = f"{self.id.key}|{self.id.type}"

        global_store[self.url_friendly_id] = {"input_tokens": 0, "output_tokens": 0, "model": self.model, "cost": 0}
    
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
        global_store[self.url_friendly_id]["input_tokens"] += input_tokens
        global_store[self.url_friendly_id]["output_tokens"] += output_tokens
        cost = calculate_cost(input_tokens, output_tokens, self.model)
        global_store[self.url_friendly_id]["cost"] += cost
        log(source=self.id, content=json.dumps({ "cost": cost, "input_tokens": input_tokens, "output_tokens": output_tokens }), contentType=ContentType.INFO)

        content = self.response_format.model_validate_json(llm_result.content)
        return content
