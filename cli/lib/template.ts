export interface TemplateContext {
  [key: string]: any
}

/**
 * Simple Mustache-style template renderer
 * Supports:
 * - {{variable}} - Variable substitution
 * - {{#each items}}...{{/each}} - Loops over arrays
 * - {{#if condition}}...{{/if}} - Conditional rendering
 */
export class TemplateRenderer {
  private cache: Map<string, string> = new Map()

  /**
   * Render a template with the given context
   */
  async render(templatePath: string, context: TemplateContext): Promise<string> {
    // Load template (with caching)
    let template = this.cache.get(templatePath)
    if (!template) {
      template = await Deno.readTextFile(templatePath)
      this.cache.set(templatePath, template)
    }

    return this.renderString(template, context)
  }

  /**
   * Render a template string with the given context
   */
  renderString(template: string, context: TemplateContext): string {
    let output = template

    // Replace {{#if condition}}...{{/if}} conditionals
    output = output.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, conditionKey, content) => {
        return context[conditionKey] ? this.renderString(content, context) : ''
      },
    )

    // Replace {{#each items}}...{{/each}} for loops
    output = output.replace(
      /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayKey, itemTemplate) => {
        const items = context[arrayKey]
        if (!Array.isArray(items)) return ''
        return items
          .map((item) => {
            // Support both {{this.property}} and {{property}} in loops
            const itemContext = typeof item === 'object' ? { ...context, ...item } : { ...context, this: item }
            return this.renderString(itemTemplate, itemContext)
          })
          .join('')
      },
    )

    // Replace {{variable}} with context values (do this last)
    output = output.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = context[key]
      if (value === undefined || value === null) return match
      return String(value)
    })

    return output
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}
