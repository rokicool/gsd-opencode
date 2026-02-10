/**
 * Interactive prompt utilities for GSD-OpenCode CLI
 *
 * Provides user-friendly prompts for installation scope selection,
 * confirmations, and repair decisions. All prompts handle Ctrl+C
 * gracefully to ensure clean aborts with no side effects.
 *
 * @module interactive
 */

import { select, confirm } from '@inquirer/prompts';

/**
 * Prompts user to select installation scope
 *
 * Displays a select prompt with "Global" as the default option.
 * Global installs to ~/.config/opencode/, local installs to ./.opencode/
 *
 * @returns {Promise<string|null>} 'global', 'local', or null if cancelled
 * @example
 * const scope = await promptInstallScope();
 * if (scope === null) {
 *   console.log('Installation cancelled');
 *   process.exit(0);
 * }
 */
export async function promptInstallScope() {
  try {
    const answer = await select({
      message: 'Where would you like to install GSD-OpenCode?',
      choices: [
        {
          name: 'Global (~/.config/opencode/)',
          value: 'global',
          description: 'Install globally for all projects'
        },
        {
          name: 'Local (./.opencode/)',
          value: 'local',
          description: 'Install locally in current directory'
        }
      ],
      default: 'global'
    });

    return answer;
  } catch (error) {
    // Handle Ctrl+C (SIGINT) - user cancelled
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Prompts user for a yes/no confirmation
 *
 * @param {string} message - The confirmation message to display
 * @param {boolean} [defaultValue=true] - Default value if user just presses Enter
 * @returns {Promise<boolean|null>} true/false, or null if cancelled
 * @example
 * const confirmed = await promptConfirmation('Remove existing installation?', true);
 * if (confirmed === null) {
 *   console.log('Operation cancelled');
 *   process.exit(0);
 * }
 * if (confirmed) {
 *   // Proceed with removal
 * }
 */
export async function promptConfirmation(message, defaultValue = true) {
  try {
    const answer = await confirm({
      message,
      default: defaultValue
    });

    return answer;
  } catch (error) {
    // Handle Ctrl+C (SIGINT) - user cancelled
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Prompts user to choose between repairing existing installation,
 * performing a fresh install, or cancelling
 *
 * Called when a partial or broken installation is detected.
 *
 * @returns {Promise<string|null>} 'repair', 'fresh', 'cancel', or null if cancelled
 * @example
 * const choice = await promptRepairOrFresh();
 * if (choice === null || choice === 'cancel') {
 *   console.log('Installation cancelled');
 *   process.exit(0);
 * }
 * if (choice === 'repair') {
 *   // Repair existing installation
 * } else if (choice === 'fresh') {
 *   // Remove existing and perform fresh install
 * }
 */
export async function promptRepairOrFresh() {
  try {
    const answer = await select({
      message: 'Existing installation detected. What would you like to do?',
      choices: [
        {
          name: 'Repair existing installation',
          value: 'repair',
          description: 'Fix the existing installation without data loss'
        },
        {
          name: 'Fresh install (remove existing)',
          value: 'fresh',
          description: 'Remove existing and start fresh'
        },
        {
          name: 'Cancel',
          value: 'cancel',
          description: 'Abort installation'
        }
      ],
      default: 'repair'
    });

    return answer;
  } catch (error) {
    // Handle Ctrl+C (SIGINT) - user cancelled
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      return 'cancel';
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Checks if the current environment supports interactive prompts
 *
 * Returns false if stdin is not a TTY (e.g., piped input, CI environment)
 *
 * @returns {boolean} true if interactive prompts are supported
 */
export function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * Helper to handle prompt cancellation consistently
 *
 * Logs cancellation message and exits cleanly if prompts are cancelled.
 *
 * @param {string} [message='Operation cancelled'] - Message to display
 * @param {number} [exitCode=0] - Exit code (0 for clean abort)
 */
export function handleCancellation(message = 'Operation cancelled', exitCode = 0) {
  console.log(message);
  process.exit(exitCode);
}
