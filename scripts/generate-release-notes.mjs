import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;
const MAX_COMMITS = 100;

const outputFile = process.argv[2] || "release-notes.md";
const repo = process.env.GITHUB_REPOSITORY || "";
const headSha = process.env.GITHUB_SHA || git(["rev-parse", "HEAD"]).trim();
const releaseTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || "";
const themeVersion = process.env.THEME_VERSION || releaseTag.replace(/^v/, "");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function ghJson(endpoint) {
  if (!repo || !process.env.GH_TOKEN) return null;

  try {
    return JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8" }));
  } catch {
    return null;
  }
}

function parseTag(tag) {
  const match = VERSION_RE.exec(tag.trim());
  if (!match) return null;
  return {
    tag: tag.trim(),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareVersion(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function previousReleaseTag() {
  const current = parseTag(releaseTag);
  const versions = git(["tag", "--list"])
    .split(/\r?\n/)
    .map(parseTag)
    .filter(Boolean)
    .filter((version) => version.tag !== releaseTag);

  if (current) {
    return versions
      .filter((version) => compareVersion(version, current) < 0)
      .sort(compareVersion)
      .at(-1)?.tag;
  }

  return versions.sort(compareVersion).at(-1)?.tag;
}

function commitUrl(sha) {
  return repo ? `https://github.com/${repo}/commit/${sha}` : "";
}

function avatar(login, size = 40) {
  return `https://github.com/${login}.png?size=${size}`;
}

function circularAvatarUrl(url, size = 72) {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&mask=circle&output=png`;
}

function firstLine(message) {
  return (message || "").split(/\r?\n/)[0].trim();
}

function escapeMarkdown(text) {
  return text.replace(/([\\`*_{}\[\]()#+.!|>])/g, "\\$1");
}

function fromApiCommit(item) {
  const login = item.author?.login || "";
  return {
    sha: item.sha,
    subject: firstLine(item.commit?.message),
    authorName: item.commit?.author?.name || login || "Unknown",
    login,
    htmlUrl: item.author?.html_url || "",
    avatarUrl: item.author?.avatar_url || (login ? avatar(login) : ""),
  };
}

function commitsFromApi(base, head) {
  if (base) {
    const compare = ghJson(`repos/${repo}/compare/${base}...${head}`);
    if (Array.isArray(compare?.commits)) {
      return compare.commits.slice(-MAX_COMMITS).map(fromApiCommit);
    }
  }

  const commits = ghJson(`repos/${repo}/commits?sha=${head}&per_page=${MAX_COMMITS}`);
  if (Array.isArray(commits)) {
    return commits.reverse().map(fromApiCommit);
  }

  return [];
}

function commitsFromGit(base, head) {
  const range = base ? `${base}..${head}` : head;
  const raw = git([
    "log",
    "--reverse",
    `--max-count=${MAX_COMMITS}`,
    "--format=%H%x1f%an%x1f%ae%x1f%s%x1e",
    range,
  ]);

  return raw
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, authorName, authorEmail, subject] = entry.split("\x1f");
      return {
        sha,
        subject,
        authorName: authorName || authorEmail || "Unknown",
        login: "",
        htmlUrl: "",
        avatarUrl: "",
      };
    });
}

function uniqueContributors(commits) {
  const map = new Map();
  for (const commit of commits) {
    const key = commit.login || commit.authorName;
    if (!key || map.has(key)) continue;
    map.set(key, commit);
  }
  return [...map.values()];
}

function formatCommit(commit) {
  const short = commit.sha.slice(0, 7);
  const link = commitUrl(commit.sha);
  const subject = escapeMarkdown(commit.subject || "No commit message");
  const author = commit.login
    ? `[@${commit.login}](${commit.htmlUrl || `https://github.com/${commit.login}`})`
    : escapeMarkdown(commit.authorName);

  return `- [\`${short}\`](${link}) ${subject} - ${author}`;
}

function formatContributor(contributor) {
  if (contributor.login) {
    const url = contributor.htmlUrl || `https://github.com/${contributor.login}`;
    const img = circularAvatarUrl(contributor.avatarUrl || avatar(contributor.login, 72));
    return `<a href="${url}" title="@${contributor.login}"><img src="${img}" width="36" height="36" alt="@${contributor.login}" /></a>`;
  }

  return `\`${escapeMarkdown(contributor.authorName)}\``;
}

const previousTag = previousReleaseTag();
let commits = commitsFromApi(previousTag, headSha);
if (commits.length === 0) commits = commitsFromGit(previousTag, headSha);
if (commits.length === 0) commits = commitsFromGit("", headSha).slice(-1);

const shortHead = headSha.slice(0, 7);
const compareText = previousTag
  ? `\`${previousTag}...${shortHead}\``
  : `initial history ending at \`${shortHead}\``;
const contributors = uniqueContributors(commits);

const lines = [
  `## Kumo ${themeVersion}`,
  "",
  "### Build",
  "",
  `- Version: \`${themeVersion}\``,
  `- Commit: [\`${shortHead}\`](${commitUrl(headSha)})`,
  `- Range: ${compareText}`,
  "",
  "### Changes",
  "",
  ...commits.map(formatCommit),
  "",
  "### Contributors",
  "",
  contributors.map(formatContributor).join(" "),
  "",
];

writeFileSync(outputFile, `${lines.join("\n").trim()}\n`);
console.log(`release notes written to ${outputFile}`);
