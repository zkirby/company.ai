import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../db/index.js';

// Define Project model
export interface ProjectAttributes
  extends Model<InferAttributes<ProjectAttributes>, InferCreationAttributes<ProjectAttributes>> {
  id: CreationOptional<number>;
  name: string;
  createdAt: CreationOptional<Date>;
  agents?: NonAttribute<AgentAttributes[]>;
}

export class Project
  extends Model<InferAttributes<ProjectAttributes>, InferCreationAttributes<ProjectAttributes>>
  implements ProjectAttributes
{
  declare id: CreationOptional<number>;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
  declare agents?: NonAttribute<AgentAttributes[]>;
}

// Define Agent model
export interface AgentAttributes
  extends Model<InferAttributes<AgentAttributes>, InferCreationAttributes<AgentAttributes>> {
  id: string;
  projectId: ForeignKey<Project['id']>;
  agentType: CreationOptional<string>;
  cost: CreationOptional<number>;
  model: CreationOptional<string>;
  firstName: CreationOptional<string>;
  lastName: CreationOptional<string>;
  inputTokens: CreationOptional<number>;
  outputTokens: CreationOptional<number>;
  createdAt: CreationOptional<Date>;
  project?: NonAttribute<ProjectAttributes>;
}

export class Agent
  extends Model<InferAttributes<AgentAttributes>, InferCreationAttributes<AgentAttributes>>
  implements AgentAttributes
{
  declare id: string;
  declare projectId: ForeignKey<Project['id']>;
  declare cost: CreationOptional<number>;
  declare model: CreationOptional<string>;
  declare firstName: CreationOptional<string>;
  declare lastName: CreationOptional<string>;
  declare agentType: CreationOptional<string>;
  declare inputTokens: CreationOptional<number>;
  declare outputTokens: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare project?: NonAttribute<ProjectAttributes>;
}

export function defineModels(): {
  Project: typeof Project;
  Agent: typeof Agent;
} {
  // Initialize Project model
  Project.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'projects',
      timestamps: false,
      sequelize,
    }
  );

  // Initialize Agent model
  Agent.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        field: 'project_id',
      },
      cost: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      model: {
        type: DataTypes.STRING,
        defaultValue: 'NO MODEL',
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'last_name',
      },
      agentType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'agent_type',
      },
      inputTokens: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'input_tokens',
      },
      outputTokens: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'output_tokens',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'agents',
      timestamps: false,
      sequelize,
    }
  );

  // Define relationships
  Project.hasMany(Agent, { foreignKey: 'projectId', as: 'agents' });
  Agent.belongsTo(Project, { foreignKey: 'projectId' });

  return { Project, Agent };
}
