const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// === Route YouTube avec ytdl-core ===
app.post('/youtube', async (req, res) => {
  const { url } = req.body;
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Lien YouTube invalide' });
  }
  const info = await ytdl.getInfo(url);
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
  res.json({ downloadUrl: format.url });
});

// === Route téléchargement direct ===
app.post('/direct', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) throw new Error('Fichier inaccessible');
    res.json({ downloadUrl: url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === Route avec yt-dlp ===
app.post('/yt-dlp', (req, res) => {
  const { url } = req.body;
  const command = `yt-dlp -g "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ downloadUrl: stdout.trim() });
  });
});

// === Route avec Puppeteer ===
app.post('/puppeteer', async (req, res) => {
  const { url } = req.body;
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url);
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    });
    await browser.close();
    if (!videoSrc) return res.status(404).json({ error: 'Vidéo non trouvée' });
    res.json({ downloadUrl: videoSrc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Serveur vidéo opérationnel !');
});

app.listen(port, () => {
  console.log(`Serveur en ligne sur http://localhost:${port}`);
});
