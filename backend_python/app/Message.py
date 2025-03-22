from dataclasses import dataclass


@dataclass
class Message:
    """
    Represents a message with content.
    Attributes:
        content (str): The content of the message.
    """
    content: str

@dataclass
class Conversation:
    """
    Represents a conversation with a model.
    Attributes:
        chat (str): The chat history.
    """
    chat: str

@dataclass
class TaskMessage:
    """
    Represents a message related to a task.
    Attributes:
        task (str): The name of the task.
        context (str): The context in which the task is being performed.
        files (list[str]): A list of files related to the task.
    """
    task: str
    context: str
    files: list[str]


# Topics to categorize messages within the application
builder_topic = "builder"
# Topic for delegator-related messages
delegator_topic = "delegator"