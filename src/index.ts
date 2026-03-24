#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: { name: 'arch-drift', version: '0.1.0', description: 'Architecture enforcement CLI' },
  subCommands: {
    init: () => import('./commands/init.ts').then(m => m.default),
    check: () => import('./commands/check.ts').then(m => m.default),
    validate: () => import('./commands/validate.ts').then(m => m.default),
    allow: () => import('./commands/allow.ts').then(m => m.default),
  },
})

runMain(main)
