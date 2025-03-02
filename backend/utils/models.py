# keys
OPEN_API_KEY = os.getenv("OPENAPI_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

class Model:
    def __init__(self, model: str, api_key: str, base_url: str, model_info: ModelInfo):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.model_info = model_info

# Supported models 
SUPPORTED_MODELS = {
    "gpt-4o-mini": {
        "config": Model("gpt-4o-mini", OPEN_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 0.15,
            "output": 0.6,
        },
        "context_window": 128000
    },
    "gpt-4o": {
        "config": Model("gpt-4o", OPEN_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 2.25,
            "output": 10,
        },
        "context_window": 128000
    },
    "llama3.2": {
        "config": Model("llama3.2", "none", "http://localhost:11434/v1", ModelInfo(vision=False, function_calling=False, json_output=False, family="unknown")),
        "price": {
            "divisor": 1_000_000,
            "input": 0,
            "output": 0,
        },
        "context_window": 4096
    },
    "gemini-2.0": {
        "config": Model("gemini-2", GEMINI_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 0.1,
            "output": 0.4,
        },
        "context_window": 32768
    },
    "gemini-2.0-flash": {
        "config": Model("gemini-2.0-flash", GEMINI_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 0.075,
            "output": 0.3,
        },
        "context_window": 32768
    },
    "claude-3-7-sonnet-20250219": {
        "config": Model("claude-3-7-sonnet-20250219", ANTHROPIC_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 3,
            "output": 15,
        },
        "context_window": 200000
    },
    "claude-3-5-haiku-20241022": {
        "config": Model("claude-3-5-haiku-20241022", ANTHROPIC_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 0.8,
            "output": 4,
        },
        "context_window": 200000
    },
    "claude-3-opus-20240229": {
        "config": Model("claude-3-opus-20240229", ANTHROPIC_API_KEY, None, None),
        "price": {
            "divisor": 1_000_000,
            "input": 15,
            "output": 75,
        },
        "context_window": 200000
    }
}
