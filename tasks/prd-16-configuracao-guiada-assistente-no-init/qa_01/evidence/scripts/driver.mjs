// QA driver: runs the BUILT CLI's main() in this child process with an injected TTY and scripted answers.
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [, , cli, root, answersJson, askedFile, ...extra] = process.argv;
const answers = JSON.parse(answersJson);
const { main } = await import(pathToFileURL(cli).href);
let position = 0;
const prompts = {
  async ask(question) {
    appendFileSync(askedFile, `${JSON.stringify(question)}\n`);
    const answer = answers[position];
    position += 1;
    return answer === undefined ? null : answer;
  },
};
const code = await main(['init', ...extra], { projectRoot: root, terminal: { stdinIsTty: true, stdoutIsTty: true }, prompts });
process.exitCode = code;
