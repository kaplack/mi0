const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'mi0-api',
  });
});

app.listen(PORT, () => {
  console.log(`mi0 API running on http://localhost:${PORT}`);
});
