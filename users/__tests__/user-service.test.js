import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const User = require('../user-model.js')
const bcrypt = require('bcryptjs')

const {
	addUser,
	listUsers,
	getUserById,
	getUserByUsername,
	deleteUser,
	checkPassword
} = require('../user-service.js')

describe('user-service.addUser', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when username is missing', async () =>
	{
		await expect(addUser('', 'alias', 'secret')).rejects.toThrow(/Username expected but found null or empty/i)
	})

	it('throws error when alias is missing', async () =>
	{
		await expect(addUser('user1', '', 'secret')).rejects.toThrow(/Display name expected but found null or empty/i)
	})

	it('throws error when password is missing', async () =>
	{
		await expect(addUser('user1', 'alias', '')).rejects.toThrow(/Password expected but found null or empty/i)
	})

	it('hashes password and saves a new user', async () =>
	{
		const savedUser = {
			_id: '507f1f77bcf86cd799439011',
			username: 'user1',
			displayName: 'alias1',
			password: 'hashed-secret'
		}

		const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-secret')
		const saveSpy = vi.spyOn(User.prototype, 'save').mockResolvedValue(savedUser)

		const result = await addUser('user1', 'alias1', 'secret')

		expect(hashSpy).toHaveBeenCalledWith('secret', 10)
		expect(saveSpy).toHaveBeenCalledTimes(1)
		expect(saveSpy.mock.instances[0].username).toBe('user1')
		expect(saveSpy.mock.instances[0].displayName).toBe('alias1')
		expect(saveSpy.mock.instances[0].password).toBe('hashed-secret')
		expect(result).toEqual(savedUser)
	})
})

describe('user-service.listUsers', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when limit is not a positive number', async () =>
	{
		await expect(listUsers('bad-limit')).rejects.toThrow(/Limit must be a positive number/i)
		await expect(listUsers(0)).rejects.toThrow(/Limit must be a positive number/i)
	})

	it('returns users applying the parsed limit', async () =>
	{
		const users = [{ username: 'user1' }, { username: 'user2' }]
		const limitMock = vi.fn().mockResolvedValue(users)

		const findSpy = vi.spyOn(User, 'find').mockReturnValue({
			limit: limitMock
		})

		const result = await listUsers('2')

		expect(findSpy).toHaveBeenCalledTimes(1)
		expect(limitMock).toHaveBeenCalledWith(2)
		expect(result).toEqual(users)
	})
})

describe('user-service.getUserById', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when id is missing', async () =>
	{
		await expect(getUserById('')).rejects.toThrow(/User ID expected but found null or empty/i)
	})

	it('returns the user when id exists', async () =>
	{
		const user = { _id: '507f1f77bcf86cd799439011', username: 'user1' }
		const findByIdSpy = vi.spyOn(User, 'findById').mockResolvedValue(user)

		const result = await getUserById('507f1f77bcf86cd799439011')

		expect(findByIdSpy).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
		expect(result).toEqual(user)
	})
})

describe('user-service.getUserByUsername', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when username is missing', async () =>
	{
		await expect(getUserByUsername('')).rejects.toThrow(/Username expected but found null or empty/i)
	})

	it('returns user by username', async () =>
	{
		const user = { _id: '507f1f77bcf86cd799439011', username: 'user1' }
		const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue(user)

		const result = await getUserByUsername('user1')

		expect(findOneSpy).toHaveBeenCalledWith({ username: 'user1' })
		expect(result).toEqual(user)
	})
})

describe('user-service.deleteUser', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when id is missing', async () =>
	{
		await expect(deleteUser('')).rejects.toThrow(/User ID is required for deletion./i)
	})

	it('deletes and returns the deleted user by id', async () =>
	{
		const deleted = { _id: '507f1f77bcf86cd799439011', username: 'user1' }
		const deleteSpy = vi.spyOn(User, 'findByIdAndDelete').mockResolvedValue(deleted)

		const result = await deleteUser('507f1f77bcf86cd799439011')

		expect(deleteSpy).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
		expect(result).toEqual(deleted)
	})
})

describe('user-service.checkPassword', () =>
{
	beforeEach(() =>
	{
		vi.restoreAllMocks()
	})

	it('throws error when username is missing', async () =>
	{
		await expect(checkPassword('', 'secret')).rejects.toThrow(/Username expected but found null or empty/i)
	})

	it('throws error when password is missing', async () =>
	{
		await expect(checkPassword('user1', '')).rejects.toThrow(/Password expected but found null or empty/i)
	})

	it('returns false when user does not exist', async () =>
	{
		const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue(null)

		const result = await checkPassword('missing-user', 'secret')

		expect(findOneSpy).toHaveBeenCalledWith({ username: 'missing-user' })
		expect(result).toBe(false)
	})

	it('returns true when bcrypt compare succeeds', async () =>
	{
		vi.spyOn(User, 'findOne').mockResolvedValue({
			username: 'user1',
			password: 'stored-hash'
		})

		const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('rehashed-input')
		const compareSpy = vi.spyOn(bcrypt, 'compare').mockResolvedValue(true)

		const result = await checkPassword('user1', 'secret')

		expect(hashSpy).toHaveBeenCalledWith('secret', 10)
		expect(compareSpy).toHaveBeenCalledWith('rehashed-input', 'stored-hash')
		expect(result).toBe(true)
	})
})
