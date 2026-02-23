/**
 * Settings manager for persistent user configuration.
 *
 * This module provides user-level configuration management with XDG Base Directory
 * compliance, atomic file writes, dot-notation key access, and default value support.
 * Unlike ConfigManager which tracks installation state, SettingsManager handles
 * user preferences like default installation scope, UI settings, and behavior options.
 *
 * Features:
 * - XDG Base Directory specification compliance (~/.config/gsd-opencode/settings.json)
 * - Atomic writes using temp-then-rename pattern to prevent corruption
 * - Dot-notation key access (e.g., 'ui.colors' → config.ui.colors)
 * - Default values merged with user overrides
 * - In-memory caching for performance
 *
 * @module settings
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Configuration value type.
 *
 * @typedef {string|number|boolean|Object|null} ConfigValue
 */

/**
 * Manages user configuration with XDG-compliant storage and atomic writes.
 *
 * This class provides a complete settings management solution with persistent
 * storage, dot-notation key access, and safe atomic file operations. Settings
 * are stored in ~/.config/gsd-opencode/settings.json following the XDG Base
 * Directory specification.
 *
 * @class SettingsManager
 * @example
 * const settings = new SettingsManager();
 *
 * // Get a value (returns default if not set)
 * const colors = await settings.get('ui.colors'); // true
 *
 * // Set a value using dot-notation
 * await settings.set('ui.colors', false);
 *
 * // Reset to default
 * await settings.reset('ui.colors');
 *
 * // List all settings (merged with defaults)
 * const all = await settings.list();
 *
 * // Get config file path
 * console.log(settings.getConfigPath()); // ~/.config/gsd-opencode/settings.json
 */
export class SettingsManager {
  /**
   * Creates a new SettingsManager instance.
   *
   * Initializes the configuration directory path following the XDG Base Directory
   * specification: uses XDG_CONFIG_HOME environment variable if set, otherwise
   * defaults to ~/.config. Creates the config directory on first write.
   *
   * Default values are applied when a key is not present in user configuration:
   * - 'install.defaultScope': 'global' - Default installation scope
   * - 'ui.colors': true - Enable colored output
   * - 'ui.progressBars': true - Show progress indicators
   * - 'behavior.confirmDestructive': true - Confirm before destructive operations
   * - 'logging.verbose': false - Verbose logging disabled by default
   *
   * @example
   * const settings = new SettingsManager();
   *
   * // With custom config directory (for testing)
   * process.env.XDG_CONFIG_HOME = '/tmp/test-config';
   * const testSettings = new SettingsManager();
   */
  constructor() {
    // Follow XDG Base Directory Specification
    // Priority: XDG_CONFIG_HOME env var > ~/.config
    const xdgConfig = process.env.XDG_CONFIG_HOME;
    const baseDir = xdgConfig || path.join(os.homedir(), '.config');

    this.configDir = path.join(baseDir, 'opencode', 'gsd-opencode');
    this.configPath = path.join(this.configDir, 'settings.json');

    // Default configuration values
    // These are used when a key is not present in user configuration
    // Stored as nested object to match user config structure
    this.defaults = {
      install: {
        defaultScope: 'global'
      },
      ui: {
        colors: true,
        progressBars: true
      },
      behavior: {
        confirmDestructive: true
      },
      logging: {
        verbose: false
      }
    };

    // In-memory cache for performance
    // Cache is invalidated on any write operation
    this._cache = null;
    this._cacheValid = false;
  }

  /**
   * Gets a configuration value by key.
   *
   * Retrieves the value for the specified key using dot-notation (e.g., 'ui.colors').
   * If the key is not found in user configuration, returns the default value.
   * Returns undefined if the key has no user value and no default.
   *
   * @param {string} key - Configuration key using dot-notation (e.g., 'ui.colors')
   * @returns {Promise<ConfigValue>} Configuration value, default value, or undefined
   *
   * @example
   * const settings = new SettingsManager();
   *
   * // Get with default fallback
   * const colors = await settings.get('ui.colors'); // true (default)
   *
   * await settings.set('ui.colors', false);
   * const updated = await settings.get('ui.colors'); // false (user set)
   *
   * // Get nested value
   * await settings.set('user.name', 'John');
   * const name = await settings.get('user.name'); // 'John'
   */
  async get(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    const config = await this._load();
    const value = this._getNested(config, key);

    // Return user value if set, otherwise return default
    return value !== undefined ? value : this._getNested(this.defaults, key);
  }

