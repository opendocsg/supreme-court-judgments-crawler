const got = require('got')
const cheerio = require('cheerio')
const yaml = require('js-yaml')
const TurndownService = require('turndown')
const turndownPluginGfm = require('turndown-plugin-gfm')
const turndownService = new TurndownService({ headingStyle: 'atx' })
// strikethrough (for converting <strike>, <s>, and <del> elements)
// tables
// taskListItems
turndownService.use(turndownPluginGfm.gfm)

const getRequest = async (url) => {
    try {
        const response = await got(url)
        return response.body
    } catch (err) {
        console.error(err.response.body)
    }
}

const replaceHeaderClassesWithTags = ($, headerPrefix, maxLevel = 4, padLevel = 1) => {
    for (let i = 1; i <= maxLevel; i++) {
        $('[class^=' + headerPrefix + ']').map((i, el) => {
            // console.log($(el).text())
            const className = $(el).attr('class')
            const matches = className.match(/\d+$/)
            if (matches) {
                const classLevel = +matches[0]
                if (classLevel <= 4) {
                    el.tagName = 'h' + (classLevel + padLevel)
                }
            }
        })
    }
}

const htmlToMarkdown = (html, url) => {
    let $ = cheerio.load(html)
    let content = $('.contentsOfFile').html()
    // fallbacks
    if (!content || !content.length) {
        content = $('content').html()
    }
    if (!content || !content.length) {
        content = $('maincontent').html()
    }
    $ = cheerio.load(content)

    // Remove javascript hyperlink
    const caseId = $('.Citation').first().text().trim()
    $('[href^=javascript]').remove()

    // Remove colons from table
    $('.info-delim1').remove()

    // Set title as h1
    $('.title').get(0).tagName = 'h1'
    const title = $('.title').first().text().trim()

    // Set this as h3, so it doesnt appear in toc
    $('.Judg-Author').map((i, el) => { el.tagName = 'h3' })

    // Remove date as table
    const date = $('.Judg-Hearing-Date').text().trim()
    let dateTable = $('.Judg-Hearing-Date').closest('table')
    if (dateTable.length > 0) {
        $('.Judg-Hearing-Date').closest('table').replaceWith(date)
    }

    // Get tags
    let tags = new Set()
    $('#info-table').nextAll('p.txt-body').each((i, el) => {
        const tagline = $(el).text()
        // this is a special dash, dont replace
        tagline.split('–').forEach((tag) => {
            tags.add(tag.trim())
        })
    })
    tags = Array.from(tags)

    // Set headers based on Judge-Heading-#
    replaceHeaderClassesWithTags($, 'Judg-Heading-')

    let markdown = turndownService.turndown($.html())

    // Remove non-utf-8 characters
    markdown = markdown.replace(/\uFFFD/g, '')

    // Add source url at the bottom
    markdown += `\n\n\nSource: [link](${url})`

    let config = {
        title,
        subtitle: `${caseId} / Decision Date: ${date}`,
        tags,
    }

    console.log(config)
    config = '---\n' + yaml.safeDump(config) + '\n---\n'

    return {
        markdown,
        config,
    }
}

const getMarkdownFromUrl = async (url) => {
    const html = await getRequest(url)
    return htmlToMarkdown(html, url)
}

module.exports = {
    getRequest,
    getMarkdownFromUrl,
    htmlToMarkdown,
}
