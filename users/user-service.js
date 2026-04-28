const User = require('./user-model.js');
const bcrypt = require('bcryptjs');

/**
 * Creates a new user and add it to the database.
 * Also encrypts the given password using bcrypt.js.
 *  @param {string} username - Unique identified for the user.
 *  @param {string} alias - Name shown in-screen.
 *  @param {string} password - Plain text password before encrypted.
 * @throws {Error} If required fields are missing.
 * @returns {Promise<Object>} Saved user document.
 */
const addUser = async (username, alias, password) =>
{
    if (!username) throw new Error('Username expected but found null or empty');
    if (!alias) throw new Error('Display name expected but found null or empty');
    if (!password) throw new Error('Password expected but found null or empty');

    // Encrypt password (10 salt rounds).
    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ username, displayName: alias, password: hashed });
    return await user.save();
};

/**
 * Retrieves a list of users with a specified limit of 100 by default.
 *  @param {number} limit - Maximum nmber of users to return; 100 by default.
 * @returns {Promise<Array>} List of user documents.
 */
const listUsers = async (limit = 100) =>
{
    // Parse limit before reading.
    const parsedLimit = Number.parseInt(limit);
    if (Number.isNaN(parsedLimit) || parsedLimit <= 0)
        throw new Error("Limit must be a positive number.");

    return await User.find().limit(parsedLimit);
};

/**
 * Finds a single user by their ID.
 * @param {string} id - ID of the user.
 * @throws {Error} If ID is not provided.
 * @returns {Promise<Object|null>} User document or null if not found.
 */
const getUserById = async (id) =>
{
    if (!id) throw new Error("User ID expected but found null or empty");

    return await User.findById(id);
}

/**
 * Finds a single user by their username.
 * @param {string} username - Username to look up.
 * @throws {Error} If username is not provided.
 * @returns {Promise<Object|null>} User document or null if not found.
 */
const getUserByUsername = async (username) =>
{
    if (!username) throw new Error("Username expected but found null or empty");

    return await User.findOne({ username });
};

/**
 * Deletes a user by their ID.
 * @param {string} id - ID of the user.
 * @throws {Error} If ID is not provided.
 * @returns {Promise<Object|null>} The deleted document.
 */
const deleteUser = async (id) =>
{
    if (!id) throw new Error("User ID is required for deletion.");

    return await User.findByIdAndDelete(id);
};

/**
 * Compare a given username and password with the stored password for authentication.
 * @param {*} username - ID of the user.
 * @param {*} password - Given password to compare.
 * @returns {Promise<boolean>} Whether the passwords match or not.
 */
const checkPassword = async (username, password) =>
{
    if (!username) throw new Error('Username expected but found null or empty');
    if (!password) throw new Error('Password expected but found null or empty');

    const safeUsername = typeof username === 'string' ? username.trim() : '';

    const user = await User.findOne({ username: safeUsername });
    if (!user) return false;

    // Use bcrypt.compare to verify the plain password against the stored hash.
    const hashed = await bcrypt.hash(password, 10);
    return await bcrypt.compare(hashed, user.password);
}

module.exports = {
    addUser,
    listUsers,
    getUserById,
    getUserByUsername,
    deleteUser,
    checkPassword,
};