  /**
   * Sets a configuration value by key.
   *
   * Stores the value for the specified key using dot-notation. Creates nested
   * objects as needed. Performs an atomic write to prevent config corruption
   * if the process crashes during the write operation.
   *
   * @param {string} key - Configuration key using dot-notation (e.g., 'ui.colors')
   * @param {ConfigValue} value - Value to store
   * @returns {Promise<void>}
   * @throws {Error} If the config file cannot be written
   *
   * @example
   * const settings = new SettingsManager();
   *
   * // Set simple value
   * await settings.set('ui.colors', false);
   *
   * // Set nested value (creates intermediate objects)
   * await settings.set('user.preferences.theme', 'dark');
   *
   * // Set boolean
   * await settings.set('behavior.confirmDestructive', false);
   *
   * // Set number
   * await settings.set('output.timeout', 30);
   */
  async set(key, value) {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    const config = await this._load();
    this._setNested(config, key, value);
    await this._save(config);

    // Update cache with new config
    this._cache = config;
    this._cacheValid = true;
  }

  /**
   * Resets configuration to defaults.
   *
   * If a specific key is provided, removes that key from user configuration
   * so the default value will be used on next access. If no key is provided,
   * deletes the entire configuration file, effectively resetting all settings
   * to their defaults.
   *
   * @param {string} [key] - Specific key to reset, or omit to reset all
   * @returns {Promise<void>}
   * @throws {Error} If the config file cannot be modified
   *
   * @example
   * const settings = new SettingsManager();
   *
   * // Reset specific key to default
   * await settings.set('ui.colors', false);
   * await settings.reset('ui.colors');
   * const colors = await settings.get('ui.colors'); // true (default)
   *
   * // Reset all settings to defaults
   * await settings.reset();
   * const all = await settings.list(); // All defaults
   */
  async reset(key) {
    if (key) {
      // Reset specific key
      const config = await this._load();
      this._deleteNested(config, key);

      // If config is now empty, delete the file entirely
      if (Object.keys(config).length === 0) {
        await this._deleteConfigFile();
      } else {
        await this._save(config);
      }
    } else {
      // Reset all - delete config file
      await this._deleteConfigFile();
    }

    // Invalidate cache
    this._cacheValid = false;
    this._cache = null;
  }

  /**
   * Lists all configuration values.
   *
   * Returns all configuration settings merged with their default values.
   * User-set values override defaults. The returned object contains the
   * fully resolved configuration.
   *
   * @returns {Promise<Object>} All configuration values merged with defaults
   *
   * @example
   * const settings = new SettingsManager();
   *
   * const all = await settings.list();
   * // {
   * //   install: { defaultScope: 'global' },
   * //   ui: { colors: true, progressBars: true },
   * //   behavior: { confirmDestructive: true },
   * //   logging: { verbose: false }
   * // }
   */
  async list() {
    const config = await this._load();
    return this._deepMerge({}, this._flattenDefaults(), config);
  }

  /**
   * Gets the raw user configuration without defaults.
   *
   * Returns only the user-set configuration values, without merging defaults.
   * Useful for debugging or when you need to see exactly what the user has
   * configured versus what defaults would apply.
   *
   * @returns {Promise<Object>} User configuration only (no defaults)
   *
   * @example
   * const settings = new SettingsManager();
   *
   * // Before setting any values
   * const raw = await settings.getRaw(); // {}
   *
   * await settings.set('ui.colors', false);
   * const updated = await settings.getRaw(); // { ui: { colors: false } }
   */
  async getRaw() {
    return this._load();
  }

  /**
   * Gets the absolute path to the configuration file.
   *
   * Returns the full filesystem path where settings are stored. This follows
   * the XDG Base Directory specification and respects the XDG_CONFIG_HOME
   * environment variable.
   *
   * @returns {string} Absolute path to settings.json
   *
   * @example
   * const settings = new SettingsManager();
   *
   * console.log(settings.getConfigPath());
   * // /home/user/.config/gsd-opencode/settings.json
   * // or if XDG_CONFIG_HOME is set:
   * // /custom/path/gsd-opencode/settings.json
   */
  getConfigPath() {
    return this.configPath;
  }

