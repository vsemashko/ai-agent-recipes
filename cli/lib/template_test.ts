import { assertEquals } from '@std/assert'
import { TemplateRenderer } from './template.ts'

Deno.test('TemplateRenderer - simple variable substitution', () => {
  const renderer = new TemplateRenderer()
  const template = 'Hello {{name}}!'
  const result = renderer.renderString(template, { name: 'World' })
  assertEquals(result, 'Hello World!')
})

Deno.test('TemplateRenderer - multiple variables', () => {
  const renderer = new TemplateRenderer()
  const template = '{{greeting}} {{name}}, today is {{day}}!'
  const result = renderer.renderString(template, {
    greeting: 'Hello',
    name: 'Alice',
    day: 'Monday',
  })
  assertEquals(result, 'Hello Alice, today is Monday!')
})

Deno.test('TemplateRenderer - conditional rendering (true)', () => {
  const renderer = new TemplateRenderer()
  const template = 'Start {{#if show}}This is shown{{/if}} End'
  const result = renderer.renderString(template, { show: true })
  assertEquals(result, 'Start This is shown End')
})

Deno.test('TemplateRenderer - conditional rendering (false)', () => {
  const renderer = new TemplateRenderer()
  const template = 'Start {{#if show}}This is hidden{{/if}} End'
  const result = renderer.renderString(template, { show: false })
  assertEquals(result, 'Start  End')
})

Deno.test('TemplateRenderer - loop over array', () => {
  const renderer = new TemplateRenderer()
  const template = '{{#each items}}- {{name}}\n{{/each}}'
  const result = renderer.renderString(template, {
    items: [
      { name: 'Item 1' },
      { name: 'Item 2' },
      { name: 'Item 3' },
    ],
  })
  assertEquals(result, '- Item 1\n- Item 2\n- Item 3\n')
})

Deno.test('TemplateRenderer - complex template', () => {
  const renderer = new TemplateRenderer()
  const template = `# {{title}}

{{#if hasDescription}}
Description: {{description}}
{{/if}}

## Items
{{#each items}}
- {{name}}: {{value}}
{{/each}}
`
  const result = renderer.renderString(template, {
    title: 'My Document',
    hasDescription: true,
    description: 'This is a test document',
    items: [
      { name: 'First', value: '1' },
      { name: 'Second', value: '2' },
    ],
  })

  const expected = `# My Document

Description: This is a test document

## Items
- First: 1
- Second: 2
`
  assertEquals(result, expected)
})

Deno.test('TemplateRenderer - missing variable (keeps placeholder)', () => {
  const renderer = new TemplateRenderer()
  const template = 'Hello {{name}}, your age is {{age}}'
  const result = renderer.renderString(template, { name: 'Bob' })
  assertEquals(result, 'Hello Bob, your age is {{age}}')
})

Deno.test('TemplateRenderer - empty array in loop', () => {
  const renderer = new TemplateRenderer()
  const template = 'Items: {{#each items}}{{name}}{{/each}}'
  const result = renderer.renderString(template, { items: [] })
  assertEquals(result, 'Items: ')
})
