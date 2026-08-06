const { defineConfig } = require("cypress");
const { install, computeExecutablePath, resolveBuildId, detectBrowserPlatform, Browser } = require("@puppeteer/browsers");
const path = require("path");
const os = require("os");
const fs = require("fs");

const extensionPath = path.join(__dirname, "extension");

// Stable-channel system Chrome silently restricts --load-extension (a
// relatively recent anti-malware hardening measure — CLI-flag extension
// side-loading is a known abuse vector), which breaks unpacked-extension
// testing regardless of headless/headed: the extension registers no error,
// simply never runs. "Chrome for Testing" is Google's separate distribution
// built specifically for automation and isn't subject to that restriction.
// Puppeteer bundles its own copy of it for exactly this reason;
// @puppeteer/browsers is just the binary-fetching piece of that, without
// pulling in the full browser-automation API as a dependency.
async function ensureChromeForTesting() {
  const platform = detectBrowserPlatform();
  const buildId = await resolveBuildId(Browser.CHROME, platform, "stable");
  const cacheDir = path.join(os.homedir(), ".cache", "puppeteer");
  const executablePath = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir });
  if (!fs.existsSync(executablePath)) {
    await install({ browser: Browser.CHROME, buildId, cacheDir });
  }
  return { executablePath, buildId };
}

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    supportFile: false,
    async setupNodeEvents(on, config) {
      const { executablePath, buildId } = await ensureChromeForTesting();

      config.browsers = config.browsers.concat({
        name: "chrome-for-testing",
        family: "chromium",
        channel: "stable",
        displayName: "Chrome for Testing",
        version: buildId,
        path: executablePath,
        majorVersion: buildId.split(".")[0],
      });

      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium" && browser.name !== "electron") {
          launchOptions.args.push(`--disable-extensions-except=${extensionPath}`);
          launchOptions.args.push(`--load-extension=${extensionPath}`);
        }
        return launchOptions;
      });

      return config;
    },
  },
});
