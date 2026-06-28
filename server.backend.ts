import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './src/server/socket/handlers';

// MongoDB is optional — only connect if URI is provided
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[MongoDB] No MONGODB_URI set, skipping database connection');
    return;
  }
  try {
    const { connectToDatabase } = await import('./src/server/db/connection');
    await connectToDatabase();
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err);
  }
};

const port = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();

// Health check endpoint (Render uses this)
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'all-in-backend' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);

// Initialize Socket.IO with CORS for the frontend
const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Render uses HTTP polling before upgrading to WebSocket
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start
connectDB().then(() => {
  httpServer.listen(port, () => {
    console.log(`> Backend ready on port ${port}`);
    console.log(`> Accepting connections from: ${FRONTEND_URL}`);
  });
});
