#!/bin/bash
set -euo pipefail
cd /mnt/c/Users/James/Documents/repo/neat_thermostat
export GIT_AUTHOR_NAME="James"
export GIT_AUTHOR_EMAIL="james194zt@users.noreply.github.com"
export GIT_COMMITTER_NAME="James"
export GIT_COMMITTER_EMAIL="james194zt@users.noreply.github.com"
git add -A
git status --short
git commit -m "Add Nest-like house intelligence (True Radiant, Auto-Schedule, Away)." -m "Preheat/early-off from a learned warm-up model, schedule learning from manual setpoints, and multi-presence Away Eco with delay. Panel Settings/Overview expose the controls."
git push origin main
git log -1 --oneline
