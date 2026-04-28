import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import app from '../users-service.js'

const cleanupUsers = async (...usernames) =>
{
    const uniqueUsernames = [...new Set(usernames.filter(Boolean))]

    if (uniqueUsernames.length === 0)
    {
        return
    }

    try
    {
        const { connectToDatabase } = require('../userDB.js')
        const db = await connectToDatabase()

        const usersDocs = await db.collection('usuarios').find({ nombreUsuario: { $in: usernames } }).toArray()
        const userIds = usersDocs.map(user => user._id)

        if (userIds.length > 0) {
            await db.collection('partidas').deleteMany({ jugador: { $in: userIds } })
        }

        for (const username of uniqueUsernames)
        {
            try { await db.collection('usuarios').deleteMany({ nombreUsuario: username }) } catch(e) {}
            try { await db.collection('users').deleteMany({ username }) } catch(e) {}
        }
    }
    catch (err)
    {
        // ignore cleanup errors
    }
}

describe('POST /createuser', () =>
{
    // cleanup created user(s) to keep DB clean
    afterEach(async () =>
    {
        vi.restoreAllMocks()

        try
        {
            const { connectToDatabase } = require('../userDB.js')
            const db = await connectToDatabase()

            try { await db.collection('usuarios').deleteMany({ nombreUsuario: 'Pablo' }) } catch(e) {}
            try { await db.collection('users').deleteMany({ username: 'Pablo' }) } catch(e) {}
        }
        catch (err)
        {
            // ignore cleanup errors
        }
    })

    /**
     * Crear un usuario nuevo.
     * Se recibe un mensaje de éxito con el código 201.
     */
    it('returns a greeting message for the provided username', async () =>
    {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo', password: 'passtest123'})
            .set('Accept', 'application/json')

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Usuario creado con éxito./i)
    }); 

    /**
     * Intenta crear un usuario nuevo sin el username.
     * Se recibe un mensaje de error con el código 400.
     */
    it('returns a error message saying that the username is required', async () =>
        {
            const res = await request(app)
                .post('/createuser')
                .send({password: 'passtest123'})
                .set('Accept', 'application/json')
    
            expect(res.status).toBe(400)
            expect(res.body).toHaveProperty('error')
            expect(res.body.error).toMatch(/username is required/i)
    }); 

    /**
     * Intenta crear un usuario nuevo sin la password.
     * Se recibe un mensaje de error con el código 400.
     */
    it('returns a error message saying that the password is required', async () =>
        {
            const res = await request(app)
                .post('/createuser')
                .send({username: 'Pablo'})
                .set('Accept', 'application/json')
    
            expect(res.status).toBe(400)
            expect(res.body).toHaveProperty('error')
            expect(res.body.error).toMatch(/password is required/i)
    }); 

    /**
     * Intenta crear un usuario ya existente.
     * Se recibe un mensaje de error con el código 400.
     */
    it('returns a error message saying that the password is required', async () =>
        {
            let res = await request(app)
                .post('/createuser')
                .send({ username: 'Pablo', password: 'passtest123'})
                .set('Accept', 'application/json')

            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('message')
            expect(res.body.message).toMatch(/Usuario creado con éxito./i)
    
            res = await request(app)
                .post('/createuser')
                .send({ username: 'Pablo', password: 'passtest123'})
                .set('Accept', 'application/json')

            expect(res.status).toBe(400)
            expect(res.body).toHaveProperty('error')
            expect(res.body.error).toMatch(/ya existe/i)
    });
})

