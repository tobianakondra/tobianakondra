# VastoWorm.sys - Infiltration & Setup Guide

We have coded the VastoWorm engine, the dynamic SVG generator, multi-repo commit tracking, and automated GitHub Workflows. Follow these instructions to activate the cyber-virus on your live GitHub profile.

---

## 🛰️ Step 1: Create or Locate Your Profile Repository

The repository name must exactly match your GitHub username (e.g. if your username is `tobianakondra`, the repo name must be `tobianakondra`). This repository contains your special profile README.md which is shown on your public page.

If you already have a profile README repository:
1. Clone it locally or prepare to add these files to it.
2. In the README.md, insert the following placeholder tags where you want the terminal dashboard to render:
   ```markdown
   <!-- VASTOWORM:START -->
   <!-- VASTOWORM:END -->
   ```
   *Note: If you do not have these tags, the script will automatically create a fresh, full-page hacker-themed README.md on its first run.*

---

## 🔑 Step 2: Configure Workflow Permissions

For the automated bot to update your README.md and SVG, it needs permissions to commit changes back to the repository.

1. On GitHub, navigate to your profile repository.
2. Go to **Settings** → **Actions** → **General**.
3. Scroll down to the **Workflow permissions** section.
4. Select **Read and write permissions**.
5. Check the box **Allow GitHub Actions to create and approve pull requests** (optional but recommended).
6. Click **Save**.

---

## 🌐 Step 3 (Optional): Enable Private Repositories Tracking (`USER_TOKEN`)

By default, VastoWorm tracks all your **public commits** across all your public repositories using GitHub Actions' built-in `GITHUB_TOKEN`.

If you also want VastoWorm to feed on your **private repositories' commits**:
1. Go to your GitHub profile → **Settings** → **Developer settings** → **Personal access tokens** (Tokens classic or Fine-grained).
2. Generate a token with the `repo` (or read repository / metadata) scope.
3. In your profile repo, go to **Settings** → **Secrets and variables** → **Actions**.
4. Click **New repository secret**.
5. Name: `USER_TOKEN`.
6. Value: Paste your Personal Access Token.
7. Click **Add secret**.

Now, whenever you commit to *any* private or public repository, VastoWorm detects it and replicates!

---

## 📂 Step 4: Push the Project Files

The repository structure:

```text
├── .github/
│   └── workflows/
│       ├── cycle.yml               # Runs automated cron cycle updates (every 30m)
│       └── payload_receiver.yml    # Runs when visitors open issue dispatches
├── assets/
│   └── virus.svg                   # Dynamic virus dashboard image (auto-generated)
├── data/
│   ├── state.json                  # Persistent virus database (auto-updated)
│   └── issue_comment.md            # Terminal dispatch report
├── src/
│   ├── github.js                   # Telemetry interface for user-wide GitHub activity
│   ├── index.js                    # Orchestrator core
│   ├── readme.js                   # Markdown README parser and injector
│   ├── state.js                    # State mutations, multi-repo rewards & decay engine
│   └── svg.js                      # Cyberpunk SVG styling and layout renderer
├── .gitignore                      # Ignore local logs and node_modules
├── package.json                    # Package metadata
└── README.md                       # Public profile display
```

Once pushed, GitHub Actions will immediately take over the orchestration.

---

## 🎮 Step 5: Gameplay Mechanics

1. **Multi-Repo Commit Tracking & Autonomous Growth (`cycle.yml`):**
   * Runs every 30 minutes.
   * Scans your GitHub activity across **all your repositories**.
   * Commits feed the virus: **+2.5% global infection** and **+12% core integrity** per commit!
   * The virus logs which repositories you worked on directly in the terminal feed.
   * When healthy (integrity >= 50%), the virus replicates **autonomously** (+0.3% passive spread).
   * If inactive, integrity slowly decays by 1.5% per hour.
   * Syncs **Firewall Resistance** (based on repo stars) and **CPU Load** (based on open issues).

2. **Interactive Visitor Dispatch (`payload_receiver.yml`):**
   * Visitors can click dynamic badges (**Inject Payload**, **Deploy Antivirus**, **Trigger Mutation**).
   * Opens a pre-formatted GitHub issue, triggers the workflow, updates the state, replies with a terminal log, and automatically closes the issue.
