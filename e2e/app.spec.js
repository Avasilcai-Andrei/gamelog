import { test, expect } from '@playwright/test'

const uniqueUser = () => `u${Date.now()}${Math.floor(Math.random() * 1000)}`

async function registerAndEnterApp(page) {
  const username = uniqueUser()
  await page.goto('/register')

  await page.getByPlaceholder('Username').fill(username)
  await page.getByPlaceholder('Email').fill(`${username}@mail.com`)
  const passwordFields = page.locator('input[type="password"]')
  await passwordFields.nth(0).fill('Password1!')
  await passwordFields.nth(1).fill('Password1!')
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page).toHaveURL(/\/library/)
  return username
}

test('feature 1: register and add game', async ({ page }) => {
  await registerAndEnterApp(page)

  await page.getByRole('button', { name: '+ Add Game' }).click()
  await page.getByPlaceholder('Search for a game...').fill('Celeste')
  await page.locator('.modal select').first().selectOption('Platformer')
  await page.locator('.form-group:has(label:has-text("Hours played")) input').fill('6')
  await page.getByRole('button', { name: 'Add game', exact: true }).click()

  await expect(page.getByRole('cell', { name: 'Celeste' })).toBeVisible()
})

test('feature 2: library table edits and stats charts', async ({ page }) => {
  await registerAndEnterApp(page)

  await page.getByRole('button', { name: '+ Add Game' }).click()
  await page.getByPlaceholder('Search for a game...').fill('Hades')
  await page.locator('.modal select').first().selectOption('RPG')
  await page.locator('.form-group:has(label:has-text("Hours played")) input').fill('12')
  await page.getByRole('button', { name: 'Add game', exact: true }).click()

  // The game appears in the My Library table and edits persist.
  await expect(page.getByRole('cell', { name: 'Hades' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).first().click()
  await page.locator('.form-group:has(label:has-text("Hours played")) input').fill('20')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('cell', { name: '20h' })).toBeVisible()

  // Stats renders charts for that data.
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page).toHaveURL(/\/stats/)
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible()
})

test('feature 3: lore map add nodes and link', async ({ page }) => {
  await registerAndEnterApp(page)

  await page.getByRole('button', { name: '+ Add Game' }).click()
  await page.getByPlaceholder('Search for a game...').fill('Elden Ring')
  await page.locator('.modal select').first().selectOption('RPG')
  await page.getByRole('button', { name: 'Add game', exact: true }).click()

  await page.getByRole('link', { name: 'GameList' }).click()
  await page.getByText('Elden Ring').first().click()
  await page.getByRole('button', { name: 'Open Lore Map' }).click()

  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByPlaceholder('Ex: Academy Gate').fill('Stormveil Castle')
  await page.getByPlaceholder('One concise lore note').fill('Main legacy dungeon in Limgrave.')
  await page.getByRole('button', { name: 'Save Node' }).click()

  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByPlaceholder('Ex: Academy Gate').fill('Margit')
  await page.getByPlaceholder('One concise lore note').fill('Gatekeeper boss for Stormveil.')
  await page.getByRole('button', { name: 'Save Node' }).click()

  const selects = page.locator('.lore-link-panel select')
  await selects.nth(0).selectOption({ label: 'Stormveil Castle' })
  await selects.nth(1).selectOption({ label: 'Margit' })
  await page.getByRole('button', { name: 'Link Nodes' }).click()

  await expect(page.getByRole('button', { name: 'Stormveil Castle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Margit' })).toBeVisible()
})
