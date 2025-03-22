import os
import json
from autogen_core import (
    MessageContext,
    message_handler,
    type_subscription,
)
from Message import TaskMessage, builder_topic
from pydantic import BaseModel
from utils.log import log, ContentType
from agents.BaseAgent import BaseAgent

class File(BaseModel):
    file: str
    content: str


class Work(BaseModel):
    files: list[File]


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



system_message = """
You are an elite software engineer that writes code using node.js and javascript.
You are given a list of files you need to write as well as some instructions about 
how the files you're tasked with fit into the bigger program.
You are only responsible for your task, but the team task is provided for context
ALWAYS ensure that you output the full contents of the original file and modifications. This file
is going to be hot reloaded back into the website so it must be working.
"""

@type_subscription(topic_type=builder_topic)
class Builder(BaseAgent):
    def __init__(self) -> None:
        super().__init__("A software developer", system_message, Work)

    @message_handler
    async def handle_message(self, message: TaskMessage, ctx: MessageContext) -> None:
        """Handles incoming messages and delegates tasks to the model client."""
        prompt_files = file_strings(message)  # Prepare the files for the prompt.
        prompt = f"Team task: {message.context}; Your Task: {message.task}\nFiles: {prompt_files}"

        work = await self.call(prompt)

        for item in work.files:
            log(source=self.id, content=item.content, contentType=ContentType.MESSAGE)
            os.makedirs(os.path.dirname(item.file), exist_ok=True)

            with open(item.file, "w") as file:
                file.write(item.content)  

