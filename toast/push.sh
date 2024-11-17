#!/bin/bash

set -e  # if a command fails it stops the execution
set -u  # script fails if trying to access to an undefined variable

SOURCE_BEFORE_DIRECTORY="${1}"
SOURCE_DIRECTORY="${2}"
DESTINATION_GITHUB_USERNAME="${3}"
DESTINATION_REPOSITORY_NAME="${4}"
GITHUB_SERVER="${5}"
USER_EMAIL="${6}"
USER_NAME="${7}"
DESTINATION_REPOSITORY_USERNAME="${8}"
TARGET_BRANCH="${9}"
COMMIT_MESSAGE="${10}"
TARGET_DIRECTORY="${11}"
CREATE_TARGET_BRANCH_IF_NEEDED="${12}"


mkdir --parents "$HOME/.ssh"
DEPLOY_KEY_FILE="$HOME/.ssh/deploy_key"
echo "${SSH_DEPLOY_KEY}" > "$DEPLOY_KEY_FILE"
chmod 600 "$DEPLOY_KEY_FILE"

SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/known_hosts"
ssh-keyscan -H "$GITHUB_SERVER" > "$SSH_KNOWN_HOSTS_FILE"

export GIT_SSH_COMMAND="ssh -i "$DEPLOY_KEY_FILE" -o UserKnownHostsFile=$SSH_KNOWN_HOSTS_FILE"

GIT_CMD_REPOSITORY="git@$GITHUB_SERVER:$DESTINATION_REPOSITORY_USERNAME/$DESTINATION_REPOSITORY_NAME.git"

git lfs install

git config --global user.email "$USER_EMAIL"
git config --global user.name "$USER_NAME"

ORIGIN_COMMIT="https://$GITHUB_SERVER/$GITHUB_REPOSITORY/commit/$GITHUB_SHA"
COMMIT_MESSAGE="${COMMIT_MESSAGE/ORIGIN_COMMIT/$ORIGIN_COMMIT}"
COMMIT_MESSAGE="${COMMIT_MESSAGE/\$GITHUB_REF/$GITHUB_REF}"


cd "$SOURCE_DIRECTORY"

echo "[+] Adding git commit"
git add .

echo "[+] git status:"
git status

echo "[+] git diff-index:"
# git diff-index : to avoid doing the git commit failing if there are no changes to be commit
git diff-index --quiet HEAD || git commit --message "$COMMIT_MESSAGE"

echo "[+] git push:"
git push "$GIT_CMD_REPOSITORY" "$TARGET_BRANCH"
