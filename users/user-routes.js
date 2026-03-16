import express from 'express';
import * as userController from './user-controller.js';

const router = express.Router();

// -- Collection routes
router.route("/")
    .get(userController.listUsers)
    .post(userController.addUser);

// -- Specific property - username ...
router.get("/username/:username", userController.getUserByUsername);

// -- Auth
router.post("/auth", userController.checkPassword);

// -- Individual resource (by ID)
router.route("/:id")
    .get(userController.getUserById)
    .delete(userController.deleteUser);

export default router;