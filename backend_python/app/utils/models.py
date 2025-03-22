import os
from autogen_core.models import ModelInfo
from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv

load_dotenv(".env.development")

# constants
OPEN_API_KEY = os.getenv("OPENAPI_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_MODEL = "gpt-4o-mini"


# Supported models 
SUPPORTED_MODELS = {
    "gpt-4o-mini": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="gpt-4o-mini",
            api_key=OPEN_API_KEY,
            response_format=response_format,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 0.15,
            "output": 0.6,
        },
        "context_window": 128000
    },
    "gpt-4o": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="gpt-4o",
            api_key=OPEN_API_KEY,
            response_format=response_format,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 2.25,
            "output": 10,
        },
        "context_window": 128000
    },
    "llama3.2": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="llama3.2",
            api_key="none",
            base_url="http://localhost:11434/v1",
            model_info=ModelInfo(vision=False, function_calling=False, json_output=False, family="unknown"),
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 0,
            "output": 0,
        },
        "context_window": 4096
    },
    "gemini-2.0": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="gemini-2.0",
            api_key=GEMINI_API_KEY,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 0.1,
            "output": 0.4,
        },
        "context_window": 32768
    },
    "gemini-2.0-flash": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="gemini-2.0-flash",
            api_key=GEMINI_API_KEY,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 0.075,
            "output": 0.3,
        },
        "context_window": 32768
    },
    "claude-3-7-sonnet-20250219": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="claude-3-7-sonnet-20250219",
            api_key=ANTHROPIC_API_KEY,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 3,
            "output": 15,
        },
        "context_window": 200000
    },
    "claude-3-5-haiku-20241022": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="claude-3-5-haiku-20241022",
            api_key=ANTHROPIC_API_KEY,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 0.8,
            "output": 4,
        },
        "context_window": 200000
    },
    "claude-3-opus-20240229": {
        "get_model": lambda response_format: OpenAIChatCompletionClient(
            model="claude-3-opus-20240229",
            api_key=ANTHROPIC_API_KEY,
            base_url=None,
            model_info=None,
        ),
        "price": {
            "divisor": 1_000_000,
            "input": 15,
            "output": 75,
        },
        "context_window": 200000
    }
}
