/**
 * Unit tests for interactive prompt utilities
 *
 * Tests promptTypedConfirmation with various input scenarios,
 * retry logic, and cancellation handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptTypedConfirmation, promptInstallScope, promptConfirmation, promptRepairOrFresh } from '../../src/utils/interactive.js';
import * as inquirer from '@inquirer/prompts';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn()
}));

describe('promptTypedConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('returns true when user types correct word (exact match)', async () => {
      inquirer.input.mockResolvedValueOnce('uninstall');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(true);
      expect(inquirer.input).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('uninstall')
      }));
    });

    it('returns true when user types correct word with different case (case-insensitive)', async () => {
      inquirer.input.mockResolvedValueOnce('UNINSTALL');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(true);
    });

    it('returns true for mixed case input', async () => {
      inquirer.input.mockResolvedValueOnce('UnInStAlL');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(true);
    });

    it('returns false when user types incorrect word', async () => {
      inquirer.input.mockResolvedValueOnce('wrong');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(false);
      expect(inquirer.input).toHaveBeenCalledTimes(1);
    });

    it('returns false after incorrect input (no retries)', async () => {
      inquirer.input.mockResolvedValueOnce('attempt1');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(false);
    });
  });

  describe('input handling', () => {
    it('returns null when user cancels (AbortPromptError)', async () => {
      const abortError = new Error('User aborted');
      abortError.name = 'AbortPromptError';
      inquirer.input.mockRejectedValueOnce(abortError);

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBeNull();
    });

    it('handles empty string input (counts as failure)', async () => {
      inquirer.input.mockResolvedValueOnce('');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(false);
      expect(inquirer.input).toHaveBeenCalledTimes(1);
    });

    it('handles whitespace-only input (counts as failure)', async () => {
      inquirer.input.mockResolvedValueOnce('   ');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(false);
    });

    it('trims whitespace from input', async () => {
      inquirer.input.mockResolvedValueOnce('  uninstall  ');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(true);
    });

    it('throws unexpected errors', async () => {
      const unexpectedError = new Error('Network error');
      inquirer.input.mockRejectedValueOnce(unexpectedError);

      await expect(promptTypedConfirmation('Test message', 'uninstall'))
        .rejects.toThrow('Network error');
    });
  });

  describe('retry logic', () => {
    it('does not show retry prompt after incorrect input', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inquirer.input.mockResolvedValueOnce('wrong');

      await promptTypedConfirmation('Test message', 'uninstall');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('allows exactly 1 attempt before giving up', async () => {
      inquirer.input.mockResolvedValueOnce('wrong');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(false);
      expect(inquirer.input).toHaveBeenCalledTimes(1);
    });

    it('returns true on correct input', async () => {
      inquirer.input.mockResolvedValueOnce('uninstall');

      const result = await promptTypedConfirmation('Test message', 'uninstall');

      expect(result).toBe(true);
      expect(inquirer.input).toHaveBeenCalledTimes(1);
    });

    it('does not show attempt count', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inquirer.input.mockResolvedValueOnce('wrong');

      await promptTypedConfirmation('Test message', 'uninstall');

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('/'));
      consoleSpy.mockRestore();
    });
  });

  describe('custom confirmation words', () => {
    it('accepts different confirmation words', async () => {
      inquirer.input.mockResolvedValueOnce('delete');

      const result = await promptTypedConfirmation('Confirm delete', 'delete');

      expect(result).toBe(true);
    });

    it('accepts multi-word confirmation', async () => {
      inquirer.input.mockResolvedValueOnce('yes delete everything');

      const result = await promptTypedConfirmation('Confirm', 'yes delete everything');

      expect(result).toBe(true);
    });

    it('uses single attempt only', async () => {
      inquirer.input.mockResolvedValueOnce('wrong');

      await promptTypedConfirmation('Test', 'uninstall');

      expect(inquirer.input).toHaveBeenCalledTimes(1);
    });
  });

  describe('message formatting', () => {
    it('includes confirmation word in message', async () => {
      inquirer.input.mockResolvedValueOnce('uninstall');

      await promptTypedConfirmation('Warning message', 'uninstall');

      expect(inquirer.input).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('"uninstall"')
      }));
    });

    it('prepends user message to prompt', async () => {
      inquirer.input.mockResolvedValueOnce('confirm');

      await promptTypedConfirmation('Custom warning', 'confirm');

      expect(inquirer.input).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Custom warning')
      }));
    });
  });

  describe('cancellation variations', () => {
    it('returns null for AbortPromptError by name', async () => {
      const error = new Error('Cancelled');
      error.name = 'AbortPromptError';
      inquirer.input.mockRejectedValueOnce(error);

      const result = await promptTypedConfirmation('Test', 'word');

      expect(result).toBeNull();
    });

    it('returns null for cancel in message', async () => {
      const error = new Error('User cancel');
      inquirer.input.mockRejectedValueOnce(error);

      const result = await promptTypedConfirmation('Test', 'word');

      expect(result).toBeNull();
    });
  });
});

describe('promptInstallScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns global when user selects global', async () => {
    inquirer.select.mockResolvedValueOnce('global');

    const result = await promptInstallScope();

    expect(result).toBe('global');
  });

  it('returns local when user selects local', async () => {
    inquirer.select.mockResolvedValueOnce('local');

    const result = await promptInstallScope();

    expect(result).toBe('local');
  });

  it('returns null when user cancels', async () => {
    const error = new Error('Cancelled');
    error.name = 'AbortPromptError';
    inquirer.select.mockRejectedValueOnce(error);

    const result = await promptInstallScope();

    expect(result).toBeNull();
  });

  it('passes correct choices to select', async () => {
    inquirer.select.mockResolvedValueOnce('global');

    await promptInstallScope();

    expect(inquirer.select).toHaveBeenCalledWith(expect.objectContaining({
      choices: expect.arrayContaining([
        expect.objectContaining({ value: 'global' }),
        expect.objectContaining({ value: 'local' })
      ]),
      default: 'global'
    }));
  });
});

describe('promptConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when user confirms', async () => {
    inquirer.confirm.mockResolvedValueOnce(true);

    const result = await promptConfirmation('Are you sure?');

    expect(result).toBe(true);
  });

  it('returns false when user declines', async () => {
    inquirer.confirm.mockResolvedValueOnce(false);

    const result = await promptConfirmation('Are you sure?');

    expect(result).toBe(false);
  });

  it('returns null when user cancels', async () => {
    const error = new Error('Cancelled');
    error.name = 'AbortPromptError';
    inquirer.confirm.mockRejectedValueOnce(error);

    const result = await promptConfirmation('Are you sure?');

    expect(result).toBeNull();
  });

  it('uses provided message', async () => {
    inquirer.confirm.mockResolvedValueOnce(true);

    await promptConfirmation('Custom question?');

    expect(inquirer.confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Custom question?'
    }));
  });

  it('uses default value true when not specified', async () => {
    inquirer.confirm.mockResolvedValueOnce(true);

    await promptConfirmation('question?');

    expect(inquirer.confirm).toHaveBeenCalledWith(expect.objectContaining({
      default: true
    }));
  });

  it('uses provided default value', async () => {
    inquirer.confirm.mockResolvedValueOnce(false);

    await promptConfirmation('question?', false);

    expect(inquirer.confirm).toHaveBeenCalledWith(expect.objectContaining({
      default: false
    }));
  });
});

describe('promptRepairOrFresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns repair when user selects repair', async () => {
    inquirer.select.mockResolvedValueOnce('repair');

    const result = await promptRepairOrFresh();

    expect(result).toBe('repair');
  });

  it('returns fresh when user selects fresh', async () => {
    inquirer.select.mockResolvedValueOnce('fresh');

    const result = await promptRepairOrFresh();

    expect(result).toBe('fresh');
  });

  it('returns cancel when user selects cancel', async () => {
    inquirer.select.mockResolvedValueOnce('cancel');

    const result = await promptRepairOrFresh();

    expect(result).toBe('cancel');
  });

  it('returns cancel when user aborts', async () => {
    const error = new Error('Cancelled');
    error.name = 'AbortPromptError';
    inquirer.select.mockRejectedValueOnce(error);

    const result = await promptRepairOrFresh();

    expect(result).toBe('cancel');
  });

  it('defaults to repair option', async () => {
    inquirer.select.mockResolvedValueOnce('repair');

    await promptRepairOrFresh();

    expect(inquirer.select).toHaveBeenCalledWith(expect.objectContaining({
      default: 'repair'
    }));
  });

  it('includes all three options', async () => {
    inquirer.select.mockResolvedValueOnce('repair');

    await promptRepairOrFresh();

    expect(inquirer.select).toHaveBeenCalledWith(expect.objectContaining({
      choices: expect.arrayContaining([
        expect.objectContaining({ value: 'repair' }),
        expect.objectContaining({ value: 'fresh' }),
        expect.objectContaining({ value: 'cancel' })
      ])
    }));
  });
});
