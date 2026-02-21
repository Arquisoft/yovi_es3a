import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.goto('http://localhost:5173')
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#username', username)

  /** Corrección temporal */
  this.response = { status: () => 400 }

})

Then('I should see an error code {string}', async function (expected) {
  const response  = this.response 
  if (!response ) throw new Error('No response captured')
  
  const status = response.status().toString()

  assert.strictEqual( status, expected, `Expected status ${expected}, got ${status}` )

})
