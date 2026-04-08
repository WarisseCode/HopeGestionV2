// PM2 Ecosystem Config — HopeGestionV2
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
    apps: [
        {
            name: 'hopegestion-backend',
            cwd: '/var/www/hopegestion/backend',
            script: 'dist/index.js',
            interpreter: 'node',

            // Redémarrage automatique
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,

            // Environnement production
            env_production: {
                NODE_ENV: 'production',
                PORT: 8080,
            },

            // Logs
            out_file: '/var/log/pm2/hopegestion-out.log',
            error_file: '/var/log/pm2/hopegestion-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',

            // Mémoire max avant redémarrage automatique
            max_memory_restart: '512M',
        }
    ]
};
