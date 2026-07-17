const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/security');
const { corsOriginCheck } = require('./utils/corsOrigins');
const logger = require('./utils/logger');

const app = express();

// Vercel/Render sit behind a reverse proxy - trust it so req.ip and secure cookies behave correctly.
app.set('trust proxy', 1);

// --- Security & core middleware ---
app.use(helmet());
app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize()); // strips $ and . from user input to prevent MongoDB operator injection
app.use(xss()); // sanitizes user input to prevent stored/reflected XSS
app.use(hpp()); // guards against HTTP parameter pollution
app.use('/api', apiLimiter);

// --- Logging ---
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// --- Static file serving for uploaded attachments ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API routes ---
app.use('/api', routes);

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
