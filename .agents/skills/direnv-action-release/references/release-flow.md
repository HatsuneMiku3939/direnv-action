# Release Flow

Use this checklist after reading `RELEASE_RUNBOOK.md`.

1. Sync local state:
   - `git checkout master`
   - `git fetch --all --tags`
   - `git pull --ff-only origin master`
2. Validate the current tree:
   - `nvm use`
   - `npm ci`
   - `npm run all`
3. Inspect version state:
   - `git tag --sort=-version:refname | head -n 5`
   - `grep '"version":' package.json`
   - `git log <last-release-tag>..HEAD --oneline`
4. Apply the next version:
   - `npm version <next-version> --no-git-tag-version`
5. Update docs that pin the release tag, then rerun:
   - `npm run all`
6. Commit and publish:
   - `git add package.json package-lock.json README.md dist`
   - `git commit -m "chore(release): prepare <next-version-tag>"`
   - `git push origin master`
7. Tag and release:
   - `git tag -a <next-version-tag> -m "Release <next-version-tag>"`
   - `git push origin <next-version-tag>`
   - `gh release create <next-version-tag> --title "<next-version-tag>" --generate-notes`
8. Move the major tag:
   - `git tag -fa v1 -m "Update v1 to <next-version-tag>"`
   - `git push origin refs/tags/v1 --force`
9. Verify:
   - `git rev-list -n 1 <next-version-tag>`
   - `git rev-list -n 1 v1`
   - `gh release view <next-version-tag>`
