import type { Tool } from '../../shared/types.js';

import { getUserProfileTool } from './get-user-profile.js';
import { getHealthBaselineTool } from './get-health-baseline.js';
import { getCycleStatusTool } from './get-cycle-status.js';
import { getBlockStatusTool } from './get-block-status.js';
import { getCheckInsTool } from './get-check-ins.js';
import { getWorkoutLogsSinceTool } from './get-workout-logs-since.js';
import { getMetricsSinceTool } from './get-metrics-since.js';
import { getWorkoutModificationsTool } from './get-workout-modifications.js';
import { getTrainerMemoryTool } from './get-trainer-memory.js';
import { proposeTrainingBlockTool } from './propose-training-block.js';
import { proposeNextWeekTool } from './propose-next-week.js';
import { recordPatternDetectionTool } from './record-pattern-detection.js';
import { respondToUserTool } from './respond-to-user.js';

export {
  getUserProfileTool,
  getHealthBaselineTool,
  getCycleStatusTool,
  getBlockStatusTool,
  getCheckInsTool,
  getWorkoutLogsSinceTool,
  getMetricsSinceTool,
  getWorkoutModificationsTool,
  getTrainerMemoryTool,
  proposeTrainingBlockTool,
  proposeNextWeekTool,
  recordPatternDetectionTool,
  respondToUserTool,
};

/**
 * Aggregate tool registry the loop runner consumes. Order is reads → acts →
 * end-of-loop, mirroring `allToolDefinitions` for easy diffing.
 */
export const allTools: Tool[] = [
  getUserProfileTool,
  getHealthBaselineTool,
  getCycleStatusTool,
  getBlockStatusTool,
  getCheckInsTool,
  getWorkoutLogsSinceTool,
  getMetricsSinceTool,
  getWorkoutModificationsTool,
  getTrainerMemoryTool,
  proposeTrainingBlockTool,
  proposeNextWeekTool,
  recordPatternDetectionTool,
  respondToUserTool,
];
