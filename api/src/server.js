const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Orígenes permitidos
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://bi-portal.redcoast-1960ce03.southcentralus.azurecontainerapps.io',
  'https://bi-portal-prod.azurewebsites.net'
];

// Si está configurada una variable de entorno, añadirla a la lista
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

console.log('✅ CORS permitido para orígenes:', allowedOrigins);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Permitir sin origin (como móviles o requests sin referrer)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS no permitido para este origen: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const cargasRouter = require('./routes/cargas');
app.use('/api/cargas', cargasRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 bi-loader-api listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
