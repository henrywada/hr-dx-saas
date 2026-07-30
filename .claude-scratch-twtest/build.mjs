import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import { writeFileSync } from 'fs'

const css = `@import "tailwindcss" source("/home/hr-dx/ai-projects/hr-dx-saas/.claude-scratch-twtest");`

const result = await postcss([tailwindcss()]).process(css, { from: '/home/hr-dx/ai-projects/hr-dx-saas/.claude-scratch-twtest/in.css' })
writeFileSync('/home/hr-dx/ai-projects/hr-dx-saas/.claude-scratch-twtest/out.css', result.css)
console.log('done')
