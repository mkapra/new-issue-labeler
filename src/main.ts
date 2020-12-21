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

  async getConfigurationFile(configurationPath: string): Promise<string> {
    core.debug(`Get configuration file content ${configurationPath}`)
    const configurationFile = await this.client.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: configurationPath
    })
    const data: any = configurationFile.data
    if (!data.content) {
      core.setFailed(`Configuration file at ${configurationFile} not found!`)
    }

    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
}

class Issue {
  heading: string
  body: string
  repo: Repository
  client: InstanceType<typeof GitHub>
  iNumber: number

  constructor(repo: Repository, client: InstanceType<typeof GitHub>) {
    const contextIssue = github.context.payload.issue

    if (contextIssue) {
      // this.heading = issue.title
      this.heading = ''
      if (contextIssue.body) {
        this.body = contextIssue.body
      } else {
        this.body = ''
      }
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

function getLabels(configurationData: any): Map<string, string[]> {
  const labelMap: Map<string, string[]> = new Map<string, string[]>()
  const labels: any = yaml.safeLoad(configurationData)
  for (const label in labels) {
    core.debug(`getLabels(): Label: ${label}`)
    if (typeof labels[label] === 'string') {
      labelMap.set(label, [labels[label]])
    } else if (Array.isArray(labels[label])) {
      labelMap.set(label, labels[label])
    } else {
      core.setFailed(`'${label}' label is no array or string of regex`)
    }
  }

  return labelMap
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
    const configurationData: string = await repo.getConfigurationFile(
      configurationPath
    )

    core.debug(`ConfigFile getFile(): ${configurationData}`)
    const labelsMap: Map<string, string[]> = getLabels(configurationData)

    const newLabels: string[] = []
    // eslint-disable-next-line github/array-foreach
    labelsMap.forEach((regexes: string[], key: string) => {
      core.debug(`Key: ${key}, Regexes: ${regexes}`)
      for (const regex of regexes) {
        const isRegex = regex.match(/^\/(.+)\/(.*)$/)
        core.debug(`Checking regex '${regex}': ${isRegex}`)
        if (isRegex) {
          const regexpTest = RegExp(isRegex[0], isRegex[1])
          if (regexpTest.test(triggeredIssue.body)) {
            if (newLabels.find(e => e === key)) {
              newLabels.push(key)
            }
          } else {
            core.debug(`'${regex}' does not match issue body`)
          }
        }
      }
    })

    if (newLabels.length === 0) {
      core.debug(
        `Skipping issue #${triggeredIssue.iNumber}. No matching regexes found`
      )
    } else {
      core.debug(
        `Adding labels '${newLabels}' to issue #${triggeredIssue.iNumber}`
      )
      await triggeredIssue.addLabel(newLabels)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
