const { execFileSync } = require("node:child_process");

if (process.platform === "linux") {
  const packageName = "@rollup/rollup-linux-x64-gnu";
  try {
    require.resolve(packageName);
  } catch {
    const rollupVersion = require("rollup/package.json").version;
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    execFileSync(npm, ["install", "--no-save", "--no-package-lock", "--ignore-scripts", `${packageName}@${rollupVersion}`], {
      stdio: "inherit",
    });
  }
}
