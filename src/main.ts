import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import {GitHub} from '@actions/github/lib/utils'

class Repository {
  owner: string
  repo: string
  token: string
  client: InstanceType<typeof GitHub>

  constructor(
    owner: string,
    repo: string,
    client: InstanceType<typeof GitHub>,
    token: string
  ) {
    this.owner = owner
    this.repo = repo
    this.token = token
    this.client = client
  }

  getConfigurationFile(configurationPath: string): string | object | undefined {
    const labelData = yaml.safeLoad(fs.readFileSync(configurationPath, 'utf-8'))
    if (labelData) {
      return labelData
    } else {
      // TODO: Throw exception
    }
  }
}

class Issue {
  heading: string
  body: string | undefined
  repo: Repository
  client: InstanceType<typeof GitHub>
  iNumber: number

  constructor(repo: Repository, client: InstanceType<typeof GitHub>) {
    const issue = github.context.payload.issue

    if (issue) {
      // this.heading = issue.title
      this.heading = ''
      this.body = issue.body
    } else {
      // eslint-disable-next-line no-throw-literal
      throw 'Issue not found'
    }

    this.repo = repo
    this.client = client
    this.iNumber = github.context.issue.number
  }

  async addLabel(newLabels: string[]): Promise<void> {
    this.client.issues.addLabels()
    await this.client.issues.addLabels({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.iNumber,
      labels: newLabels
    })
  }
}

async function run(): Promise<void> {
  const token = core.getInput('repo-token', {required: true})
  const configurationPath = core.getInput('configuration-path', {
    required: true
  })

  const client = github.getOctokit(token)
  const repo = new Repository(
    github.context.repo.owner,
    github.context.repo.repo,
    client,
    token
  )

  try {
    const triggeredIssue = new Issue(repo, client)
    const labels = yaml.safeLoadAll(fs.readFileSync(configurationPath, 'utf-8'))
    for (const parsed in labels[0]) {
      const regexes = labels[0][parsed]
      for (const regex in regexes) {
        const isRegex = regex.match(/^\/(.+)\/(.*)$/)
        if (isRegex) {
          // TODO: check for matching regex
          const matchRegex = new RegExp(/isRegex[0]/, isRegex[1])
          if (matchRegex.test(regex)) {
            await triggeredIssue.addLabel([regex])
          } else {
            core.debug(
              `Regex '${regex}' does not match the issue body. Skipping...`
            )
          }
        } else {
          core.debug(`Skipping '${regex}' because it is no regex...}`)
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
