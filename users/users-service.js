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
const GestorDBUSERS = require('./gestorDBUSER');

const userModel = require('./user-model').default.default;
const gestor = new GestorDBUSERS();

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
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });
  try {
    const result = await gestor.addUser(username, username, password);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.status(201).json({ message: result.message, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });
  try {
    const result = await gestor.login(username, password);
    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }
    res.json({ message: result.message, user: result.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User stats endpoint
app.get('/stats/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({ success: false, message: 'El nombre de usuario es obligatorio' });
  }

  try {
    const result = await gestor.getUserStats(username); 

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`);
  });
}

module.exports = app;
