const Parser = require('rss-parser')
const path = require('path')
const util = require('util')
const fs = require('fs')
const writeFilePromise = util.promisify(fs.writeFile)

const converter = require('./converter')
const gitManager = require('./git-manager')
const directory = gitManager.directory
const parser = new Parser()

const rssurl = process.env.RSS_URL || console.error('RSS_URL not provided')

const run = async () => {
    await gitManager.gitClone()
    const feed = await parser.parseURL(rssurl)
    let counter = 0
    let newFiles = []
    let erroredFiles = []
    await Promise.all(feed.items.map(async (item) => {
        const markdown = await converter.getMarkdownFromUrl(item.link)
        // Trim everything after the last '-'
        const wlist = /[^A-Za-z0-9/\-()_+&\s]/g
        let fileName = item.title.split('-').pop().trim().replace(/ /g, '_')
        fileName = fileName.replace(wlist, '') + '.md'
        const filePath = path.join(directory, fileName)
        if (fs.existsSync(filePath)) {
            return
        }
        newFiles.push({
            fileName,
            date: new Date(item.pubDate),
        })
        try {
            await writeFilePromise(filePath, markdown, { flag: 'w' })
            counter++
            console.log(`done ${counter} : ${item.title}`)
        } catch (err) {
            erroredFiles.push(fileName)
            console.error(err)
            // Not throwing any errors here
        }
    }))
    if (counter > 0) {
        await gitManager.updateGitRepoWithNewFiles(newFiles)
        console.log(`${counter} new judgements added`)
    }
    if (erroredFiles.length) {
        console.error(`There are ${erroredFiles.length} new judgements not added due to parsing error`)
        console.error(erroredFiles)
    }
    if (newFiles.length === 0) {
        console.log('No new judgements')
    }
}

run()
