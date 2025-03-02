import os
import json
from autogen_core import (
    MessageContext,
    RoutedAgent,
    message_handler,
    type_subscription,
)
from autogen_core.models import SystemMessage, UserMessage, ModelInfo
from Message import TaskMessage, builder_topic
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel
from utils.log import log, ContentType

class File(BaseModel):
    file: str
    content: str


class Work(BaseModel):
    files: list[File]


@type_subscription(topic_type=builder_topic)
class Builder(RoutedAgent):
    def __init__(self, api_key: str, model: str, base_url: str, model_info: ModelInfo) -> None:
        super().__init__("A software developer")
        self._system_message = SystemMessage(
            content=(
                "You are an elite software engineer that writes code using node.js and javascript.\n"
                "You are given a list of files you need to write as well as some instructions about \n"
                "how the files you're tasked with fit into the bigger program.\n"
                "You are only responsible for your task, but the team task is provided for context\n"
                "ALWAYS ensure that you output the full contents of the original file and modifications. This file\n"
                "is going to be hot reloaded back into the website so it must be working."
            )
        )
        model_config = SUPPORTED_MODELS[model]["config"]
        self._model_client = OpenAIChatCompletionClient(
            model=model_config.model,
            api_key=model_config.api_key,
            response_format=Work,
            base_url=model_config.base_url,
            model_info=model_config.model_info,
        )
        global_store[self.id] = {"input_tokens": 0, "output_tokens": 0, "model": model, "cost": 0}

    @message_handler
    async def handle_message(self, message: TaskMessage, ctx: MessageContext) -> None:
        """Handles incoming messages and delegates tasks to the model client."""
        prompt_files = file_strings(message)  # Prepare the files for the prompt.
        prompt = f"Team task: {message.context}; Your Task: {message.task}\nFiles: {prompt_files}"
        log(source=self.id, content=prompt, contentType=ContentType.MESSAGE)  # Log the prompt being sent to the model client.
        llm_result = await self._model_client.create(
            messages=[
                self._system_message,
                UserMessage(content=prompt, source=self.id.key),
            ],
        )
        work = llm_result.from_orm(Work)  # Get the content of the model's response.

        global_store[self.id]["input_tokens"] += llm_result.usage.input_tokens
        global_store[self.id]["output_tokens"] += llm_result.usage.output_tokens
        cost = calculate_cost(llm_result.usage, self.model)
        global_store[self.id]["cost"] += cost
        log(source=self.id, content=json.dumps({ "cost": cost, "tokens": llm_result.usage.input_tokens + llm_result.usage.output_tokens }), contentType=ContentType.INFO)

        for item in work.files:
            log(source=self.id, content=item.content, contentType=ContentType.MESSAGE)
            # Ensure the directory exists before writing the file.
            os.makedirs(os.path.dirname(item.file), exist_ok=True)

            with open(item.file, "w") as file:
                file.write(item.content)  # Write the content to the specified file.


def read_file_to_string(file_path):
    """Reads the contents of a file into a string."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        return "EMPTY_FILE"


def file_strings(task: TaskMessage):
    """Creates a string representation of all files in task messages."""
    s = ""
    for file in task.files:
        s += f"{file}\n{read_file_to_string(file)}\n\n"  # Append each file's content to the string.
    return s
