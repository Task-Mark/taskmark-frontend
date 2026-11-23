/**
 * The prompt layer of `taskmark init`, kept thin so the flow can run with
 * @clack/prompts in a terminal, with defaults only (`--yes`, CI), or with a
 * scripted answer list in tests. Every prompt takes the clack options.
 */

export class CancelledError extends Error {
  constructor() {
    super("Cancelled")
    this.name = "CancelledError"
  }
}

export class MissingAnswerError extends Error {
  constructor(message) {
    super(message)
    this.name = "MissingAnswerError"
  }
}

/** @clack/prompts in the terminal. Ctrl+C on a prompt throws CancelledError. */
export async function createClackUi() {
  const clack = await import("@clack/prompts")
  const ask = async (fn, options) => {
    const value = await fn(options)
    if (clack.isCancel(value)) throw new CancelledError()
    return value
  }
  return {
    interactive: true,
    intro: (title) => clack.intro(title),
    outro: (message) => clack.outro(message),
    cancel: (message) => clack.cancel(message),
    note: (message, title) => clack.note(message, title),
    log: clack.log,
    select: (o) => ask(clack.select, o),
    multiselect: (o) => ask(clack.multiselect, o),
    confirm: (o) => ask(clack.confirm, o),
    text: (o) => ask(clack.text, o),
    password: (o) => ask(clack.password, o),
    spinner: (o = {}) =>
      clack.spinner({
        ...o,
        onCancel: o.onCancel ?? (() => {
          process.exitCode = 130
          process.exit(130)
        }),
      }),
  }
}

/**
 * Defaults only: every prompt answers with its initial / default value, and a
 * prompt without one fails with the `missing` hint (the flag to pass).
 */
export function createDefaultsUi({ out = console.log, err = console.error } = {}) {
  const line = (prefix) => (message) => out(prefix ? `${prefix} ${message}` : message)
  const need = (o) => {
    throw new MissingAnswerError(o.missing ?? `No answer for "${o.message}" without a terminal.`)
  }
  return {
    interactive: false,
    intro: line(""),
    outro: line(""),
    cancel: (m) => err(m),
    note: (message, title) => out(title ? `${title}\n${message}` : message),
    log: {
      info: line(""),
      message: line(""),
      step: line(""),
      success: line(""),
      warn: (m) => err(`Warning: ${m}`),
      warning: (m) => err(`Warning: ${m}`),
      error: (m) => err(m),
    },
    select: async (o) => (o.initialValue !== undefined ? o.initialValue : need(o)),
    multiselect: async (o) => (o.initialValues !== undefined ? [...o.initialValues] : need(o)),
    confirm: async (o) => (o.initialValue !== undefined ? o.initialValue : true),
    text: async (o) => {
      const value = o.initialValue ?? o.defaultValue
      return value !== undefined && value !== "" ? value : need(o)
    },
    password: async (o) => need(o),
    spinner: () => ({
      start: (m) => m && out(m),
      stop: (m) => m && out(m),
      message: () => {},
      error: (m) => m && err(m),
      cancel: (m) => m && err(m),
      clear: () => {},
    }),
  }
}
