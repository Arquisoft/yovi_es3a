require('dotenv').config();
const { connectToDatabase } = require('./userDB');

(async () => {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    console.log('Conexión a MongoDB correcta');
    process.exit(0);
  } catch (err) {
    console.error('Error al conectar con MongoDB:', err.message);
    process.exit(1);
  }
})();