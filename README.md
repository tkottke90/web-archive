# Web Archive App

[![Build Automation](https://github.com/tkottke90/web-archive/actions/workflows/cicd.yaml/badge.svg?branch=main)](https://github.com/tkottke90/web-archive/actions/workflows/cicd.yaml)

I wanted to create a web application after the 2023 Reddit protests locked me out of access to resources I had previously saved in their platform.  Many of those resources I intended to return to at a later date but since the Sub-Reddits were shut down in protest I could not access them.

---
### Release process

The release process primarily uses Github Actions for automation.  To get started, create a new release branch with the version you wish to create and push it to Github:

```sh
git branch -b release/v*.*.*
```

