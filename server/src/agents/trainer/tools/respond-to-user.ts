import {
  TrainerResponseSchema,
  type Tool,
  type TrainerResponse,
} from '../../shared/types.js';
import { respondToUserDef } from '../tool-definitions.js';

/**
 * End-of-loop tool. The loop runner uses the LAST `respond_to_user` invocation
 * as the agent's final structured response, and re-validates the input itself
 * — but we still parse here so a malformed payload errors at tool execution
 * time, surfacing it as an `is_error: true` tool_result the model can recover
 * from rather than a hard loop crash.
 */
export const respondToUserTool: Tool<unknown, TrainerResponse> = {
  definition: respondToUserDef,
  execute: async (input) => {
    return TrainerResponseSchema.parse(input);
  },
};
