const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const REPORT_FILE = 'link_report.txt';
const OUTPUT_HTML_FILE = 'review_errors.html';

function getCollegeNameFromUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        // Remove www, .com, .ac, .in, .edu, .org
        let name = hostname.replace(/www\.|\.com|\.ac|\.in|\.edu|\.org/g, '');
        // Replace dashes with spaces
        name = name.replace(/-/g, ' ');
        return name;
    } catch (e) {
        return url; // Fallback to the full URL if it's not a valid URL
    }
}

function main() {
    console.log(`Reading error report from: ${REPORT_FILE}`);
    if (!fs.existsSync(REPORT_FILE)) {
        console.error(`ERROR: Report file not found! Please run the checker script first.`);
        return;
    }

    const reportContent = fs.readFileSync(REPORT_FILE, 'utf-8');
    const errorRegex = /\/\/ ERROR: (https?:\/\/[^\s\(\)]+)/g;
    let match;
    const errorLinks = [];
    while ((match = errorRegex.exec(reportContent)) !== null) {
        errorLinks.push(match[1]);
    }

    if (errorLinks.length === 0) {
        console.log('No errors found in the report. Nothing to do!');
        return;
    }

    console.log(`Found ${errorLinks.length} errors to generate a review page for.`);

    // --- GENERATE HTML ---
    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Error Review (${errorLinks.length} Errors)</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8f9fa; }
                .container { max-width: 900px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .broken-link { word-break: break-all; color: #d9534f; }
                .actions a { display: inline-block; margin-right: 10px; padding: 5px 10px; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; }
                .test-link { background-color: #f0ad4e; }
                .search-link { background-color: #5bc0de; }
                .status { width: 120px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Link Error Review</h1>
                <p><strong>${errorLinks.length}</strong> links need investigation. Use the "Search Google" button to find the correct new website.</p>
                <table>
                    <thead>
                        <tr>
                            <th>Broken URL</th>
                            <th class="status">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    errorLinks.forEach(link => {
        const collegeName = getCollegeNameFromUrl(link);
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(collegeName)}`;
        html += `
            <tr>
                <td class="broken-link">${link}</td>
                <td class="actions">
                    <a href="${link}" class="test-link" target="_blank" title="Test the original link">Test Link</a>
                    <a href="${googleSearchUrl}" class="search-link" target="_blank" title="Search for '${collegeName}'">Search Google</a>
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;

    fs.writeFileSync(OUTPUT_HTML_FILE, html);
    console.log(`\nSUCCESS! Your review page has been created.`);
    console.log(`---> Open the file named "${OUTPUT_HTML_FILE}" in your web browser to start the fast review process.`);
}

main();