require('dotenv').config();
const { connectToDatabase } = require('./userDB');
const bcrypt = require('bcryptjs');

class GestorDBUSERS {
    constructor() {}

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

            // 1. Comprobar si existe el usuario
            const usuarioExistente = await usersCollection.findOne({ nombreUsuario });

            if (usuarioExistente) {
                return { 
                    success: false, 
                    message: `El usuario '${nombreUsuario}' ya existe.` 
                };
            }

             // Encrypt password (10 salt rounds).
            const passwordHashed = await bcrypt.hash(contrasena, 10);

            // 2. Preparar el nuevo usuario
            const nuevoUsuario = {
                nombre,
                nombreUsuario,
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

            // 1. Buscar al usuario actual para conocer sus puntos
            const usuario = await usersCollection.findOne({ nombreUsuario });
            if (!usuario) {
                return { success: false, message: `El usuario '${nombreUsuario}' no existe.` };
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
            let nuevosPuntos = (usuario.estadisticas.puntosRanking || 0) + puntos;
            if (nuevosPuntos < 0) nuevosPuntos = 0;
            
            updateDoc.$set["estadisticas.puntosRanking"] = nuevosPuntos;

            // 4. Realizar la actualización
            await usersCollection.updateOne({ nombreUsuario }, updateDoc);

            return { 
                success: true, 
                message: `Estadísticas de '${nombreUsuario}' actualizadas correctamente.`,
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

            // 1. Buscar al usuario por nombreUsuario
            const usuario = await usersCollection.findOne({ nombreUsuario });
            
            if (!usuario) {
                return { success: false, message: `El usuario '${nombreUsuario}' no existe.` };
            }

            // 2. Comparar la contraseña proporcionada con el hash guardado
            const esValida = await bcrypt.compare(contrasena, usuario.passwordHashed);

            if (esValida) {
                // No devolvemos la contraseña en el objeto user por seguridad
                const { passwordHashed: _, ...userWithoutPassword } = usuario;
                return {
                    success: true, 
                    message: 'Login correcto.', 
                    user: userWithoutPassword 
                };
            } else {
                return { 
                    success: false, 
                    message: 'Contraseña incorrecta.' 
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

            // 1. Buscar al usuario
            const usuario = await usersCollection.findOne(
                { nombreUsuario },
                { projection: { estadisticas: 1, _id: 0 } } // Solo queremos las estadísticas
            );

            if (!usuario) {
                return { 
                    success: false, 
                    message: `El usuario '${nombreUsuario}' no existe.` 
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
     * @param {string} nombreUsuario 
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
}

module.exports = GestorDBUSERS;