import logging
from enum import Enum
from autogen_core import TRACE_LOGGER_NAME


logger = logging.getLogger(TRACE_LOGGER_NAME)

DELIM = "[$]"


class ContentType(Enum):
    INTERACT = "interact"
    MESSAGE = "message" 
    SYSTEM = "system"

def log(source=str, content=str, contentType: ContentType = ContentType.MESSAGE):
    logger.info(f"{source}{DELIM}{contentType.value}{DELIM}{content}")

