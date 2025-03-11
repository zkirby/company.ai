import logging
from enum import Enum
from autogen_core import TRACE_LOGGER_NAME


logger = logging.getLogger(TRACE_LOGGER_NAME)

DELIM = "[$]"

class UserTopics(Enum):
    CONVERSATION = "conversation"
    TASK = "task"


class ContentType(Enum):
    INTERACT = "interact"
    MESSAGE = "message" 
    MESSAGE_STREAM = "message_stream"
    SYSTEM = "system"
    CREATE = "create"
    INFO = "info"

def log(source=str, content=str, contentType: ContentType = ContentType.MESSAGE):
    logger.info(f"{source}{DELIM}{contentType.value}{DELIM}{content}")

