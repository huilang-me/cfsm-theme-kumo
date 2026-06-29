import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;
const MAX_PART = 15;

function parseTag(tag) {
  const match = VERSION_RE.exec(tag.trim());
  if (!match) return null;

  const version = {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    tag: tag.trim(),
  };

  if (version.minor > MAX_PART || version.patch > MAX_PART) return null;
  return version;
}

function compareVersion(a, b) {
  return (
    a.major - b.major ||
    a.minor - b.minor ||
    a.patch - b.patch
  );
}

function bumpVersion(version) {
  const next = { ...version };

  if (next.patch < MAX_PART) {
    next.patch += 1;
  } else if (next.minor < MAX_PART) {
    next.minor += 1;
    next.patch = 0;
  } else {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
  }

  return next;
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function latestVersionFromTags() {
  const rawTags = execFileSync("git", ["tag", "--list"], {
    encoding: "utf8",
  });

  return rawTags
    .split(/\r?\n/)
    .map(parseTag)
    .filter(Boolean)
    .sort(compareVersion)
    .at(-1);
}

const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const refType = process.env.GITHUB_REF_TYPE ?? "";
const refName = process.env.GITHUB_REF_NAME ?? "";
const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;

let version = packageVersion;
let tag = version;
let shouldRelease = "false";

if (refType === "tag" && VERSION_RE.test(refName)) {
  version = refName.replace(/^v/, "");
  tag = refName;
  shouldRelease = "true";
} else if (eventName === "push" && refType === "branch" && refName === "main") {
  const latest = latestVersionFromTags();
  const next = bumpVersion(latest ?? { major: 1, minor: 0, patch: -1 });
  version = formatVersion(next);
  tag = version;
  shouldRelease = "true";
}

console.log(`version=${version}`);
console.log(`tag=${tag}`);
console.log(`should_release=${shouldRelease}`);
