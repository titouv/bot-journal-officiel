export class ScraperError {
  readonly _tag = "ScraperError"
  constructor(
    readonly status: number,
    readonly message: string,
    readonly body?: string,
  ) {}
}

export class AuthError {
  readonly _tag = "AuthError"
  constructor(readonly message: string) {}
}

export class RedisError {
  readonly _tag = "RedisError"
  constructor(readonly message: string) {}
}

export class BlueskyError {
  readonly _tag = "BlueskyError"
  constructor(readonly message: string) {}
}

export class AiError {
  readonly _tag = "AiError"
  constructor(readonly message: string) {}
}

export type AppError =
  | ScraperError
  | AuthError
  | RedisError
  | BlueskyError
  | AiError
