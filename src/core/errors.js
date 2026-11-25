export class PromptRefineryError extends Error {
  constructor(code, message, { status = 400, details, cause } = {}) {
    super(message, { cause });
    this.name = 'PromptRefineryError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export class ConfigError extends PromptRefineryError {
  constructor(message, details) {
    super('CONFIG_ERROR', message, { status: 500, details });
    this.name = 'ConfigError';
  }
}

export class ProviderError extends PromptRefineryError {
  constructor(message, { status = 502, details, cause } = {}) {
    super('PROVIDER_ERROR', message, { status, details, cause });
    this.name = 'ProviderError';
  }
}

export function isPromptRefineryError(error) {
  return error instanceof PromptRefineryError;
}

export function toPublicError(error) {
  if (error instanceof PromptRefineryError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  };
}
