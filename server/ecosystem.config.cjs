module.exports = {
  apps: [
    {
      name: 'zeni-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4000,
        MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/zeni',
        JWT_SECRET: process.env.JWT_SECRET || 'change-me'
      }
    }
  ]
};
