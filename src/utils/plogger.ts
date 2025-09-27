import { createPinoLogger, wrap } from "@bogeychan/elysia-logger";

export const plogger = createPinoLogger()

export const wlogger = wrap(plogger, { useLevel: 'warn' });