describe('POST /login', () =>
    {
        beforeEach(async () =>
        {
            await request(app)
                .post('/createuser')
                .send({ username: 'Pablo', password: 'passtest123'})
                .set('Accept', 'application/json')
        })

        // cleanup created user(s) to keep DB clean
        afterEach(async () =>
        {
            vi.restoreAllMocks()
    
            try
            {
                const { connectToDatabase } = require('../userDB.js')
                const db = await connectToDatabase()
    
                try { await db.collection('usuarios').deleteMany({ nombreUsuario: 'Pablo' }) } catch(e) {}
                try { await db.collection('users').deleteMany({ username: 'Pablo' }) } catch(e) {}
            }
            catch (err)
            {
                // ignore cleanup errors
            }
        })
    
        /**
         * Se hace login con un usuario existente.
         * Se recibe un mensaje de éxito con el código 200.
         */
        it('returns an approval message ', async () =>
        {
            const res = await request(app)
                .post('/login')
                .send({ username: 'Pablo', password: 'passtest123'})
                .set('Accept', 'application/json')
    
            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('message')
            expect(res.body.message).toMatch(/Login correcto./i)
        }); 
    
        /**
         * Intenta hacer login sin el username.
         * Se recibe un mensaje de error con el código 400.
         */
        it('returns a error message saying that the username is required', async () =>
            {
                const res = await request(app)
                    .post('/login')
                    .send({password: 'passtest123'})
                    .set('Accept', 'application/json')
        
                expect(res.status).toBe(400)
                expect(res.body).toHaveProperty('error')
                expect(res.body.error).toMatch(/username is required/i)
        });
    
        /**
         * Intenta hacer login sin la password.
         * Se recibe un mensaje de error con el código 400.
         */
        it('returns a error message saying that the password is required', async () =>
            {
                const res = await request(app)
                    .post('/login')
                    .send({username: 'Pablo'})
                    .set('Accept', 'application/json')
        
                expect(res.status).toBe(400)
                expect(res.body).toHaveProperty('error')
                expect(res.body.error).toMatch(/password is required/i)
        });
    
        /**
         * Intenta hacer login y el usuario no existe.
         * Se recibe un mensaje de error con el código 401.
         */
        it('returns a error message saying that the password is required', async () =>
            {
                const res = await request(app)
                    .post('/login')
                    .send({ username: 'PabloASW', password: 'passtest123'})
                    .set('Accept', 'application/json')
        
                expect(res.status).toBe(401)
                expect(res.body).toHaveProperty('error')
                expect(res.body.error).toMatch(/no existe|inválidas/i)
        });
    })

describe('GET /stats/:username', () =>
    {
        beforeEach(async () =>
        {
            await request(app)
                .post('/createuser')
                .send({ username: 'Pablo', password: 'passtest123'})
                .set('Accept', 'application/json')
        })

        // cleanup created user(s) to keep DB clean
        afterEach(async () =>
        {
            vi.restoreAllMocks()

            try
            {
                const { connectToDatabase } = require('../userDB.js')
                const db = await connectToDatabase()

                try { await db.collection('usuarios').deleteMany({ nombreUsuario: 'Pablo' }) } catch(e) {}
                try { await db.collection('users').deleteMany({ username: 'Pablo' }) } catch(e) {}
            }
            catch (err)
            {
                // ignore cleanup errors
            }
        })

        /**
         * Recupera las estadísticas de un usuario existente.
         * Se recibe un mensaje de éxito con el código 200.
         */
        it('returns user stats for an existing user', async () =>
        {
            const res = await request(app)
                .get('/stats/Pablo')
                .set('Accept', 'application/json')

            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('success', true)
            expect(res.body).toHaveProperty('message')
            expect(res.body).toHaveProperty('estadisticas')
            expect(res.body.estadisticas).toHaveProperty('partidasJugadas')
            expect(res.body.estadisticas).toHaveProperty('victorias')
            expect(res.body.estadisticas).toHaveProperty('derrotas')
            expect(res.body.estadisticas).toHaveProperty('empates')
            expect(res.body.estadisticas).toHaveProperty('puntosRanking')
        });

        /**
         * Intenta recuperar estadísticas de un usuario no existente.
         * Se recibe un mensaje de error con el código 404.
         */
        it('returns an error message when user does not exist', async () =>
        {
            const res = await request(app)
                .get('/stats/PabloASW')
                .set('Accept', 'application/json')

            expect(res.status).toBe(404)
            expect(res.body).toHaveProperty('success', false)
            expect(res.body).toHaveProperty('message')
            expect(res.body.message).toMatch(/no existe|no encontrado/i)
        });
    })

