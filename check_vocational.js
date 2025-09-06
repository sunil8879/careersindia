const fs = require("fs");
const fetch = require("node-fetch");

// Read the HTML file
const data = fs.readFileSync("top_vocational.html", "utf8");

// Extract all website URLs using regex
const websites = [...new Set(data.match(/https?:\/\/[^\s"']+/g))];

console.log("🔎 Found", websites.length, "websites in the file...");

async function checkWebsites() {
  for (let site of websites) {
    try {
      const response = await fetch(site, { method: "HEAD", timeout: 5000 });
      if (response.ok) {
        console.log("✅ WORKING:", site);
      } else {
        console.log("⚠️ ERROR:", site, "Status:", response.status);
      }
    } catch (err) {
      console.log("❌ DEAD:", site, "-", err.message);
    }
  }
}

checkWebsites();
