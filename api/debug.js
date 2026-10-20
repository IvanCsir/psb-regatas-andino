module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const results = {};

  try {
    results.nodeVersion = process.version;
    results.env = {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      AMH_USER_SET: !!process.env.AMH_USER,
      AMH_PASSWORD_SET: !!process.env.AMH_PASSWORD
    };
  } catch (e) {
    results.envError = e.message;
  }

  try {
    results.requireAmhLib = 'trying';
    const amh = require('./lib/amh.js');
    results.requireAmhLib = 'success';
    results.amhKeys = Object.keys(amh);
  } catch (e) {
    results.requireAmhLib = 'failed: ' + e.message;
    results.requireAmhLibStack = e.stack;
  }

  try {
    results.requirePuppeteerCore = 'trying';
    const p = require('puppeteer-core');
    results.requirePuppeteerCore = 'success';
  } catch (e) {
    results.requirePuppeteerCore = 'failed: ' + e.message;
  }

  try {
    results.requireSparticuz = 'trying';
    const c = require('@sparticuz/chromium');
    results.requireSparticuz = 'success';
    results.sparticuzKeys = Object.keys(c);
  } catch (e) {
    results.requireSparticuz = 'failed: ' + e.message;
    results.requireSparticuzStack = e.stack;
  }

  res.end(JSON.stringify(results, null, 2));
};