describe('GET /api/users', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1', 'ApiUserTest2')
    })

    /**
     * Añade 2 usuarios nuevos y recupera la lista de usuarios con un límite de 1.
     * Se recibe una lista con un solo usuario y el código 200.
     */
    it('returns a list of users', async () =>
    {
        await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest2', password: 'passtest123' })
            .set('Accept', 'application/json')

        const res = await request(app)
            .get('/api/users?limit=1')
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
    })
})

describe('GET /health', () =>
{
    /**
     * Se hace una petición para comprobar la salud del servicio.
     * Se recibe un mensaje de éxito con el código 200.
     */
    it('returns service health', async () =>
    {
        const res = await request(app)
            .get('/health')
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toEqual({ status: 'ok' })
    })
})

describe('GET /ready', () =>
{
    /**
     * Se hace una petición para comprobar la disponibilidad del servicio.
     * Se recibe un mensaje de éxito con el código 200.
     */
    it('returns service readiness', async () =>
    {
        const res = await request(app)
            .get('/ready')
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toEqual({ ready: true })
    })
})

describe('OPTIONS /api/users', () =>
{
    /**
     * Se hace una petición OPTIONS para comprobar el manejo de preflight requests.
     * Se recibe un código 204 sin contenido.
     */
    it('returns 204 for preflight requests', async () =>
    {
        const res = await request(app)
            .options('/api/users')
            .set('Origin', 'http://localhost:5173')
            .set('Access-Control-Request-Method', 'GET')

        expect(res.status).toBe(204)
    })
})

describe('POST /api/users', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    /**
     * Se intenta crear un usuario sin el username.
     * Se recibe un mensaje de error con el código 400.
     */
    it('returns 400 when username is missing', async () =>
    {
        const res = await request(app)
            .post('/api/users')
            .send({ password: 'passtest123' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error')
        expect(res.body.error).toMatch(/username is required/i)
    })

    /**
     * Se intenta crear un usuario sin el password.
     * Se recibe un mensaje de error con el código 400.
     */
    it('returns 400 when password is missing', async () =>
    {
        const res = await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest1' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error')
        expect(res.body.error).toMatch(/password is required/i)
    })

    /**
     * Se crea un usuario nuevo con username y password.
     * Se recibe el usuario creado con el código 201.
     */
    it('creates a user successfully', async () =>
    {
        const res = await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('_id')
        expect(res.body).toHaveProperty('username', 'ApiUserTest1')
    })
})

describe('GET /api/users/:id', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    /**
     * Se añade un usuario nuevo y se recupera por su ID.
     * Se recibe el usuario creado con el código 200.
     */
    it('returns a user by id', async () =>
    {
        const createRes = await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        expect(createRes.status).toBe(201)

        const res = await request(app)
            .get(`/api/users/${createRes.body._id}`)
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('_id', createRes.body._id)
        expect(res.body).toHaveProperty('username', 'ApiUserTest1')
    })

    /**
     * Se intenta recuperar un usuario con un ID que no existe.
     * Se recibe un mensaje de error con el código 404.
     */
    it('returns 404 for an unknown id', async () =>
    {
        const res = await request(app)
            .get('/api/users/000000000000000000000000')
            .set('Accept', 'application/json')

        expect(res.status).toBe(404)
        expect(res.body).toHaveProperty('error', 'not found')
    })
})

describe('DELETE /api/users/:id', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    /**
     * Se añade un usuario nuevo y se borra por su ID.
     * Se recibe un código 204 sin contenido.
     */
    it('deletes an existing user', async () =>
    {
        const createRes = await request(app)
            .post('/api/users')
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        expect(createRes.status).toBe(201)

        const deleteRes = await request(app)
            .delete(`/api/users/${createRes.body._id}`)
            .set('Accept', 'application/json')

        expect(deleteRes.status).toBe(204)
    })

    /**
     * Se intenta borrar un usuario con un ID que no existe.
     * Se recibe un mensaje de error con el código 404.
     */
    it('returns 404 for an unknown id', async () =>
    {
        const res = await request(app)
            .delete('/api/users/000000000000000000000000')
            .set('Accept', 'application/json')

        expect(res.status).toBe(404)
        expect(res.body).toHaveProperty('error', 'not found')
    })
})

