const express = require('express');
const fs = require('fs');
const path = require('path');
const { createRateLimiter } = require('./middlewares/rateLimiter');
const { checkCache } = require('./middlewares/cache');
const { createProxy } = require('./middlewares/proxy');
const { isUsingMock } = require('./utils/redisClient');
const { validateConfig } = require('./utils/configValidator');

const app = express();
const crypto = require('crypto');

// Correlation ID middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});

// Enable CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Create logs directory if not exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// File logging middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> HTTP ${res.statusCode}\n`;
    fs.appendFile(path.join(logDir, 'access.log'), logLine, (err) => {
      if (err) console.error('[File Logger] Error writing access log:', err);
    });
  });
  next();
});

// Load Gateway configuration
const configPath = path.join(__dirname, '../config/gateway.json');
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  validateConfig(config);
} catch (err) {
  console.error('❌ Failed to load gateway.json configuration:', err);
  process.exit(1);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Gateway] ${req.method} ${req.originalUrl} -> HTTP ${res.statusCode} (${duration}ms) [Cache: ${res.getHeader('X-Cache') || 'N/A'}]`);
  });
  next();
});

// Setup health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    redisMockActive: isUsingMock()
  });
});

console.log('🛡️  Sentinel API Gateway Initializing...');

// Register microservices dynamically based on configuration
Object.entries(config.services).forEach(([serviceName, serviceConfig]) => {
  const { prefix, rateLimit, cache, target } = serviceConfig;
  
  console.log(`\nConfiguring Route: [${serviceName}]`);
  console.log(`  Path Prefix:  ${prefix}`);
  console.log(`  Target Host:  ${target}`);
  
  const pipeline = [];

  // 1. Rate Limiting Middleware
  if (rateLimit) {
    console.log(`  Rate Limiter: Enabled (${rateLimit.limit} req / ${rateLimit.windowMs / 1000}s)`);
    pipeline.push(createRateLimiter(serviceName, rateLimit));
  } else {
    console.log('  Rate Limiter: Disabled');
  }

  // 2. Caching Middleware
  if (cache) {
    console.log(`  Cache Store:  Enabled (TTL: ${cache.ttlSec}s)`);
    pipeline.push(checkCache(serviceName, cache));
  } else {
    console.log('  Cache Store:  Disabled');
  }

  // 3. Reverse Proxy Forwarding Middleware
  console.log(`  Routing proxy bound: ${prefix} -> ${target}`);
  pipeline.push(createProxy(serviceName, serviceConfig));

  // Mount the middleware pipeline on the configured prefix path
  app.use(prefix, ...pipeline);
});

// Global 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested path '${req.path}' is not mapped to any downstream microservices on this API Gateway.`
  });
});

const PORT = config.port || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Sentinel API Gateway running on http://localhost:${PORT}`);
  console.log('--------------------------------------------------');
});
