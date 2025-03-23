import { Sequelize, Options } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineModels } from '../models/index.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.development') });

// Define database configuration
const sequelizeOptions: Options = {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
};

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create Sequelize instance
export const sequelize = new Sequelize(databaseUrl, sequelizeOptions);

// Initialize database connection and models
export async function initDB(): Promise<boolean> {
  try {
    // Define models
    defineModels();

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models with database (development only)
    await sequelize.sync({ alter: true });
    console.log('Database synchronized with model changes.');

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unable to connect to the database:', errorMessage);
    throw error;
  }
}
