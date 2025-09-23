#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

// Run Next.js development server on port 5000
const nextDev = spawn('npx', ['next', 'dev', '-p', '5000'], {
  stdio: 'inherit',
  cwd: process.cwd()
})

nextDev.on('error', (err) => {
  console.error('Failed to start development server:', err)
  process.exit(1)
})

nextDev.on('close', (code) => {
  console.log(`Development server exited with code ${code}`)
  process.exit(code)
})