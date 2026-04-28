
require('dotenv').config();
const { connectToDatabase } = require('./userDB');
const bcrypt = require('bcryptjs');

// Función para prevenir inyecciones NoSQL
function sanitizeUsername(nombreUsuario) {
    if (typeof nombreUsuario !== 'string') return null;

    const trimmed = nombreUsuario.trim();

    if (!trimmed) return null;

    if (!/^\w+$/.test(trimmed)) return null;

    return trimmed;
}

function requireValidUsername(nombreUsuario) {
    const safeUsername = sanitizeUsername(nombreUsuario);

    if (!safeUsername) return null;

    return safeUsername;
}

async function ensureIndexes(usersCollection) {
    await usersCollection.createIndex(
        { nombreUsuario: 1 },
        { unique: true }
    );
}


class GestorDBUSERS
{
    /**
     * Verifica la conexión con la base de datos.
     */
    async verifyConnection() {
        try {
            const db = await connectToDatabase();
            await db.command({ ping: 1 });
            return true;
        } catch (err) {
            console.error('Error de conexión:', err.message);
            return false;
        }
    }

    /**
     * Añade un nuevo usuario si no existe ya. SE ENCRIPTA LA PASSWORD
     * @returns {Promise<{success: boolean, message: string, id?: string}>}
     */
    async addUser(nombre, nombreUsuario, contrasena) {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');

            await ensureIndexes(usersCollection);

            const safeUsername = requireValidUsername(nombreUsuario);

            if (!safeUsername) {
                return {
                    success: false,
                    message: 'El nombre de usuario no es válido.'
                };
            }

            // 1. Comprobar si existe el usuario
            const usuarioExistente = await usersCollection.findOne({
                nombreUsuario: safeUsername
            });

            if (usuarioExistente) {
                return { 
                    success: false, 
                    message: `El usuario ya existe.` 
                };
            }

            if (typeof contrasena !== 'string' || contrasena.length < 6) {
                return {
                    success: false,
                    message: 'Contraseña inválida (mínimo 6 caracteres).'
                };
            }

            // Encrypt password (10 salt rounds).
            const passwordHashed = await bcrypt.hash(contrasena, 10);

            // 2. Preparar el nuevo usuario
            const nuevoUsuario = {
                nombre,
                nombreUsuario: safeUsername,
                passwordHashed,
                fechaUltimaEdicion: new Date().toISOString(),
                estadisticas: {
                    partidasJugadas: 0,
                    victorias: 0,
                    derrotas: 0,
                    empates: 0,
                    puntosRanking: 100
                }
            };

            // 3. Insertar en la base de datos
            const resultado = await usersCollection.insertOne(nuevoUsuario);
            
            return { 
                success: true, 
                message: 'Usuario creado con éxito.', 
                id: resultado.insertedId 
            };

        } catch (err) {
            console.error('Error en addUser:', err.message);

            if (err.code === 11000) {
                return {
                    success: false,
                    message: 'El usuario ya existe (duplicado).'
                };
            }

            throw new Error(`Error al añadir usuario: ${err.message}`);
        }
    }

    /**
     * Actualiza las estadísticas de un usuario tras una partida.
     * Si los puntos son positivos, se suman y se declara la victoria. Si son negativos, se identifica como derrota y se suman.
     * @param {string} nombreUsuario - El usuario a actualizar.
     * @param {number} puntos - Puntos a sumar/restar (positivo: victoria, negativo: derrota, 0: empate).
     * @returns {Promise<{success: boolean, message: string, nuevosPuntos?: number}>}
     */
    async updateUserStats(nombreUsuario, puntos) {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');

            const safeUsername = requireValidUsername(nombreUsuario);
            if (!safeUsername) {
                return {
                    success: false,
                    message: 'El nombre de usuario no es válido.'
                };
            }

            // 1. Buscar al usuario actual para conocer sus puntos
            const usuario = await usersCollection.findOne({
                nombreUsuario: safeUsername
            });

            if (!usuario) {
                return { success: false, message: `El usuario no existe.` };
            }

            // 2. Preparar el objeto de actualización
            const updateDoc = {
                $inc: { "estadisticas.partidasJugadas": 1 },
                $set: { fechaUltimaEdicion: new Date().toISOString() }
            };

            // Determinar qué contador incrementar según los puntos
            if (puntos > 0) {
                updateDoc.$inc["estadisticas.victorias"] = 1;
            } else if (puntos < 0) {
                updateDoc.$inc["estadisticas.derrotas"] = 1;
            } else {
                updateDoc.$inc["estadisticas.empates"] = 1;
            }

            // 3. Calcular los nuevos puntos de ranking (nunca por debajo de 0)
            let current = Number(usuario.estadisticas?.puntosRanking ?? 0);
            let nuevosPuntos = current + puntos;
            
            if (nuevosPuntos < 0) nuevosPuntos = 0;
            
            updateDoc.$set["estadisticas.puntosRanking"] = nuevosPuntos;

            // 4. Realizar la actualización
            await usersCollection.updateOne(
                { nombreUsuario: safeUsername },
                updateDoc
            );

            return { 
                success: true, 
                message: `Estadísticas de '${safeUsername}' actualizadas correctamente.`,
                nuevosPuntos: nuevosPuntos
            };

        } catch (err) {
            console.error('Error en updateUserStats:', err.message);
            throw new Error(`Error al actualizar estadísticas: ${err.message}`);
        }
    }

    /**
     * Intenta loguear a un usuario comprobando su contraseña con el hash de la BD.
     * @param {string} nombreUsuario 
     * @param {string} contrasena 
     * @returns {Promise<{success: boolean, message: string, user?: object}>}
     */
    async login(nombreUsuario, contrasena) {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');

            const safeUsername = requireValidUsername(nombreUsuario);
            if (!safeUsername) {
                return {
                    success: false,
                    message: 'Credenciales inválidas.'
                };
            }

            // 1. Buscar al usuario por nombreUsuario
            const usuario = await usersCollection.findOne({
                nombreUsuario: safeUsername
            }); 

            if (!usuario) {
                return {
                    success: false,
                    message: 'Credenciales inválidas.'
                };
            }

            // 2. Comparar la contraseña proporcionada con el hash guardado
            const esValida = await bcrypt.compare(contrasena, usuario.passwordHashed);

            if (esValida) {
                // No devolvemos la contraseña en el objeto user por seguridad
                const userWithoutPassword = { ...usuario };
                delete userWithoutPassword.passwordHashed;
                return {
                    success: true, 
                    message: 'Login correcto.', 
                    user: userWithoutPassword 
                };
            } else {
                return { 
                    success: false, 
                    message: 'Credenciales inválidas.'
                };
            }

        } catch (err) {
            console.error('Error en login:', err.message);
            throw new Error(`Error durante el proceso de login: ${err.message}`);
        }
    }

    /**
     * Obtiene todas las estadísticas de un jugador.
     * Devolvera un objeto con el siguiente aspecto:
     * {
        "success": true,
        "message": "Estadísticas recuperadas correctamente.",
        "estadisticas": {
            "partidasJugadas": 3,
            "victorias": 1,
            "derrotas": 1,
            "empates": 1,
            "puntosRanking": 100
        }
        }
     * @param {string} nombreUsuario 
     * @returns {Promise<{success: boolean, message: string, estadisticas?: object}>}
     */
    async getUserStats(nombreUsuario) {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');

            const safeUsername = requireValidUsername(nombreUsuario);
            if (!safeUsername) {
                return {
                    success: false,
                    message: 'El nombre de usuario no es válido.'
                };
            }

            // 1. Buscar al usuario
            const usuario = await usersCollection.findOne(
                { nombreUsuario: safeUsername },
                { projection: { estadisticas: 1, _id: 0 } } // Solo queremos las estadísticas
            );

            if (!usuario) {
                return { 
                    success: false, 
                    message: 'Usuario no encontrado.' 
                };
            }

            return { 
                success: true, 
                message: 'Estadísticas recuperadas correctamente.', 
                estadisticas: usuario.estadisticas 
            };

        } catch (err) {
            console.error('Error en getUserStats:', err.message);
            throw new Error(`Error al recuperar estadísticas: ${err.message}`);
        }
    }


    /**
     * Obtiene los 3 mejores jugadores ordenados por puntos de ranking.
     * Devolvera un objeto con el siguiente aspecto:
     * {
        "success": true,
        "message": "Ranking recuperado correctamente.",
        "ranking": [
            {
                "nombreUsuario": "player1",
                "estadisticas": {
                    "partidasJugadas": 3,
                    "victorias": 1,
                    "derrotas": 1,
                    "empates": 1,
                    "puntosRanking": 100
                }
            },
            {
                "nombreUsuario": "player2",
                "estadisticas": {}
            },
            {
                "nombreUsuario": "player3",
                "estadisticas": {}
            }
        ]
     * @returns {Promise<{success: boolean, message: string, ranking?: object}>}
     */
    async globalRanking() {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');
            
            const ranking = await usersCollection.find({})
                .sort({ "estadisticas.puntosRanking": -1 })
                .project({ 
                    nombreUsuario: 1, 
                    estadisticas: 1,
                    _id: 0 
                })
                .toArray();

            // Transformar los datos al formato esperado
            const formattedRanking = ranking.map(user => ({
                playerName: user.nombreUsuario || 'Desconocido',
                score: (user.estadisticas?.puntosRanking) || 0
            }));

            return { 
                success: true, 
                message: 'Ranking recuperado correctamente.', 
                ranking: formattedRanking
            };

        } catch (err) {
            console.error('Error en globalRanking:', err.message);
            return {
                success: false,
                message: `Error al recuperar ranking global: ${err.message}`,
                ranking: []
            };
        }
    }

    /**
     * Obtiene los 3 mejores jugadores ordenados por puntos de ranking.
     * Devolvera un objeto con el siguiente aspecto:
     * {
        "success": true,
        "message": "Ranking recuperado correctamente.",
        "ranking": [
            {
                "nombreUsuario": "player1",
                "estadisticas": {
                    "partidasJugadas": 3,
                    "victorias": 1,
                    "derrotas": 1,
                    "empates": 1,
                    "puntosRanking": 100
                }
            },
            {
                "nombreUsuario": "player2",
                "estadisticas": {}
            },
            {
                "nombreUsuario": "player3",
                "estadisticas": {}
            }
        ]
     * @returns {Promise<{success: boolean, message: string, ranking?: object}>}
     */
    async getRankingThreeBest() {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');

            const ranking = await usersCollection.find({}).sort({ "estadisticas.puntosRanking": -1 }) // Obtiene la lista con todos los usuarios y los ordena por puntos de ranking de forma descendente
                .limit(3)   // Limita el resultado a los 3 primeros 
                .project({ 
                    nombreUsuario: 1, 
                    estadisticas: 1, 
                    _id: 0 
                })
                .toArray(); // Selecciona solo el nombre de usuario y las estadísticas, sin el _id y lo convierte a un array


            return { 
                success: true, 
                message: 'Ranking recuperado correctamente.', 
                ranking: ranking
            };

        } catch (err) {
            console.error('Error en getRankingThreeBest:', err.message);
            throw new Error(`Error al recuperar ranking: ${err.message}`);
        }
    }

    /**
     * Obtiene las últimas 5 partidas de un usuario.
     * Estructura esperada de una partida:
     * {
     *     "_id": ObjectId,
     *     "jugador": ObjectId (ID del usuario),
     *     "tipo": "local" | "bot",
     *     "fecha": Date,
     *     "activa": boolean,
     *     "puntos": number
     * }
     * @param {string} nombreUsuario - El nombre de usuario
     * @returns {Promise<{success: boolean, message: string, games?: Array}>}
     */
    async getUserGames(nombreUsuario) {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');
            const gamesCollection = db.collection('partidas');

            const safeUsername = requireValidUsername(nombreUsuario);

            if (!safeUsername) {
                return {
                    success: false,
                    message: 'El nombre de usuario no es válido.'
                };
            }

            // 1. Buscar al usuario para obtener su ID
            const usuario = await usersCollection.findOne(
                { nombreUsuario: safeUsername },
                { projection: { _id: 1 } }
            );

            if (!usuario) {
                return { 
                    success: false, 
                    message: 'Usuario no encontrado.'
                };
            }

            // 2. Buscar las últimas 5 partidas del usuario
            const games = await gamesCollection.find(
                { jugador: usuario._id }
            )
            .sort({ fecha: -1 })  // Ordenar por fecha descendente (más recientes primero)
            .limit(5)
            .toArray();

            return { 
                success: true, 
                message: 'Partidas recuperadas correctamente.', 
                games: games 
            };

        } catch (err) {
            console.error('Error en getUserGames:', err.message);
            throw new Error(`Error al recuperar partidas: ${err.message}`);
        }
    }


    /**
     * Registra el resultado de una partida.
     * 
     * @param {string} nombreUsuario - El nombre del usuario.
     * @param {number} puntos - Puntos obtenidos en la partida.
     * @param {string} tipo - Tipo de partida ("local" o "bot").
     * @returns {Promise<{success: boolean, message: string, nuevosPuntos?: number}>}
     */
    async addUserMatch(nombreUsuario, puntos, tipo = "local") {
        try {
            const db = await connectToDatabase();
            const usersCollection = db.collection('usuarios');
            const gamesCollection = db.collection('partidas');

            const safeUsername = requireValidUsername(nombreUsuario);
            if (!safeUsername) {
                return {
                    success: false,
                    message: 'El nombre de usuario no es válido.'
                };
            }

            // 1. Buscar al usuario
            const usuario = await usersCollection.findOne({
                nombreUsuario: safeUsername
            });

            if (!usuario) {
                return {
                    success: false,
                    message: 'Usuario no encontrado.'
                };
            }

            // 2. Registrar la partida en la colección 'partidas'
            await gamesCollection.insertOne({
                jugador: usuario._id,
                tipo,
                fecha: new Date(),
                activa: false,
                puntos
            });

            return {
                success: true,
                message: "Partida registrada correctamente."
            };

        } catch (err) {
            console.error("Error en addUserMatch:", err.message);
            throw new Error(`Error al registrar partida: ${err.message}`);
        }
    }
}

module.exports = GestorDBUSERS;