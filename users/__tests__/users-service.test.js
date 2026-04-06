import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
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
            expect(res.body.error).toMatch(/El usuario 'Pablo' ya existe./i)
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
                expect(res.body.error).toMatch(/El usuario 'PabloASW' no existe./i)
        }); 
    })
