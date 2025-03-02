def calculate_cost(usage, model):
    model_info = SUPPORTED_MODELS[model]
    input_cost = (usage.input_tokens * model_info["price"]["input"]) / model_info["price"]["divisor"]
    output_cost = (usage.output_tokens * model_info["price"]["output"]) / model_info["price"]["divisor"]

    return input_cost + output_cost

