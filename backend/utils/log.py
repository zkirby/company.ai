import logging

from autogen_core import TRACE_LOGGER_NAME


logger = logging.getLogger(TRACE_LOGGER_NAME)

DELIM = "[$]"


def log(source=str, content=str, contentType=str):
    # Format content for better readability
    formatted_content = format_content(content)
    logger.info(f"{source}{DELIM}{formatted_content}")


def format_content(content):
    """
    Formats the log content for better readability and ensures it wraps properly.
    Converts long content into multiple lines if it's too lengthy.
    """
    # Set a character limit for each line
    line_length = 80  # Example line length for wrapping logs
    lines = []
    while len(content) > line_length:
        # Split the content into manageable lines
        lines.append(content[:line_length])
        content = content[line_length:]
    lines.append(content)  # Add the remaining content
    return "\n".join(lines)  # Join lines with newline characters
