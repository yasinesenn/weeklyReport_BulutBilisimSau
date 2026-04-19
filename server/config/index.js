require('dotenv').config();

// Fail-fast for production deployments (OpenShift/Kubernetes)
const requiredEnvs = [];

if (process.env.NODE_ENV === 'production') {
    requiredEnvs.push('JWT_SECRET', 'DB_ADAPTER');

    if (process.env.DB_ADAPTER === 'postgresql') {
        requiredEnvs.push('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
    }

    if (process.env.LDAP_ENABLED === 'true') {
        requiredEnvs.push('LDAP_URL', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD', 'LDAP_SEARCH_BASE');
    }
}

requiredEnvs.forEach(env => {
    if (!process.env[env]) {
        console.error(`[CRITICAL ERROR] Missing required environment variable: ${env}`);
        process.exit(1);
    }
});

module.exports = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    db: {
        adapter: process.env.DB_ADAPTER || 'json', // 'postgresql' veya 'json'
        
        // PostgreSQL Defaults
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'weekly_report',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    },
    ldap: {
        enabled: process.env.LDAP_ENABLED === 'true',
        url: process.env.LDAP_URL || 'ldap://dc.company.com',
        bindDN: process.env.LDAP_BIND_DN || '',
        bindPassword: process.env.LDAP_BIND_PASSWORD || '',
        searchBase: process.env.LDAP_SEARCH_BASE || 'dc=company,dc=com',
        searchFilter: process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
        groupAttribute: process.env.LDAP_GROUP_ATTRIBUTE || 'memberOf',
        // Optional: separate LDAP for role/group lookup (e.g. test LDAP)
        roleUrl: process.env.LDAP_ROLE_URL || '',
        roleBindDN: process.env.LDAP_ROLE_BIND_DN || '',
        roleBindPassword: process.env.LDAP_ROLE_BIND_PASSWORD || '',
        roleSearchBase: process.env.LDAP_ROLE_SEARCH_BASE || '',
        roleSearchFilter: process.env.LDAP_ROLE_SEARCH_FILTER || '(sAMAccountName={{username}})',
    },
    jwtSecret: process.env.JWT_SECRET || 'super-secret-fallback-key',
    uploadDir: process.env.UPLOAD_DIR || './uploads'
};
