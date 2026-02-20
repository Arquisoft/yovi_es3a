/* Cada microservicio de la aplicación conectará con la Base de Datos por su cuenta para evitar conflictos futuros. Por ello, toda la
gestión de la Base de Datos se realizará dentro de cada uno, y no en un "mogollón". */

/* Este archivo hay que editarlo una vez se pueda acceder al Atlas.*/
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'yovi';

let client;
let db;

async function connectToDatabase() {
  if (db) return db;

  if (!uri) {
    throw new Error('MONGODB_URI no está definida en las variables de entorno');
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
}

module.exports = { connectToDatabase };