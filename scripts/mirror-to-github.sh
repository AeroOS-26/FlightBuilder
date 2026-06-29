#!/usr/bin/env bash
#
# Mirror the current state of `main` to the client's GitHub repository, with
# every sync appearing as a single commit authored by XpertWebApp.
#
# Why a snapshot-per-sync (not a raw history mirror):
#   The client only ever sees their GitHub repo, and should see XpertWebApp as
#   the sole contributor. Rather than expose or rewrite Bitbucket's real
#   multi-author history, each run takes the working tree of `main` and commits
#   it onto the GitHub mirror as one clean XpertWebApp commit. GitHub keeps a
#   growing, linear history of these sync commits (normal `git pull` works for
#   the client — no force-push).
#
# Authentication: HTTPS using a GitHub fine-grained personal access token
#   (Contents: read & write on the client's repo only). The token lives ONLY in
#   the secured Bitbucket variable GITHUB_TOKEN. It is passed to git via an
#   Authorization header (http.extraheader) so it never appears in a remote URL,
#   the reflog, or the build logs.
#
# IMPORTANT — authentication vs. attribution:
#   The token decides WHO MAY PUSH. It does NOT decide who GitHub shows as the
#   author. Attribution comes from the commit's author/committer fields, which
#   this script forces to XpertWebApp below. For the commit to link to the
#   XpertWebApp GitHub profile/avatar, GIT_AUTHOR_EMAIL must be an email
#   verified on that GitHub account.
#
# Required Bitbucket repository variables (see docs/ci-github-mirror.md):
#   GITHUB_TOKEN        (secured)  Fine-grained PAT, Contents: read & write.
#   GITHUB_REPO_HTTPS              HTTPS repo URL, e.g.
#                                  https://github.com/AeroOS-26/FlightBuilder.git
#   GIT_AUTHOR_EMAIL              Email VERIFIED on XpertWebApp's GitHub account.
# Optional (sensible defaults):
#   GIT_AUTHOR_NAME    default "XpertWebApp"
#   MIRROR_BRANCH      default "main"   (target branch on GitHub)

set -euo pipefail

# --- Configuration (no secrets inlined) -------------------------------------
AUTHOR_NAME="${GIT_AUTHOR_NAME:-XpertWebApp}"
MIRROR_BRANCH="${MIRROR_BRANCH:-main}"

: "${GITHUB_TOKEN:?GITHUB_TOKEN repository variable is required}"
: "${GITHUB_REPO_HTTPS:?GITHUB_REPO_HTTPS repository variable is required}"
: "${GIT_AUTHOR_EMAIL:?GIT_AUTHOR_EMAIL repository variable is required (must be a verified email on the XpertWebApp GitHub account)}"

SRC_REF="$(git rev-parse --short HEAD)"

# --- Token auth via Authorization header (keeps token out of URLs/logs) -----
# Build a Basic auth header: GitHub accepts "x-access-token:<PAT>" base64-encoded.
# Using http.extraheader means the token never appears in the remote URL,
# `git remote -v`, the reflog, or error output.
AUTH_B64="$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 | tr -d '\n')"
git_with_auth() {
  git -c "http.extraheader=Authorization: Basic ${AUTH_B64}" "$@"
}

# Snapshot the source tree of the current main commit (source only, no history).
SRC_TREE="$(mktemp -d)"
git archive --format=tar HEAD | (cd "$SRC_TREE" && tar -xf -)

# --- Clone the GitHub mirror so we append to its history ---------------------
MIRROR_DIR="$(mktemp -d)"
if git_with_auth clone --branch "$MIRROR_BRANCH" --depth 1 "$GITHUB_REPO_HTTPS" "$MIRROR_DIR" 2>/dev/null; then
  echo "Cloned existing GitHub mirror branch '${MIRROR_BRANCH}'."
  EXISTING_MIRROR=1
else
  echo "Mirror branch '${MIRROR_BRANCH}' not found — initializing it (first sync)."
  if ! git_with_auth clone --depth 1 "$GITHUB_REPO_HTTPS" "$MIRROR_DIR" 2>/dev/null; then
    git init -q "$MIRROR_DIR"
    git -C "$MIRROR_DIR" remote add origin "$GITHUB_REPO_HTTPS"
  fi
  EXISTING_MIRROR=0
fi

cd "$MIRROR_DIR"
git config user.name "$AUTHOR_NAME"
git config user.email "$GIT_AUTHOR_EMAIL"
export GIT_AUTHOR_NAME="$AUTHOR_NAME"
export GIT_COMMITTER_NAME="$AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
# GIT_AUTHOR_EMAIL is already exported from the environment.

if [ "$EXISTING_MIRROR" -eq 0 ]; then
  git checkout -q -b "$MIRROR_BRANCH" 2>/dev/null || git checkout -q "$MIRROR_BRANCH"
fi

# Replace the working tree with the new snapshot. Remove all tracked files
# first (except .git) so deletions on main propagate, then copy the snapshot in.
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$SRC_TREE"/. .

git add -A

# Nothing changed since the last sync? Exit cleanly without an empty commit.
if git diff --cached --quiet; then
  echo "No changes since last sync — nothing to push."
  exit 0
fi

git commit -q -m "Sync Flight Builder (main @ ${SRC_REF})"

# Append (fast-forward) to the mirror branch — no force-push needed.
git_with_auth push origin "HEAD:${MIRROR_BRANCH}"

echo "Mirror complete: published main @ ${SRC_REF} to GitHub as ${AUTHOR_NAME}."
