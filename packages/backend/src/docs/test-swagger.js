// Simple test to verify Swagger integration
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('../dist/config/swagger');

const app = express();

// Test Swagger setup
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Swagger test successful',
    swaggerSpec: {
      title: swaggerSpec.info.title,
      version: swaggerSpec.info.version,
      pathsCount: Object.keys(swaggerSpec.paths || {}).length,
      schemasCount: Object.keys(swaggerSpec.components?.schemas || {}).length
    }
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Swagger docs available at: http://localhost:${PORT}/api/docs`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
});

module.exports = app;