const Git = require('simple-git/promise')
const path = require('path')
const URL = require('url')
const shell = require('shelljs')
const yaml = require('js-yaml')
const fs = require('fs')
const gitToken = process.env.GITHUB_TOKEN || console.error('No github token provided')
const gitUrl = process.env.REPO_URL || console.error('No repo url provided')
const rootTempDirectory = '/tmp'
const directory = path.join(rootTempDirectory, path.basename(gitUrl, '.git'))
const branch = 'master'

let authUrl = URL.parse(gitUrl)
authUrl.auth = gitToken + ':x-oauth-basic'
authUrl = URL.format(authUrl)
shell.rm('-rf', directory)
shell.mkdir('-p', directory)
const git = Git(directory)

const gitClone = async () => {
    try {
        await git.clone(authUrl, rootTempDirectory, ['--branch', branch || 'master'])
        console.log('Git cloned')
    } catch (err) {
        console.error('Error with git clone:', err)
        throw err
    }
}

const gitCommitAndPush = async () => {
    try {
        await git.add('.')
        let status = await git.status()
        console.log(status.files)
        await git.commit('Updated with new files')
        console.log('Git committed')
        // await git.push('origin', branch)
        console.log('Git pushed')
    } catch (err) {
        console.error('Error with commiting new files:', err)
        throw err
    }
}

const updateFileOrderInConfig = async (newFiles) => {
    // Sort new file names in order of recency
    const sortedFileNames = newFiles.sort((a, b) => {
        return b.date - a.date
    }).map(a => a.fileName)
    try {
        const configJson = yaml.safeLoad(fs.readFileSync(path.join(directory, '_config.yml'), 'utf8'))
        const sectionOrder = configJson['section_order']
        configJson['section_order'] = sortedFileNames.concat(sectionOrder)
        const configYaml = yaml.safeDump(configJson)
        fs.writeFileSync(path.join(directory, '_config.yml'), configYaml, 'utf8')
        console.log('_config.yml updated')
    } catch (err) {
        console.error('Error with updating _config.yml', err)
        throw err
    }
}

const updateGitRepoWithNewFiles = async (newFiles) => {
    try {
        await updateFileOrderInConfig(newFiles)
        await gitCommitAndPush()
    } catch (err) {
        throw err
    }
}

module.exports = {
    directory,
    updateGitRepoWithNewFiles,
    gitClone,
}
