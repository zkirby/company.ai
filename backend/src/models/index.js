import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

// Model definitions
export let Project;
export let Agent;

export function defineModels() {
  // Project model
  Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'projects',
    timestamps: false
  });

  // Agent model
  Agent = sequelize.define('Agent', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      },
      field: 'project_id'
    },
    cost: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    model: {
      type: DataTypes.STRING,
      defaultValue: 'NO MODEL'
    },
    inputTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'input_tokens'
    },
    outputTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'output_tokens'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'agents',
    timestamps: false
  });

  // Define relationships
  Project.hasMany(Agent, { foreignKey: 'projectId', as: 'agents' });
  Agent.belongsTo(Project, { foreignKey: 'projectId' });

  return { Project, Agent };
}