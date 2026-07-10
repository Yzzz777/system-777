module.exports = {
  apps: [{
    name: 'system-777',
    script: 'src/index.js',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    env: { NODE_ENV: 'production' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
  }]
};