describe('GET /api/ranking', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1', 'ApiUserTest2')
    })

    it('returns 200 and a list of the rankig', async () =>
    {
        await request(app)
            .post('/createuser')
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        await request(app)
            .post('/createuser') 
            .send({ username: 'ApiUserTest2', password: 'passtest123' })
            .set('Accept', 'application/json')

        const ranking = await request(app)
            .get(`/api/ranking`)
            .set('Accept', 'application/json')

        expect(ranking.status).toBe(200)
        expect(ranking.body).toHaveProperty('gold') 
        expect(ranking.body).toHaveProperty('silver');
        expect(ranking.body).toHaveProperty('bronze');
        expect(ranking.body).toHaveProperty('rest');
        expect(Array.isArray(ranking.body.rest)).toBe(true);
    })
})

describe('POST /api/matches/update', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    it('returns 200 and updates user stats', async () =>
    {
        await request(app)
            .post('/createuser') 
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        const initialStats = await request(app)
            .get('/stats/ApiUserTest1')
            .set('Accept', 'application/json')

        const updateRes = await request(app)
            .post(`/api/matches/update`)
            .send({ 
                username: 'ApiUserTest1',
                puntos: 10,
                modo: 'local'
                })
            .set('Accept', 'application/json')

        const finalStats = await request(app)
            .get('/stats/ApiUserTest1')
            .set('Accept', 'application/json')

        expect(finalStats.status).toBe(200)
        expect(finalStats.body.estadisticas.partidasJugadas).toBe(1)
        expect(finalStats.body.estadisticas.puntosRanking).toBe(110)
    })
})

describe('GET /games/user/:username', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    it('returns 200 and a list of user games', async () =>
    {
        await request(app)
            .post('/createuser') 
            .send({ username: 'ApiUserTest1', password: 'passtest123' })
            .set('Accept', 'application/json')

        const gamesRes = await request(app)
            .get(`/games/user/ApiUserTest1`)
            .set('Accept', 'application/json')

        
        expect(gamesRes.status).toBe(200)
        expect(gamesRes.body.games).toBeInstanceOf(Array)
    })

    it('returns 400 for an unknown username', async () =>
    {
        const gamesRes = await request(app)
            .get(`/games/user/UnknownUsername`)
            .set('Accept', 'application/json')

        expect(gamesRes.status).toBe(404)
        expect(gamesRes.body.message).toMatch(/no existe|no encontrado/i)
        expect(gamesRes.body).toHaveProperty('success', false)
    })
})

/*
describe('GET /play', () =>
{
    afterEach(async () =>
    {
        vi.restoreAllMocks()
        await cleanupUsers('ApiUserTest1')
    })

    it('returns 200 and the coords of the bot moves', async () =>
    {
        const res = await request(app)
            .get(`/play`)
            .query({
                position: JSON.stringify({
                    size: 3,
                    turn: 0,
                    players: ['B', 'R'],
                    layout: './B./...'
                }),
                bot_id: 'random_bot'
            })
            .set('Accept', 'application/json')

        
        expect(res.body).toHaveProperty('coords')
        expect(res.body.coords).toHaveProperty('x')
        expect(res.body.coords).toHaveProperty('y')
        expect(res.body.coords).toHaveProperty('z')
        expect(res.status).toBe(200)
        
    })

    it('returns 200 and the coords of the bot moves, whithout bot_id ', async () =>
    {
        const res = await request(app)
            .get(`/play`)
            .query({
                position: JSON.stringify({
                    size: 3,
                    turn: 0,
                    players: ['B', 'R'],
                    layout: './B./...'
                })                
            })
            .set('Accept', 'application/json')

        
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('coords')
        expect(res.body.coords).toHaveProperty('x')
        expect(res.body.coords).toHaveProperty('y')
        expect(res.body.coords).toHaveProperty('z')
    })

    it('returns 400 for an unknown position', async () =>
    {
        const res = await request(app)
            .get(`/play`)
            .query({
                bot_id: 'random_bot'
            })
            .set('Accept', 'application/json')

        
        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error')
        expect(res.body.error).toMatch(/position is required/i)
    })
})
 */