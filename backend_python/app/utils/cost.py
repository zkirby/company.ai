from utils.models import SUPPORTED_MODELS

def calculate_cost(input_tokens, output_tokens, model):
    model_info = SUPPORTED_MODELS[model]
    input_cost = (input_tokens * model_info["price"]["input"]) / model_info["price"]["divisor"]
    output_cost = (output_tokens * model_info["price"]["output"]) / model_info["price"]["divisor"]

    return input_cost + output_cost

