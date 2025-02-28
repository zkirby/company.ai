from dataclasses import dataclass


@dataclass
class Message:
    content: str


@dataclass
class TaskMessage:
    task: str
    context: str
    files: list[str]


builder_topic = "builder"
delegator_topic = "delegator"
