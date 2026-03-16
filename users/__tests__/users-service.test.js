import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import app from '../users-service.js'

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
    })
})
