import type { ParsedDoctorArgs } from '../argument-parser.js';
import type { CommandEnv } from './init.js';
import { renderJsonOutput } from '../output/json.js';
import { renderDoctorText } from '../output/doctor-text.js';
import { diagnoseDoctor } from '../doctor-diagnosis.js';

export async function runDoctor(args: ParsedDoctorArgs, env: CommandEnv): Promise<number> {
  const { report, now } = await diagnoseDoctor(env, args.harness);
  if (args.json) {
    renderJsonOutput(report);
  } else {
    renderDoctorText(report, { verbose: args.verbose, now });
  }
  return report.exitCode;
}
