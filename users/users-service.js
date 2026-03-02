/**
 * NOTE:
 *  The code below is deprectaded, replaced by an N-Layer pattern.
 *  See also user-service.js, user-model.js and user-controller.js.
 * 
 *  This file will be replaced once the refactoring is compete.
 */

const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const userModel = require('./user-model').default.default;

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Health endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

// RESTful users endpoints
app.post('/api/users', async (req, res) => {
  const username = req.body && req.body.username;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    const user = await userModel.addUser(username);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await userModel.listUsers(req.query.limit || 100);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const ok = await userModel.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// backward compatibility
app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const user = await userModel.addUser(username);
    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message, id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`);
  });
}

module.exports = app;
