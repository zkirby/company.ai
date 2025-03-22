import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineModels } from '../models/index.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.development') });

// Create Sequelize instance
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});

// Initialize database connection and models
export async function initDB() {
  try {
    // Define models
    defineModels();

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models with database (development only)
    await sequelize.sync();
    console.log('Database synchronized.');

    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}