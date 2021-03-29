import * as minimatch from 'minimatch';
import { LogInfo } from '../loginfo';

const debugSetup = (process.env.DEBUG || '').split(',');

/**
 * Supress debug logs that are not match DEBUG env variable
 */
export class DebugFilter {
  transform = (info: LogInfo): LogInfo|boolean => {
    if (info.level === 'debug' && !debugSetup.some((debug) => minimatch(info.label, debug))) {
      return false;
    }
    return info;
  };
}
