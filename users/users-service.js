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

const {
  addUser,
  listUsers,
  getUserById,
  deleteUser,
} = require('./user-service.js');

const userService = {
  addUser,
  listUsers,
  getUserById,
  deleteUser,
};
const gestor = new GestorDBUSERS();

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.error('Swagger load error:', e);
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
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : null;

  const password = req.body?.password;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'username is required'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'password is required'
    });
  }

  try {
    const user = await userService.addUser(username, username, password);
    return res.status(201).json(user);
  } catch (err)
    {
      console.error('addUser error:', err);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.listUsers(Number(req.query.limit) || 100);
    res.json(users);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'not found'
      });
    }

    res.json(user);
  } catch (err) {
    console.error('getUserById error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'not found'
      });
    }

    res.status(204).end();
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get('/api/ranking', async (req,res) =>
{
  try {
    const result = await gestor.globalRanking();

    if (!result.success) {
      return res.status(400).json(result);
    }

    const ranking = result.ranking ?? result.data ?? [];

    if (!Array.isArray(ranking)) {
      return res.status(500).json({
        success: false,
        message: 'Invalid ranking format'
      });
    }

    res.json({
      gold: ranking[0] || null,
      silver: ranking[1] || null,
      bronze: ranking[2] || null,
      rest: ranking.slice(3)
    });

  } catch (err) {
    console.error('ranking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user stats + register match result
app.post('/api/matches/update', async (req, res) => {
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : null;

  const puntos = req.body?.puntos;

  const allowedModes = ['local', 'bot'];
  const modo = allowedModes.includes(req.body?.modo)
    ? req.body.modo
    : 'local';

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'username is required'
    });
  }

  if (typeof puntos !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'puntos must be a number'
    });
  }

  try {
    const statsResult = await gestor.updateUserStats(username, puntos);

    if (!statsResult.success) {
      return res.status(400).json(statsResult);
    }

    const matchResult = await gestor.addUserMatch(username, puntos, modo);

    if (!matchResult.success) {
      return res.status(400).json(matchResult);
    }

    res.json({
      success: true,
      message: 'Match updated successfully',
      nuevosPuntos: statsResult.nuevosPuntos
    });

  } catch (err) {
    console.error('match update error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating match'
    });
  }
});

// backward compatibility
app.post('/createuser', async (req, res) =>
{
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : null;

  const password = req.body?.password;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'username is required'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'password is required'
    });
  }

  try {
    const result = await gestor.addUser(username, username, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: result.message,
      id: result.id
    });

  } catch (err) {
    console.error('createuser error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : null;

  const password = req.body?.password;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'invalid credentials'
    });
  }

  try {
    const result = await gestor.login(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message,
      user: result.user
    });

  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get('/stats/:username', async (req, res) => {
  const username = typeof req.params.username === 'string'
    ? req.params.username.trim()
    : null;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'invalid username'
    });
  }

  try {
    const result = await gestor.getUserStats(username);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    res.json(result);

  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// User games history endpoint
app.get('/games/user/:username', async (req, res) => {
  const username = typeof req.params.username === 'string'
    ? req.params.username.trim()
    : null;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'invalid username'
    });
  }

  try {
    const result = await gestor.getUserGames(username);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    res.json(result);

  } catch (err) {
    console.error('games error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Endpoint para que juegue un bot contra la aplicacion
app.get('/play', async (req, res) => {
  const { position, bot_id } = req.query;

  if (!position) {
    return res.status(400).json({ error: 'position is required' });
  }

  try {
    const apiVersion = 'v1';
    const selectedBotId =
    typeof bot_id === 'string' && /^[a-zA-Z0-9_-]+$/.test(bot_id.trim())
      ? bot_id.trim()
      : 'random_bot';

    const gameyUrl =
      `http://localhost:4000/${apiVersion}/ybot/choose/${selectedBotId}`;

    if (typeof position !== 'string') {
      return res.status(400).json({
        error: 'position must be a string'
      });
    }

    const body = position;

    const response = await fetch(gameyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      return res.status(response.status).json({
        error: 'Gamey engine error',
        details: errorData
      });
    }

    const result = await response.json();
    res.json({ coords: result.coords });

  } catch (err) {
    console.error('play error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
