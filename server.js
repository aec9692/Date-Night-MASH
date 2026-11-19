const express = require('express');
const path = require('node:path');

const app = express();
app.disable('x-powered-by');

// A small, read-only route for checking that the deployed server responds.
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', app: 'Date Night MASH' });
});

// Local development serves the same public files Vercel serves through its CDN.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Exporting the app lets Vercel run it as a function without starting a local listener.
module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Date Night MASH is running at http://localhost:${port}`);
  });
}
