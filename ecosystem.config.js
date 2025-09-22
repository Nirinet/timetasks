module.exports = {
  apps: [
    {
      name: 'timetask-api',
      script: './server/dist/index.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced features
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      
      // Graceful reload
      wait_ready: true,
      stop_exit_codes: [0],
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Node.js arguments
      node_args: '--max-old-space-size=1024',
      
      // Environment specific
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        watch: ['server/dist'],
        ignore_watch: ['node_modules', 'logs', 'uploads'],
        watch_delay: 1000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        LOG_LEVEL: 'info',
        instances: 2,
      },
      
      // Health check
      health_check: {
        interval: 30000,
        timeout: 5000,
        max_failures: 3,
        url: 'http://localhost:3000/health',
      },
    },
    {
      name: 'timetask-worker',
      script: './server/dist/workers/emailWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'email',
      },
      max_memory_restart: '500M',
      autorestart: true,
      cron_restart: '0 0 * * *', // Restart daily at midnight
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/timetask.git',
      path: '/var/www/timetask',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:all && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
    },
    staging: {
      user: 'ubuntu',
      host: 'staging.yourdomain.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/timetask.git',
      path: '/var/www/timetask-staging',
      'post-deploy': 'npm install && npm run build:all && pm2 reload ecosystem.config.js --env staging',
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
    },
  },
};