import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files (our demo HTML)
app.use(express.static(path.join(__dirname)));

// Serve the admin demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminDemo.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Admin Test Server is running' });
});

app.listen(PORT, () => {
  console.log(`🎯 Admin Test Server running at http://localhost:${PORT}`);
  console.log(`📊 Open http://localhost:${PORT} to test admin functionality`);
  console.log(`🔧 Make sure the backend server is running on port 8001`);
});

export default app;