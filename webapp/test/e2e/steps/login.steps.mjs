import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert'

Given('the login page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.goto('http://localhost:5173/login')
})

When('I login with username {string}, with {string} as the password and submit', async function (username, pass) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#username', username)
  await page.fill('#password', pass)
  await page.click('button[type="submit"]')
})

Then('I should be logged in and redirected to the game page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForURL('**/game', { timeout: 5000 })

  const url = page.url()
  assert.ok(url.includes('game'), `Expected URL to contain "game", but got: ${url}`)
})
