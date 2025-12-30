const dotenv = require('dotenv');

dotenv.config();

const parseOrigins = (origins) => {
  if (!origins) return [];
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

module.exports = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mini_matomo',
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS || ''),
  bodyLimit: '32kb',
};
