import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'module'
import { create } from 'domain'

const require = createRequire(import.meta.url)
const GestorDBUSERS = require('../gestorDBUSER.js')
const { connectToDatabase } = require('../userDB.js')

const createdUsers = new Set()

const cleanupCreatedUsers = async () =>
{
    if (createdUsers.size === 0)
    {
        return
    }


    try
    {
        const db = await connectToDatabase()
        const usernames = [...createdUsers]

        const usersDocs = await db.collection('usuarios').find({ nombreUsuario: { $in: usernames } }).toArray()
        const userIds = usersDocs.map(user => user._id)

        if (userIds.length > 0) {
            await db.collection('partidas').deleteMany({ jugador: { $in: userIds } })
        }

        await db.collection('usuarios').deleteMany({ nombreUsuario: { $in: usernames } })
        await db.collection('users').deleteMany({ username: { $in: usernames } })
        
    }
    catch (err)
    {
        // ignore cleanup errors in tests
    }

    finally
    {
        createdUsers.clear()
    }
}

const makeUsername = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`

describe('GestorDBUSERS.verifyConnection', () =>
{
    /**
     * Verifica la conexión con la base de datos.
     * Se recibe true cuando la BD es accesible.
     */
    it('returns true when DB is reachable', async () =>
    {
        const gestor = new GestorDBUSERS()
        const result = await gestor.verifyConnection()

        expect(result).toBe(true)
    })
})

describe('GestorDBUSERS.updateUserStats', () =>
{
    let gestor

    beforeEach(() =>
    {
        gestor = new GestorDBUSERS()
    })

    afterEach(async () =>
    {
        await cleanupCreatedUsers()
    })

    /**
     * Intenta actualizar estadísticas de un usuario que no existe.
     * Se recibe un mensaje de error con success en false.
     */
    it('returns not found when user does not exist', async () =>
    {
        const result = await gestor.updateUserStats('user_that_does_not_exist', 10)

        expect(result.success).toBe(false)
        expect(result.message).toMatch(/no existe/i)
    })

    /**
     * Añade un usuario nuevo y actualiza sus estadísticas con puntos positivos.
     * Se registra una victoria y se incrementa el ranking.
     */
    it('updates victory stats with positive points', async () =>
    {
        const username = makeUsername('stats_win')
        createdUsers.add(username)

        const created = await gestor.addUser(username, username, 'passtest123')
        expect(created.success).toBe(true)

        const updated = await gestor.updateUserStats(username, 15)
        expect(updated.success).toBe(true)
        expect(updated.nuevosPuntos).toBe(115)

        const stats = await gestor.getUserStats(username)
        expect(stats.success).toBe(true)
        expect(stats.estadisticas.partidasJugadas).toBe(1)
        expect(stats.estadisticas.victorias).toBe(1)
        expect(stats.estadisticas.derrotas).toBe(0)
        expect(stats.estadisticas.empates).toBe(0)
        expect(stats.estadisticas.puntosRanking).toBe(115)
    })

    /**
     * Añade un usuario nuevo y actualiza sus estadísticas con puntos negativos.
     * Se registra una derrota y el ranking no baja de 0.
     */
    it('updates defeat stats and clamps points at zero', async () =>
    {
        const username = makeUsername('stats_lose')
        createdUsers.add(username)

        const created = await gestor.addUser(username, username, 'passtest123')
        expect(created.success).toBe(true)

        const updated = await gestor.updateUserStats(username, -200)
        expect(updated.success).toBe(true)
        expect(updated.nuevosPuntos).toBe(0)

        const stats = await gestor.getUserStats(username)
        expect(stats.success).toBe(true)
        expect(stats.estadisticas.partidasJugadas).toBe(1)
        expect(stats.estadisticas.victorias).toBe(0)
        expect(stats.estadisticas.derrotas).toBe(1)
        expect(stats.estadisticas.empates).toBe(0)
        expect(stats.estadisticas.puntosRanking).toBe(0)
    })

    /**
     * Añade un usuario nuevo y actualiza sus estadísticas con 0 puntos.
     * Se registra un empate y se mantiene el ranking.
     */
    it('updates draw stats when points are zero', async () =>
    {
        const username = makeUsername('stats_draw')
        createdUsers.add(username)

        const created = await gestor.addUser(username, username, 'passtest123')
        expect(created.success).toBe(true)

        const updated = await gestor.updateUserStats(username, 0)
        expect(updated.success).toBe(true)
        expect(updated.nuevosPuntos).toBe(100)

        const stats = await gestor.getUserStats(username)
        expect(stats.success).toBe(true)
        expect(stats.estadisticas.partidasJugadas).toBe(1)
        expect(stats.estadisticas.victorias).toBe(0)
        expect(stats.estadisticas.derrotas).toBe(0)
        expect(stats.estadisticas.empates).toBe(1)
        expect(stats.estadisticas.puntosRanking).toBe(100)
    })
})

describe('GestorDBUSERS.login', () =>
{
    let gestor

    beforeEach(() =>
    {
        gestor = new GestorDBUSERS()
    })

    afterEach(async () =>
    {
        await cleanupCreatedUsers()
    })

    /**
     * Añade un usuario nuevo e intenta iniciar sesión con contraseña incorrecta.
     * Se recibe un mensaje de error indicando contraseña incorrecta.
     */
    it('returns incorrect password when credentials do not match', async () =>
    {
        const username = makeUsername('login_bad_pass')
        createdUsers.add(username)

        const created = await gestor.addUser(username, username, 'passtest123')
        expect(created.success).toBe(true)

        const result = await gestor.login(username, 'wrong_password')

        expect(result.success).toBe(false)
        expect(result.message).toMatch(/inválidas|incorrecta/i)
    })
})

describe('GestorDBUSERS.getUserStats', () =>
{
    let gestor

    beforeEach(() =>
    {
        gestor = new GestorDBUSERS()
    })

    afterEach(async () =>
    {
        await cleanupCreatedUsers()
    })

    /**
     * Añade un usuario nuevo y recupera sus estadísticas.
     * Se recibe el objeto estadisticas con los valores iniciales.
     */
    it('returns stats object for an existing user', async () =>
    {
        const username = makeUsername('stats_get')
        createdUsers.add(username)

        const created = await gestor.addUser(username, username, 'passtest123')
        expect(created.success).toBe(true)

        const result = await gestor.getUserStats(username)

        expect(result.success).toBe(true)
        expect(result.estadisticas).toHaveProperty('partidasJugadas', 0)
        expect(result.estadisticas).toHaveProperty('victorias', 0)
        expect(result.estadisticas).toHaveProperty('derrotas', 0)
        expect(result.estadisticas).toHaveProperty('empates', 0)
        expect(result.estadisticas).toHaveProperty('puntosRanking', 100)
    })
})

describe('GestorDBUSERS.getRankingThreeBest', () =>
{
    let gestor

    beforeEach(() =>
    {
        gestor = new GestorDBUSERS()
    })

    afterEach(async () =>
    {
        await cleanupCreatedUsers()
    })

    /**
     * Añade 4 usuarios, actualiza sus puntos y consulta el ranking.
     * Se recibe el ranking ordenado por puntos y limitado a 3 usuarios.
     */
    it('returns ranking ordered by points and limited to top three', async () =>
    {
        const usernames = [
            makeUsername('rank_a'),
            makeUsername('rank_b'),
            makeUsername('rank_c'),
            makeUsername('rank_d'),
        ]

        usernames.forEach((username) => createdUsers.add(username))
        for (const username of usernames)
        {
            const created = await gestor.addUser(username, username, 'passtest123')
            expect(created.success).toBe(true)
        }

        await gestor.updateUserStats(usernames[0], 70)
        await gestor.updateUserStats(usernames[1], 40)
        await gestor.updateUserStats(usernames[2], 10)
        await gestor.updateUserStats(usernames[3], -50)

        const rankingResult = await gestor.getRankingThreeBest()

        expect(rankingResult.success).toBe(true)
        expect(Array.isArray(rankingResult.ranking)).toBe(true)
        expect(rankingResult.ranking.length).toBeLessThanOrEqual(3)

        for (let i = 1; i < rankingResult.ranking.length; i++)
        {
            expect(rankingResult.ranking[i - 1].estadisticas.puntosRanking)
                .toBeGreaterThanOrEqual(rankingResult.ranking[i].estadisticas.puntosRanking)
        }
    })
})

describe('GestorDBUSERS.globalRanking', () =>
{
    let gestor

    beforeEach(() =>
    {
        gestor = new GestorDBUSERS()
    })

    afterEach(async () =>
    {
        await cleanupCreatedUsers()
    })

     /**
      * Añade 4 usuarios, actualiza sus puntos y consulta el ranking global.
      * Se recibe el ranking ordenado por puntos.
      */
     it('returns ranking ordered by points', async () =>
     {
         const usernames = [
             makeUsername('rank_a'),
             makeUsername('rank_b'),
             makeUsername('rank_c'),
             makeUsername('rank_d'),
         ]

         usernames.forEach((username) => createdUsers.add(username))
         for (const username of usernames)
         {
             const created = await gestor.addUser(username, username, 'passtest123')
             expect(created.success).toBe(true)
         }

         await gestor.updateUserStats(usernames[0], 70)
         await gestor.updateUserStats(usernames[1], 40)
         await gestor.updateUserStats(usernames[2], 10)
         await gestor.updateUserStats(usernames[3], -50)

         const rankingResult = await gestor.globalRanking()

         expect(rankingResult.success).toBe(true)
         const rankingData = rankingResult.data || rankingResult.ranking
         expect(Array.isArray(rankingData)).toBe(true)
         expect(rankingData.length).toBeGreaterThanOrEqual(4)

         for (let i = 1; i < rankingData.length; i++)
         {
             const currentScore = rankingData[i - 1].score || rankingData[i - 1].estadisticas?.puntosRanking
             const nextScore = rankingData[i].score || rankingData[i].estadisticas?.puntosRanking
             expect(currentScore).toBeGreaterThanOrEqual(nextScore)
         }
     })
})

describe('GestorDBUSERS.addUserMatch', () =>
    {
        let gestor
    
        beforeEach(() =>
        {
            gestor = new GestorDBUSERS()
        })
    
        afterEach(async () =>
        {
            await cleanupCreatedUsers()
        })
    
        /**
         * Añade 1 usuario nuevo, y se le registra una partida con puntos positivos.
         * Se recibe success y mensaje de partida registrada correctamente.
         */
        it('returns registered match with positive points', async () =>
        {
            const usernames = [
                makeUsername('rank_a')
            ]
    
            usernames.forEach((username) => createdUsers.add(username))
            for (const username of usernames)
            {
                const created = await gestor.addUser(username, username, 'passtest123')
                expect(created.success).toBe(true)
            }
    
            const result = await gestor.addUserMatch(usernames[0], 10)
    
            expect(result.success).toBe(true)
            expect(result.message).toBe("Partida registrada correctamente.")
        })

        /**
         * Añade 1 usuario nuevo, y se le registra una partida con puntos negativos.
         * Se recibe success y mensaje de partida registrada correctamente.
         */
        it('returns registered match with negative points', async () =>
        {
            const usernames = [
                makeUsername('rank_a')
            ]
    
            usernames.forEach((username) => createdUsers.add(username))
            for (const username of usernames)
            {
                const created = await gestor.addUser(username, username, 'passtest123')
                expect(created.success).toBe(true)
            }
    
            const result = await gestor.addUserMatch(usernames[0], -10)
    
            expect(result.success).toBe(true)
            expect(result.message).toBe("Partida registrada correctamente.")
        })

         /**
          * Se intenta añadir una partida con el username desconocido.
          * Se recibe success igual a false y mensaje de error indicando que el usuario no existe.
          */
         it('returns not found when user does not exist', async () =>
         {
             const result = await gestor.addUserMatch("user_that_does_not_exist",-10)

             expect(result.success).toBe(false)
             expect(result.message).toMatch(/no existe|no encontrado/i)
         })
    })

describe('GestorDBUSERS.getUserGames', () =>
    {
        let gestor
    
        beforeEach(() =>
        {
            gestor = new GestorDBUSERS()
        })
    
        afterEach(async () =>
        {
            await cleanupCreatedUsers()
        })
    
        /**
         * Añade 1 usuario nuevo, se le registran 4 partidas y se recogen dichas partidas.
         * Se recibe success, mensaje de partidas registradas correctamente y lista con las partidas.
         */
        it('returns list with user matches', async () =>
        {
            const usernames = [
                makeUsername('rank_a')
            ]
    
            usernames.forEach((username) => createdUsers.add(username))
            for (const username of usernames)
            {
                const created = await gestor.addUser(username, username, 'passtest123')
                expect(created.success).toBe(true)
            }
    
            await gestor.addUserMatch(usernames[0], 10)
            await gestor.addUserMatch(usernames[0], 10)
            await gestor.addUserMatch(usernames[0], 10)
            await gestor.addUserMatch(usernames[0], 10)

            const result = await gestor.getUserGames(usernames[0])
    
            expect(result.success).toBe(true)
            expect(result.message).toBe("Partidas recuperadas correctamente.")
            expect(Array.isArray(result.games)).toBe(true)
            expect(result.games.length).toBe(4)
        })

         /**
          * busca las partidas de un usuario que no existe.
          * Se recibe success igual a false y mensaje de error indicando que el usuario no existe.
          */
         it('returns not found when user does not exist', async () =>
         {
             const result = await gestor.getUserGames("user_that_does_not_exist")

             expect(result.success).toBe(false)
             expect(result.message).toMatch(/no existe|no encontrado/i)
         })
    })