#!/bin/bash

# This script creates a new, isolated workspace by cloning a GitHub repository.
# It is the first step in enabling a session-based workflow.

# Input: The full HTTPS URL of the GitHub repository to be cloned.
# Output: A unique string identifier for the newly created workspace.

# Ensure a repository URL is provided as an argument.
if [ -z "$1" ]; then
  echo "Error: Repository URL not provided."
  exit 1
fi

REPO_URL=$1
BASE_WORKSPACE_DIR="/tmp/workspaces"

# Generate a unique identifier for the workspace.
WORKSPACE_ID=$(date +%s%N)-$RANDOM
WORKSPACE_PATH="$BASE_WORKSPACE_DIR/$WORKSPACE_ID"

# Create the base directory if it doesn't exist.
mkdir -p "$BASE_WORKSPACE_DIR"

# Clone the repository into the new workspace directory.
git clone "$REPO_URL" "$WORKSPACE_PATH" > /dev/null 2>&1

# Check if the clone was successful.
if [ $? -ne 0 ]; then
  echo "Error: Failed to clone repository from $REPO_URL."
  exit 1
fi

# Return the unique workspace ID.
echo "$WORKSPACE_ID"
