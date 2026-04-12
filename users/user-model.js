const mongoose = require('mongoose');
const { Schema, model } = mongoose;
require('dotenv/config');

// Try to connect to MongoDB using MONGODB_URI from environment, default to local.
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yovi';
mongoose.connect(mongoUri).then(() =>
{
    console.log('Connected to MongoDB');
})
.catch((err) =>
{
    console.error('MongoDB connection error:', err.message || err);
});

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || model('User', userSchema);

module.exports = User;