  /**
   * Loads configuration from disk.
   *
   * Private method that reads and parses the configuration file. Uses an
   * in-memory cache to avoid repeated disk reads. Returns an empty object
   * if the file doesn't exist yet.
   *
   * @returns {Promise<Object>} Parsed configuration object
   * @private
   * @throws {Error} If the config file contains invalid JSON
   */
  async _load() {
    // Return cached config if valid
    if (this._cacheValid && this._cache) {
      return this._cache;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content);

      // Update cache
      this._cache = config;
      this._cacheValid = true;

      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist yet - return empty object
        this._cache = {};
        this._cacheValid = true;
        return {};
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid configuration file at ${this.configPath}: ${error.message}. ` +
          'The file may be corrupted. You can reset it with: gsd-opencode config reset --all'
        );
      }

      if (error.code === 'EACCES') {
        throw new Error(
          `Permission denied: Cannot read configuration file at ${this.configPath}. ` +
          'Check file permissions or run with appropriate privileges.'
        );
      }

      throw error;
    }
  }

  /**
   * Saves configuration to disk atomically.
   *
   * Private method that writes configuration using the atomic write pattern:
   * 1. write to a temporary file
   * 2. Rename temp file to final location
   *
   * This ensures that the configuration file is never in a partially written
   * state, even if the process crashes during the write operation.
   *
   * @param {Object} config - Configuration object to save
   * @returns {Promise<void>}
   * @private
   * @throws {Error} If the config file cannot be written
   */
  async _save(config) {
    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Atomic write: write to temp file, then rename
    // This prevents corruption if process crashes during write
    const tempPath = `${this.configPath}.tmp.${Date.now()}`;
    const content = JSON.stringify(config, null, 2);

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, this.configPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      if (error.code === 'EACCES') {
        throw new Error(
          `Permission denied: Cannot write configuration to ${this.configDir}. ` +
          'Check directory permissions or run with appropriate privileges.'
        );
      }

      if (error.code === 'ENOSPC') {
        throw new Error(
          `No space left on device: Cannot write configuration to ${this.configDir}. ` +
          'Free up disk space and try again.'
        );
      }

      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Deletes the configuration file.
   *
   * Private helper that removes the configuration file entirely.
   * Silently succeeds if the file doesn't exist.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _deleteConfigFile() {
    try {
      await fs.unlink(this.configPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist - that's fine
    }
  }

  /**
   * Gets a nested value using dot-notation key.
   *
   * Private helper that traverses an object using a dot-separated key path.
   * Returns undefined if any part of the path doesn't exist.
   *
   * @param {Object} obj - Object to traverse
   * @param {string} key - Dot-notation key (e.g., 'ui.colors')
   * @returns {ConfigValue} Value at the key path, or undefined
   * @private
   */
  _getNested(obj, key) {
    const keys = key.split('.');
    let result = obj;

    for (const k of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[k];
    }

    return result;
  }

  /**
   * Sets a nested value using dot-notation key.
   *
   * Private helper that creates intermediate objects as needed and sets
   * the value at the specified key path. Modifies the object in place.
   *
   * @param {Object} obj - Object to modify
   * @param {string} key - Dot-notation key (e.g., 'ui.colors')
   * @param {ConfigValue} value - Value to set
   * @private
   */
  _setNested(obj, key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    let target = obj;

    // Create intermediate objects as needed
    for (const k of keys) {
      if (!(k in target) || typeof target[k] !== 'object' || target[k] === null) {
        target[k] = {};
      }
      target = target[k];
    }

    target[last] = value;
  }

  /**
   * Deletes a nested value using dot-notation key.
   *
   * Private helper that removes a key from a nested object structure.
   * Silently returns if any part of the path doesn't exist.
   *
   * @param {Object} obj - Object to modify
   * @param {string} key - Dot-notation key (e.g., 'ui.colors')
   * @private
   */
  _deleteNested(obj, key) {
    const keys = key.split('.');
    const last = keys.pop();
    let target = obj;

    // Traverse to parent of target key
    for (const k of keys) {
      if (!(k in target)) {
        return;
      }
      target = target[k];
    }

    delete target[last];
  }

  /**
   * Deep merges multiple objects.
   *
   * Private helper that recursively merges source objects into the target.
   * Later sources overwrite earlier ones. Creates new objects for nested
   * merges to avoid mutating sources.
   *
   * @param {Object} target - Target object to merge into
   * @param {...Object} sources - Source objects to merge from
   * @returns {Object} Merged object (same reference as target)
   * @private
   */
  _deepMerge(target, ...sources) {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = this._deepMerge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  /**
   * Returns a copy of default configuration.
   *
   * Private helper that returns a deep copy of the default configuration
   * for merging with user config.
   *
   * @returns {Object} Deep copy of defaults
   * @private
   */
  _flattenDefaults() {
    return this._deepMerge({}, this.defaults);
  }
}

/**
 * Default export for the settings module.
 *
 * @example
 * import { SettingsManager } from './services/settings.js';
 * const settings = new SettingsManager();
 */
export default {
  SettingsManager
};
