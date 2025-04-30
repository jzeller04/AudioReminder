import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'

const app = express()
app.use(express.json())

// Dummy auth
app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (username === 'admin' && password === 'secret') {
    return res.status(200).json({ token: 'abc123' })
  }
  return res.status(401).json({ error: 'Invalid credentials' })
})

describe('POST /login', () => {
  it('returns token for valid credentials', async () => {
    const res = await request(app).post('/login').send({
      username: 'admin',
      password: 'secret'
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app).post('/login').send({
      username: 'admin',
      password: 'wrong'
    })
    expect(res.statusCode).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})