# Github Action - Issue Labeler

## Configuration
### Create `.github/labeler.yml` file
**Example configuration:**
```yaml
documentation:
  - '/.*(README|docs|documentation|document).*/i'
  
enhancement:
  - '/.*(add|could you|would be nice|should).*/i'
  
help wanted:
  - '/.*help.*/i'

critical:
    - '/.*(critical|urgent).*/i'
```

### Create `.github/workflows/new-issue-labeler.yml` file
```yaml
name: "Issue Labeler"
on:
  issues:
    types: [opened, edited]
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: mkapra/new-issue-labeler@v1.0
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
        configuration-path: ".github/labeler.yml"
```

## Demo
![Simple Demo](https://user-images.githubusercontent.com/34742358/102789070-ebd0ec00-43a3-11eb-83ea-95640ad8347c.png)
