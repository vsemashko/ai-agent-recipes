/**
 * Config Format Parsers
 *
 * Generic, format-agnostic configuration parsing and serialization.
 * Supports JSON, JSONC, YAML, and TOML formats.
 */

import { parse as parseJsonc } from '@std/jsonc'
import { parse as parseYaml, stringify as stringifyYaml } from '@std/yaml'
import { parse as parseToml, stringify as stringifyToml } from '@std/toml'
import { extname } from '@std/path'

/**
 * Generic config parser interface
 */
export interface ConfigParser {
  /**
   * Parse config file content into a plain object
   */
  parse(content: string): Record<string, unknown>

  /**
   * Serialize a plain object back to config format
   */
  stringify(obj: Record<string, unknown>): string

  /**
   * Get the file extension this parser handles
   */
  getExtension(): string

  /**
   * Get the human-readable format name
   */
  getFormatName(): string
}

/**
 * JSON/JSONC Parser
 */
export class JsonParser implements ConfigParser {
  parse(content: string): Record<string, unknown> {
    try {
      return parseJsonc(content) as Record<string, unknown>
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${(error as Error).message}`)
    }
  }

  stringify(obj: Record<string, unknown>): string {
    try {
      // Use standard JSON.stringify with pretty formatting
      return JSON.stringify(obj, null, 2) + '\n'
    } catch (error) {
      throw new Error(`Failed to stringify JSON: ${(error as Error).message}`)
    }
  }

  getExtension(): string {
    return '.json'
  }

  getFormatName(): string {
    return 'JSON'
  }
}

/**
 * YAML Parser
 */
export class YamlParser implements ConfigParser {
  parse(content: string): Record<string, unknown> {
    try {
      const parsed = parseYaml(content)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('YAML must parse to an object')
      }
      return parsed as Record<string, unknown>
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${(error as Error).message}`)
    }
  }

  stringify(obj: Record<string, unknown>): string {
    try {
      return stringifyYaml(obj)
    } catch (error) {
      throw new Error(`Failed to stringify YAML: ${(error as Error).message}`)
    }
  }

  getExtension(): string {
    return '.yaml'
  }

  getFormatName(): string {
    return 'YAML'
  }
}

/**
 * TOML Parser
 */
export class TomlParser implements ConfigParser {
  parse(content: string): Record<string, unknown> {
    try {
      return parseToml(content) as Record<string, unknown>
    } catch (error) {
      throw new Error(`Failed to parse TOML: ${(error as Error).message}`)
    }
  }

  stringify(obj: Record<string, unknown>): string {
    try {
      return stringifyToml(obj)
    } catch (error) {
      throw new Error(`Failed to stringify TOML: ${(error as Error).message}`)
    }
  }

  getExtension(): string {
    return '.toml'
  }

  getFormatName(): string {
    return 'TOML'
  }
}

/**
 * Config Parser Factory
 *
 * Auto-detects format by file extension and returns appropriate parser.
 */
export class ConfigParserFactory {
  private static parsers: Map<string, ConfigParser> = new Map([
    ['.json', new JsonParser()],
    ['.jsonc', new JsonParser()],
    ['.yaml', new YamlParser()],
    ['.yml', new YamlParser()],
    ['.toml', new TomlParser()],
  ])

  /**
   * Get parser for a file based on extension
   */
  static getParser(filePath: string): ConfigParser {
    const ext = extname(filePath).toLowerCase()
    const parser = this.parsers.get(ext)

    if (!parser) {
      throw new Error(`Unsupported config format: ${ext}. Supported formats: ${Array.from(this.parsers.keys()).join(', ')}`)
    }

    return parser
  }

  /**
   * Register a custom parser for a file extension
   */
  static registerParser(extension: string, parser: ConfigParser): void {
    if (!extension.startsWith('.')) {
      extension = '.' + extension
    }
    this.parsers.set(extension.toLowerCase(), parser)
  }

  /**
   * Get all supported extensions
   */
  static getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys())
  }

  /**
   * Check if a file extension is supported
   */
  static isSupported(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase()
    return this.parsers.has(ext)
  }
}
