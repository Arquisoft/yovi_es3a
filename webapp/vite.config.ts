import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(
{
	plugins: [react()],

	/* Resolve routes for styles, components... */
	resolve:
	{
		alias:
		{
			'@': path.resolve(__dirname, './src'),
			'@features': path.resolve(__dirname, './src/features'),
			'@styles': path.resolve(__dirname, './src/styles')
		}
	},

	test:
	{
		globals: true,
		environment: 'jsdom',
		coverage:
		{
			reporter: ['text', 'lcov'],
		},
	},
})
