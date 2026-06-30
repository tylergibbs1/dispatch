# Pushing to a PR

Commands to get the working changes onto a pull request. Confirm with the user
before the first push unless they already told you to ship.

## Contents
- Pre-flight checks
- Branch, commit, push
- Open the PR
- Pushing review fixes later

---

## Pre-flight checks

```bash
git status                      # see what's staged/unstaged and the branch
git rev-parse --abbrev-ref HEAD # current branch
```

- Make sure build/tests/linters pass before shipping.
- Identify the base branch (the default branch unless the user says otherwise).

## Branch, commit, push

If you're on the default branch, branch first — never commit the work directly to
the default branch:

```bash
git checkout -b <feature-branch>
```

Stage and commit. End the commit message with the required co-author trailer:

```bash
git add -A
git commit -m "<concise summary of the change>

<optional body explaining what and why>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

Push the branch and set upstream:

```bash
git push -u origin <feature-branch>
```

## Open the PR

Use the `gh` CLI. End the PR body with the required generation trailer:

```bash
gh pr create --base <base-branch> --head <feature-branch> \
  --title "<title>" \
  --body "$(cat <<'EOF'
## Summary
- <what changed and why>

## Test plan
- <how it was verified>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Then surface the PR URL to the user:

```bash
gh pr view --json url -q .url
```

## Pushing review fixes later

After the review-and-fix workflow produces fixes, re-run build/tests, then commit
and push to the **same branch** so they land on the existing PR:

```bash
git add -A
git commit -m "fix: address review findings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push
```

Optionally summarize the review outcome as a PR comment:

```bash
gh pr comment <pr-number-or-url> --body "<confirmed / fixed / skipped summary>"
```
