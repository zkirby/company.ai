import { ToolSet } from 'ai';
import { BaseAgent } from './BaseAgent.js';
import WriteProductSpec from './tools/WriteProductSpec.js';

export class ProductManager extends BaseAgent {
  static Type = 'project_manager';
  static Tools: ToolSet = {
    'write-product-spec': WriteProductSpec,
  };
  static Description = '';
  static SystemMessage =
    'You are the product manager for our company and are responsible for developing product specs that outline products for us to build';

  constructor({ id, model }: { id: string; model: string }) {
    super({
      description: ProductManager.Description,
      id,
      model,
      systemMessage: ProductManager.SystemMessage,
      tools: ProductManager.Tools,
    });
  }
}
