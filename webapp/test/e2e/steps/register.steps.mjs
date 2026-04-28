
import {Given, Then, When} from '@cucumber/cucumber'

Given('the register page is open', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')
    await page.goto('http://localhost:5173/register')
})

When('I register with a unique username and password', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const unique = Date.now() + '_' + Math.floor(Math.random() * 100000)
    const uniqueUser = `Tester_${unique}`
    const uniquePass = `pass_${unique}`

    await page.fill('#username', uniqueUser)
    await page.fill('#password', uniquePass)

    await page.click('button[type="submit"]')

    await page.waitForURL('**/game', { timeout: 20000 })
})

Then('I should be registered and redirected to the game page', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForURL('**/game', {timeout: 30000})
})
