import { Schema } from "effect"

export class ScraperError extends Schema.TaggedErrorClass<ScraperError>()("ScraperError", {
  status: Schema.Number,
  message: Schema.String,
  body: Schema.optionalWith(Schema.String, { exact: true }),
}) {}

export class AuthError extends Schema.TaggedErrorClass<AuthError>()("AuthError", {
  message: Schema.String,
}) {}

export class RedisError extends Schema.TaggedErrorClass<RedisError>()("RedisError", {
  message: Schema.String,
}) {}

export class BlueskyError extends Schema.TaggedErrorClass<BlueskyError>()("BlueskyError", {
  message: Schema.String,
}) {}

export class AiError extends Schema.TaggedErrorClass<AiError>()("AiError", {
  message: Schema.String,
}) {}

export type AppError =
  | ScraperError
  | AuthError
  | RedisError
  | BlueskyError
  | AiError
