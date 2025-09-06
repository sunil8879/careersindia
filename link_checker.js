const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
const chalk = require('chalk');

// --- CONFIGURATION ---
const HTML_FILE_PATH = 'top_vocational1.html'; // Make sure this matches your file name
const REPORT_FILE_PATH = 'link_report.txt';
const REQUEST_TIMEOUT = 10000; // 10 seconds

async function checkLink(url) {
    try {
        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Check for redirects by comparing original URL with the final URL
        const finalUrl = response.request.res.responseUrl;
        if (finalUrl && finalUrl !== url) {
            return { status: 'REDIRECT', original: url, final: finalUrl };
        }
        return { status: 'OK', url: url };
    } catch (error) {
        let reason = 'Unknown Error';
        if (error.code) {
            reason = `Error Code: ${error.code}`;
        } else if (error.response) {
            reason = `HTTP Status: ${error.response.status}`;
        } else {
            reason = error.message;
        }
        return { status: 'ERROR', url: url, reason: reason };
    }
}

async function main() {
    console.log(chalk.blue(`Reading links from ${HTML_FILE_PATH}...`));
    
    const html = fs.readFileSync(HTML_FILE_PATH, 'utf-8');
    const $ = cheerio.load(html);
    
    const links = [];
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            links.push(href);
        }
    });

    const uniqueLinks = [...new Set(links)];
    console.log(chalk.blue(`Found ${uniqueLinks.length} unique links to check. This will take a while...`));

    const promises = uniqueLinks.map(link => checkLink(link));
    const results = await Promise.allSettled(promises);
    
    const okLinks = [];
    const redirectedLinks = [];
    const errorLinks = [];

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const data = result.value;
            if (data.status === 'OK') okLinks.push(data);
            if (data.status === 'REDIRECT') redirectedLinks.push(data);
            if (data.status === 'ERROR') errorLinks.push(data);
        } else {
            // This would be an unexpected script error
            console.error(chalk.red('A promise was rejected:'), result.reason);
        }
    });

    console.log(chalk.green(`\n--- ANALYSIS COMPLETE ---`));
    console.log(chalk.green(`OK: ${okLinks.length}`));
    console.log(chalk.yellow(`Redirected: ${redirectedLinks.length}`));
    console.log(chalk.red(`Errors: ${errorLinks.length}`));

    // --- GENERATE REPORT ---
    let reportContent = `LINK ANALYSIS REPORT for ${HTML_FILE_PATH}\n`;
    reportContent += `==============================================\n\n`;

    reportContent += `--- REDIRECTED LINKS (${redirectedLinks.length}) ---\n`;
    reportContent += `(These are likely okay, but should be updated in your HTML)\n\n`;
    redirectedLinks.forEach(link => {
        reportContent += `FROM: ${link.original}\n  TO: ${link.final}\n\n`;
    });

    reportContent += `\n--- ERROR LINKS (${errorLinks.length}) ---\n`;
    reportContent += `(These links are broken and need manual investigation)\n\n`;
    errorLinks.forEach(link => {
        reportContent += `URL: ${link.url}\n  REASON: ${link.reason}\n\n`;
    });

    reportContent += `\n--- OK LINKS (${okLinks.length}) ---\n`;
    okLinks.forEach(link => {
        reportContent += `${link.url}\n`;
    });

    fs.writeFileSync(REPORT_FILE_PATH, reportContent);
    console.log(chalk.cyan(`\nReport saved to ${REPORT_FILE_PATH}.`));
    console.log(chalk.cyan(`Your next step is to use this report to fix your HTML file.`));
}

main();