import type { Tool } from '../../shared/types.js';
import { getTrainerMemoryDef } from '../tool-definitions.js';

/**
 * Return the in-context memory blob.
 *
 * Memory is loaded once at the start of an invocation by the loop runner and
 * exposed via `ctx.memory`. This tool is mostly here for the model's mental
 * model (so it knows it CAN re-read memory mid-loop after a write); it doesn't
 * touch the DB.
 */
export const getTrainerMemoryTool: Tool = {
  definition: getTrainerMemoryDef,
  execute: async (_input, ctx) => {
    return ctx.memory;
  },
};
