import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
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
  core.debug('Get token...')
  const token = core.getInput('repo-token', {required: true})
  core.debug('Get configuration-path...')
  const configurationPath = core.getInput('configuration-path', {
    required: true
  })

  core.debug('Create client...')
  const client = github.getOctokit(token)
  core.debug('Create repo object...')
  const repo = new Repository(
    github.context.repo.owner,
    github.context.repo.repo,
    client,
    token
  )

  try {
    core.debug('Create issue object...')
    const triggeredIssue = new Issue(repo, client)
    core.debug(`Get configuration file content ${configurationPath}`)
    const configurationFile = await client.repos.getContent({
      owner: repo.owner,
      repo: repo.repo,
      path: configurationPath
    })
    const data: any = configurationFile.data
    if (!data.content) {
      core.setFailed(`Configuration file at ${configurationFile} not found!`)
    }
    const configurationData = Buffer.from(data.content, 'base64').toString(
      'utf-8'
    )

    const labels = yaml.safeLoadAll(configurationData)
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
