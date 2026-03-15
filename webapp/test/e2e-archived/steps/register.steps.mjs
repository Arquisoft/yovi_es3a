import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.goto('http://localhost:5173')
  await page.click('text=Register')
})

When('I enter {string} as the username, {string} as the password and submit', async function (username, pass) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#username', username)
  await page.fill('#password', pass)
  await page.click('.submit-button')
})

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.success-message', { timeout: 5000 })
  const text = await page.textContent('.success-message')
  assert.ok(text && text.includes(expected), `Expected success message to include "${expected}", got: "${text}"`)
})
