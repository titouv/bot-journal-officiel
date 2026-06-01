import { Layer } from "effect"
import { AppConfigLive } from "./config.ts"
import { LoggerLive } from "./logger.ts"

export const RootLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
)
