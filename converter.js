const got = require('got')
const cheerio = require('cheerio')
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

const getMarkdownFromUrl = async (url) => {
    const html = await getRequest(url)
    let $ = cheerio.load(html)
    let content = $('.contentsOfFile').html()
    // fallbacks
    if (!content.length) {
        content = $('content').html()
    }
    if (!content.length) {
        content = $('maincontent').html()
    }
    $ = cheerio.load(content)
    // Remove javascript hyperlink
    $('[href^=javascript]').remove()
    // Remove colons from table
    $('.info-delim1').remove()
    // Set title as h1
    $('.title').get(0).tagName = 'h1'
    // Set this as h3, so it doesnt appear in toc
    $('.Judg-Author').map((i, el) => { el.tagName = 'h3' })
    // Remove date as table
    const date = $('.Judg-Hearing-Date').text()
    let dateTable = $('.Judg-Hearing-Date').closest('table')
    if (dateTable.length > 0) {
        $('.Judg-Hearing-Date').closest('table').replaceWith(date)
    }
    // Set headers based on Judge-Heading-#
    replaceHeaderClassesWithTags($, 'Judg-Heading-')

    let markdown = turndownService.turndown($.html())

    // Remove non-utf-8 characters
    markdown = markdown.replace(/\uFFFD/g, '')

    return markdown
}

module.exports = {
    getRequest,
    getMarkdownFromUrl,
}
