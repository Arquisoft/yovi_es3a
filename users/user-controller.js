import * as userService from './user-service.js';

/**
 * Create a user and add it to the database, using a username and password.
 * The password will be encrypted before saving.
 */
export const addUser = async (req, res) =>
{
    try
    {
        const user = await userService.addUser(req.body);
        res.status(201).json(user);
    }
    catch (error)
    {
        res.status(500)
            .json({ message: error.message });
    }
}

/**
 * Retrieve a list of users with a specified limit of 100 by default.
 */
export const listUsers = async (req, res) =>
{
    try
    {
        const limit = req.query.limit || 100;
        const users = await userService.listUsers(limit);
        res.json(users);
    }
    catch (err)
    {
        res.status(500)
            .json({ error: err.message });
    }
};

/**
 * Finds a single user by their ID.
 */
export const getUserById = async (req, res) =>
{
    try
    {
        const user = await userService.getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'not found' });
        res.json(user);
    }
    catch (err)
    {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Finds a single user by their ID.
 */
export const getUserByUsername = async (req, res) =>
{
    try
    {
        const user = await userService.getUserByUsername(req.params.username);
        if (!user) return res.status(404).json({ error: 'not found' });
        res.json(user);
    }
    catch (err)
    {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Deletes a user by their ID.
 */
export const deleteUser = async (req, res) =>
{
    try
    {
        const result = await userService.deleteUser(req.params.id);
        if (!result) return res.status(404).json({ error: 'not found' });
        res.status(204).end();
    }
    catch (err)
    {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Compare a given username and password with the stored password for authentication.
 * Password will be encrypted before checking.
 */
export const checkPassword = async (req, res) =>
{
    try
    {
        const { username, password } = req.body;
        const valid = await userService.checkPassword(username, password);
        if (!valid) return res.status(401).json({ error: 'unauthorized' });

        res.json({ valid: true });
    }
    catch (err)
    {
        res.status(500).json({ error: err.message });
    }
}