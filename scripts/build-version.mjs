import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function writeBuildVersion({ root = fileURLToPath(new URL("../", import.meta.url)), env = process.env } = {}) {
  // Read only commit metadata: never serialize the build environment or secrets.
  const candidates = [env.WORKERS_CI_COMMIT_SHA, env.GITHUB_SHA].filter(value => value !== undefined && value !== "");
  let checkoutSha;
  try {
    checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    // Source archives can still build when their CI supplies the full commit SHA.
  }
  if (checkoutSha) candidates.push(checkoutSha);
  if (!candidates.length || candidates.some(value => !/^[a-f0-9]{40}$/i.test(value))) {
    throw new Error("A valid Git commit SHA is required to build M2M.");
  }
  const gitSha = candidates[0].toLowerCase();
  if (candidates.some(value => value.toLowerCase() !== gitSha)) {
    throw new Error("CI and checkout Git commit SHAs disagree.");
  }
  await mkdir(join(root, "dist"), { recursive: true });
  // Always replace cached output so a previous build's SHA cannot survive.
  await writeFile(join(root, "dist/version.js"), `export const GIT_SHA = ${JSON.stringify(gitSha)};\n`);
  return gitSha;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log("Build Git SHA: " + await writeBuildVersion());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
