const mongoose = require('mongoose');
const PDF = require('../models/PDF');
const User = require('../models/User');
const Highlight = require('../models/Highlight');

class HealthController {
  // Basic health check
  async health(req, res, next) {
    try {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      next(error);
    }
  }

  // Detailed health check
  async detailed(req, res, next) {
    try {
      const checks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkDiskSpace(),
        this.checkMemory()
      ]);

      const [database, diskSpace, memory] = checks;

      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: {
            status: database.status === 'fulfilled' ? 'OK' : 'ERROR',
            details: database.status === 'fulfilled' ? database.value : database.reason.message
          },
          diskSpace: {
            status: diskSpace.status === 'fulfilled' ? 'OK' : 'ERROR',
            details: diskSpace.status === 'fulfilled' ? diskSpace.value : diskSpace.reason.message
          },
          memory: {
            status: memory.status === 'fulfilled' ? 'OK' : 'ERROR',
            details: memory.status === 'fulfilled' ? memory.value : memory.reason.message
          }
        }
      };

      // Set overall status based on checks
      const hasErrors = Object.values(health.checks).some(check => check.status === 'ERROR');
      if (hasErrors) {
        health.status = 'ERROR';
        return res.status(500).json(health);
      }

      res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  }

  async checkDatabase() {
    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      // Test database operations
      const [userCount, pdfCount, highlightCount] = await Promise.all([
        User.countDocuments(),
        PDF.countDocuments(),
        Highlight.countDocuments()
      ]);

      return {
        connected: true,
        collections: {
          users: userCount,
          pdfs: pdfCount,
          highlights: highlightCount
        }
      };
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  async checkDiskSpace() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(process.cwd());
      
      return {
        available: true,
        path: process.cwd()
      };
    } catch (error) {
      throw new Error(`Disk space check failed: ${error.message}`);
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usedMemMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const usage = Math.round((usedMemMB / totalMemMB) * 100);

      return {
        total: `${totalMemMB}MB`,
        used: `${usedMemMB}MB`,
        usage: `${usage}%`,
        healthy: usage < 90
      };
    } catch (error) {
      throw new Error(`Memory check failed: ${error.message}`);
    }
  }
}

module.exports = new HealthController();