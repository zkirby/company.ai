from autogen_core import (
    MessageContext,
    TopicId,
    message_handler,
    type_subscription,
)
from Message import Message, TaskMessage, delegator_topic, builder_topic
from pydantic import BaseModel
from utils.crawl_git import crawl_git_project, get_context_files
from utils.log import log, ContentType
from agents.BaseAgent import BaseAgent

class Task(BaseModel):
    overview: str  # Brief description of the task.
    files: list[str]  # List of files associated with the task.


class DelegatorList(BaseModel):
    tasks: list[Task]  # A list of tasks to be assigned to developers.

ROOT = "~/Code/builtbyrobots/timemap"

system_message = """
You are an engineering manager responsible for dividing a software task between 1 to 3 developer LLMs.
Try to use the minimum number of developers and files to achieve this task. MOST of the time you should only need 1 developer.
Remember, this is all managed by LLMs, they don't need to test, they just need very precise directions
You're tasked with assigning which files each developer should edit or create in order to meet the goal. Prefer to edit existing files unless new functionality is necessary
Include important context about what the task is for each developer.
When listing the files for the developer, make sure to include the full path to the file.
"""

@type_subscription(topic_type=delegator_topic)
class Delegator(BaseAgent):
    def __init__(self) -> None:
        super().__init__("An engineering manager", system_message, DelegatorList)  

    @message_handler  # Decorator to handle incoming messages.
    async def handle_message(self, message: Message, ctx: MessageContext) -> None:
        # Retrieve the list of files from the git project directory.
        files = crawl_git_project(ROOT)
        context = get_context_files(ROOT)
        prompt = (
            f"Query to break into tasks: {message.content}\n Existing files: {files}" +
            f"\n\nContext about the project: {context}"
        )
        delegators = await self.call(prompt)

        # Iterate through each task and publish messages for task assignments.
        for [i, task] in enumerate(delegators.tasks):
            log(source=self.id, content=f"{builder_topic}/{self.id.key}{i}", contentType=ContentType.INTERACT)
            log(source=self.id, content=task.overview, contentType=ContentType.MESSAGE)
            log(source=self.id, content=task.files, contentType=ContentType.MESSAGE)
            await self.publish_message(
                message=TaskMessage(
                    task=task.overview,  # Overview of the task to be assigned.
                    context=message.content,  # Context from the original message.
                    files=task.files  # Files associated with the task.
                ),
                topic_id=TopicId(builder_topic, source=f"{self.id.key}{i}"),  # Unique topic ID for each task message.
            )
        
