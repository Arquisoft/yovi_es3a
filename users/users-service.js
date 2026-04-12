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
  const password = req.body && req.body.password;
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });

  try {
    const user = await userService.addUser(username, username, password);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.listUsers(req.query.limit || 100);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    if (!result) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ranking', async (req,res) =>
{
  try
  {
    const result = await gestor.globalRanking();

    if (!result.success)
      return res
        .status(400)
        .json(result);

    const ranking = result.data || [];

    const response =
    {
      gold : ranking[0] || null,
      silver : ranking[1] || null,
      bronze : ranking[2] || null,
      rest : ranking.slice(3)
    }
    res.json(response);
  }
  catch (err)
  {
    console.log(`Error al obtener ranking: ${err.message}`);
    res
      .status(500)
      .json({error : err.message});
  }
});

// Update user stats + register match result
app.post('/api/matches/update', async (req, res) => {
  const { username, puntos, modo } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: 'username is required' });
  }

  if (typeof puntos !== 'number') {
    return res.status(400).json({ success: false, message: 'puntos must be a number' });
  }

  try {
    // Update stats
    const statsResult = await gestor.updateUserStats(username, puntos);

    if (!statsResult.success) {
      return res.status(400).json(statsResult);
    }

    // Register match
    const matchResult = await gestor.addUserMatch(username, puntos, modo || "local");

    if (!matchResult.success) {
      return res.status(400).json(matchResult);
    }

    res.json({
      success: true,
      message: "Match updated successfully.",
      nuevosPuntos: statsResult.nuevosPuntos
    });

  } catch (err) {
    console.error("Error updating match:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error updating match."
    });
  }
});

// backward compatibility
app.post('/createuser', async (req, res) =>
{
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });
  
  try
  {
    const result = await gestor.addUser(username, username, password);
    
    if (!result.success)
    {
      return res.status(400).json({ error: result.message });
    }
    
    res.status(201).json({ message: result.message, id: result.id });
  }
  catch (err)
  {
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

// User games history endpoint
app.get('/games/user/:username', async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, message: 'El nombre de usuario es obligatorio' });
  }

  try {
    const result = await gestor.getUserGames(username);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Endpoint para que juegue un bot contra la aplicacion
app.get('/play', async (req, res) => {
  const { position, bot_id } = req.query;
  if (!position) return res.status(400).json({ error: 'position is required' });
  try {
    const apiVersion = 'v1';
    const selectedBotId = bot_id || 'random_bot';
    const gameyUrl = `http://gamey:4000/${apiVersion}/ybot/choose/${selectedBotId}`; // URL para aplicacion desplegada en Docker
    // const gameyUrl = `http://localhost:4000/${apiVersion}/ybot/choose/${selectedBotId}`; // URL para desarrollo local

    const yenBody = typeof position === 'string' ? position : JSON.stringify(position);
    const response = await fetch(gameyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: yenBody
    });

    if (!response.ok) {
      // Si Axum devuelve un ErrorResponse, intentamos leerlo
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        return res.status(response.status).json({ error: 'Gamey engine error', details: errorData });
      }
      throw new Error(`Gamey service error: ${response.statusText}`);
    }


    const result = await response.json();
    // result tendrá la forma: { coords: { x: 0, y: 1, z: 2 } }
    res.json({ coords: result.coords });

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
