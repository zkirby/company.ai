from autogen_core import (
    MessageContext,
    RoutedAgent,
    TopicId,
    message_handler,
    type_subscription,
)
from autogen_core.models import SystemMessage, UserMessage, ModelInfo
from Message import Message, TaskMessage, delegator_topic, builder_topic
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel
from utils.crawl_git import crawl_git_project, get_context_files
from utils.log import log, ContentType

class Task(BaseModel):
    overview: str  # Brief description of the task.
    files: list[str]  # List of files associated with the task.


class DelegatorList(BaseModel):
    tasks: list[Task]  # A list of tasks to be assigned to developers.


@type_subscription(topic_type=delegator_topic)
class Delegator(RoutedAgent):
    def __init__(self, api_key: str, model: str, base_url: str, model_info: ModelInfo) -> None:
        # Initialize the Delegator with required parameters including API key, model, and base URL.
        super().__init__("An engineering manager")  # Call parent class constructor with role description.
        self._system_message = SystemMessage(
            content=(
                "You are an engineering manager responsible for dividing a software task between 1 to 3 developer LLMs.\n"
                "Try to use the minimum number of developers and files to achieve this task. MOST of the time you should only need 1 developer.\n"
                "Remember, this is all managed by LLMs, they don't need to test, they just need very precise directions\n"
                "You're tasked with assigning which files each developer should edit or create in order to meet the goal. Prefer to edit existing files unless new functionality is necessary\n"
                "Include important context about what the task is for each developer."
            )
        )
        model_config = SUPPORTED_MODELS[model]["config"]
        self._model_client = OpenAIChatCompletionClient(
            model=model_config.model,
            api_key=model_config.api_key,
            response_format=DelegatorList,
            base_url=model_config.base_url,
            model_info=model_config.model_info,
        )
        self.model = model
        global_store[self.id] = {"input_tokens": 0, "output_tokens": 0, "model": model, "cost": 0}

    @message_handler  # Decorator to handle incoming messages.
    async def handle_message(self, message: Message, ctx: MessageContext) -> None:
        # Retrieve the list of files from the git project directory.
        files = crawl_git_project("~/Code/builtbyrobots/timemap")
        context = get_context_files("~/Code/builtbyrobots/timemap")
        prompt = (
            f"Query to break into tasks: {message.content}\n Existing files: {files}" +
            f"\n\nContext about the project: {context}"
        )
        log(source=self.id, content=prompt, contentType=ContentType.MESSAGE)  # Log the prompt being sent to the model.

        # Create a response from the model using the constructed prompt.
        llm_result = await self._model_client.create(
            messages=[
                self._system_message,
                UserMessage(content=prompt, source=self.id.key),  # User message containing the prompt.
            ],
        )

        delegators = llm_result.from_orm(DelegatorList)
        log(source=self.id, content=response)  # Log the delegators parsed from the model's response.
        global_store[self.id]["input_tokens"] += llm_result.usage.input_tokens
        global_store[self.id]["output_tokens"] += llm_result.usage.output_tokens
        cost = calculate_cost(llm_result.usage, self.model)
        global_store[self.id]["cost"] += cost
        log(source=self.id, content=json.dumps({ "cost": cost, "tokens": llm_result.usage.input_tokens + llm_result.usage.output_tokens }), contentType=ContentType.INFO)

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
        
