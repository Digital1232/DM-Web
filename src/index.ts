/**
 * AI Awards for Creativity Recognition System
 * Main Entry Point
 *
 * This module initializes the application server, connects to databases,
 * and starts all scheduled services.
 */

import dotenv from 'dotenv';
import express from 'express';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const logger = new Logger('Main');
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'AI Awards for Creativity Recognition System',
    version: '1.0.0',
    status: 'running',
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
