/**
 * LDAP/AD Authentication Service
 * 
 * Authenticates users against Active Directory and parses their group memberships
 * to determine team and role assignments.
 * 
 * Group naming convention: "TEAM-NAME ADMIN" or "TEAM-NAME USER"
 * Example: "ICT-AO-NIQS ADMIN" → { teamSlug: "ICT-AO-NIQS", role: "admin" }
 */

const config = require('../config');

const LDAP_CONFIG = {
    enabled: config.ldap.enabled,
    url: config.ldap.url,
    bindDN: config.ldap.bindDN,
    bindPassword: config.ldap.bindPassword,
    searchBase: config.ldap.searchBase,
    searchFilter: config.ldap.searchFilter,
    groupAttribute: config.ldap.groupAttribute,
    // The suffix keywords used to parse role from group name
    adminSuffix: 'ADMIN',
    userSuffix: 'USER',
    // Optional: separate LDAP for role/group lookup
    roleUrl: config.ldap.roleUrl,
    roleBindDN: config.ldap.roleBindDN,
    roleBindPassword: config.ldap.roleBindPassword,
    roleSearchBase: config.ldap.roleSearchBase,
    roleSearchFilter: config.ldap.roleSearchFilter,
};

/**
 * Authenticate user against LDAP/AD
 * @param {string} username - sAMAccountName
 * @param {string} password - user password
 * @returns {Promise<{name, email, username, ldapGroups, teamSlug, role}>}
 */
async function ldapAuthenticate(username, password) {
    // Lazy-load ldapjs to avoid crash when not installed
    let ldap;
    try {
        ldap = require('ldapjs');
    } catch (e) {
        throw new Error('ldapjs package is not installed. Run: npm install ldapjs');
    }

    return new Promise((resolve, reject) => {
        const client = ldap.createClient({
            url: LDAP_CONFIG.url,
            connectTimeout: 5000,
            timeout: 10000,
            idleTimeout: 10000,
            reconnect: false,
        });

        let settled = false;
        const authTimeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            client.destroy();
            reject(new Error('LDAP request timed out'));
        }, 15000);

        const safeResolve = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(authTimeout);
            resolve(value);
        };

        const safeReject = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(authTimeout);
            reject(error);
        };

        client.on('error', (err) => {
            safeReject(new Error(`LDAP connection error: ${err.message}`));
        });

        // Step 1: Bind with service account to search for the user
        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (bindErr) => {
            if (bindErr) {
                client.destroy();
                return safeReject(new Error(`LDAP bind failed: ${bindErr.message}`));
            }

            // Step 2: Search for the user by sAMAccountName
            const searchFilter = LDAP_CONFIG.searchFilter.replace('{{username}}', username);
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                timeLimit: 10,
                attributes: ['cn', 'mail', 'sAMAccountName', 'userPrincipalName', LDAP_CONFIG.groupAttribute, 'displayName', 'tcorganizationalmailgroup', 'mobile'],
            };

            client.search(LDAP_CONFIG.searchBase, opts, (searchErr, searchRes) => {
                if (searchErr) {
                    client.destroy();
                    return safeReject(new Error(`LDAP search failed: ${searchErr.message}`));
                }

                let userEntry = null;

                searchRes.on('searchEntry', (entry) => {
                    userEntry = entry;
                });

                searchRes.on('error', (err) => {
                    // AD can return referral errors for cross-domain search paths.
                    // Ignore referral and continue; if no entry is found, end handler will return "User not found".
                    const isReferral = err && (
                        err.name === 'ReferralError' ||
                        err.code === 10 ||
                        String(err.message || '').toLowerCase().includes('referral')
                    );

                    if (isReferral) {
                        return;
                    }

                    client.destroy();
                    safeReject(new Error(`LDAP search error: ${err.message}`));
                });

                searchRes.on('end', () => {
                    if (!userEntry) {
                        client.destroy();
                        return safeReject(new Error('User not found in LDAP'));
                    }

                    const userDN = userEntry.dn.toString();

                    // Extract attributes once and reuse for bind fallbacks and response mapping.
                    const attrs = {};
                    if (userEntry.ppiAttributes || userEntry.attributes) {
                        const attrList = userEntry.ppiAttributes || userEntry.attributes;
                        for (const attr of attrList) {
                            attrs[attr.type] = attr.values || attr._vals?.map(v => v.toString()) || [];
                        }
                    }

                    const samAccountName = attrs.sAMAccountName?.[0] || username;
                    const userPrincipalName = attrs.userPrincipalName?.[0] || '';
                    const bindRealm = LDAP_CONFIG.bindDN.includes('@')
                        ? LDAP_CONFIG.bindDN.split('@')[1]
                        : '';
                    const samAsUpn = bindRealm ? `${samAccountName}@${bindRealm}` : '';

                    const bindCandidates = [...new Set([
                        userDN,
                        userPrincipalName,
                        samAsUpn,
                    ].filter(Boolean))];

                    const tryUserBind = (index = 0, lastErr = null) => {
                        if (index >= bindCandidates.length) {
                            if (lastErr) {
                                console.error(`[LDAP] User bind failed for all candidates (${bindCandidates.join(', ')}) - ${lastErr.message}`);
                            }
                            client.destroy();
                            return safeReject(new Error('Invalid LDAP credentials'));
                        }

                        const bindIdentity = bindCandidates[index];
                        client.bind(bindIdentity, password, (userBindErr) => {
                            if (userBindErr) {
                                return tryUserBind(index + 1, userBindErr);
                            }

                            // Handle both ldapjs v2 and v3 attribute formats
                            const getName = () => {
                                return (attrs.displayName?.[0] || attrs.cn?.[0] || username);
                            };
                            const getEmail = () => {
                                return (attrs.mail?.[0] || `${username}@company.com`);
                            };
                            const getPhone = () => {
                                return attrs.mobile?.[0] || '';
                            };
                            const getOrgTeam = () => {
                                return attrs.tcorganizationalmailgroup?.[0] || '';
                            };
                            const getGroups = () => {
                                const groups = attrs[LDAP_CONFIG.groupAttribute] || [];
                                // memberOf values are full DNs like: CN=ICT-AO-NIQS ADMIN,OU=Groups,...
                                return groups.map(dn => {
                                    const cnMatch = dn.match(/^CN=([^,]+)/i);
                                    return cnMatch ? cnMatch[1] : dn;
                                });
                            };

                            const ldapGroups = getGroups();
                            console.log(`[LDAP-AUTH] User: ${samAccountName}, Auth Groups (${ldapGroups.length}):`, JSON.stringify(ldapGroups, null, 2));

                            client.destroy();

                            // If a separate role LDAP is configured, fetch groups from there instead
                            if (LDAP_CONFIG.roleUrl) {
                                console.log(`[LDAP-ROLE] Fetching groups from role LDAP: ${LDAP_CONFIG.roleUrl}`);
                                fetchRoleLdapGroups(samAccountName).then((roleGroups) => {
                                    console.log(`[LDAP-ROLE] User: ${samAccountName}, Role Groups (${roleGroups.length}):`, JSON.stringify(roleGroups, null, 2));
                                    const { teamSlug, role } = parseTeamRole(roleGroups);

                                    safeResolve({
                                        name: getName(),
                                        email: getEmail(),
                                        phone: getPhone(),
                                        orgTeam: getOrgTeam(),
                                        username: samAccountName,
                                        ldapGroups: roleGroups,
                                        teamSlug,
                                        role,
                                    });
                                }).catch((roleErr) => {
                                    console.error(`[LDAP-ROLE] Failed to fetch role groups: ${roleErr.message}, falling back to auth groups`);
                                    const { teamSlug, role } = parseTeamRole(ldapGroups);
                                    safeResolve({
                                        name: getName(),
                                        email: getEmail(),
                                        phone: getPhone(),
                                        orgTeam: getOrgTeam(),
                                        username: samAccountName,
                                        ldapGroups,
                                        teamSlug,
                                        role,
                                    });
                                });
                            } else {
                                const { teamSlug, role } = parseTeamRole(ldapGroups);
                                safeResolve({
                                    name: getName(),
                                    email: getEmail(),
                                    phone: getPhone(),
                                    orgTeam: getOrgTeam(),
                                    username: samAccountName,
                                    ldapGroups,
                                    teamSlug,
                                    role,
                                });
                            }
                        });
                    };

                    // Step 3: Re-bind as the actual user to verify password.
                    // Some directories reject DN bind but accept UPN bind.
                    tryUserBind();
                });
            });
        });
    });
}

/**
 * Fetch groups from a separate LDAP server (role LDAP).
 * Used when auth and role lookups are on different directories.
 */
function fetchRoleLdapGroups(username) {
    const ldap = require('ldapjs');

    return new Promise((resolve, reject) => {
        const client = ldap.createClient({
            url: LDAP_CONFIG.roleUrl,
            connectTimeout: 5000,
            timeout: 10000,
            reconnect: false,
        });

        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('Role LDAP request timed out'));
        }, 15000);

        client.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`Role LDAP connection error: ${err.message}`));
        });

        const bindDN = LDAP_CONFIG.roleBindDN;
        const bindPwd = LDAP_CONFIG.roleBindPassword;

        client.bind(bindDN, bindPwd, (bindErr) => {
            if (bindErr) {
                clearTimeout(timeout);
                client.destroy();
                return reject(new Error(`Role LDAP bind failed: ${bindErr.message}`));
            }

            const filter = LDAP_CONFIG.roleSearchFilter.replace('{{username}}', username);
            const opts = {
                filter,
                scope: 'sub',
                timeLimit: 10,
                attributes: [LDAP_CONFIG.groupAttribute],
            };

            client.search(LDAP_CONFIG.roleSearchBase, opts, (searchErr, searchRes) => {
                if (searchErr) {
                    clearTimeout(timeout);
                    client.destroy();
                    return reject(new Error(`Role LDAP search failed: ${searchErr.message}`));
                }

                let userEntry = null;

                searchRes.on('searchEntry', (entry) => {
                    userEntry = entry;
                });

                searchRes.on('error', (err) => {
                    const isReferral = err && (
                        err.name === 'ReferralError' ||
                        err.code === 10 ||
                        String(err.message || '').toLowerCase().includes('referral')
                    );
                    if (!isReferral) {
                        clearTimeout(timeout);
                        client.destroy();
                        reject(new Error(`Role LDAP search error: ${err.message}`));
                    }
                });

                searchRes.on('end', () => {
                    clearTimeout(timeout);
                    client.destroy();

                    if (!userEntry) {
                        return resolve([]); // User not found in role LDAP, return empty groups
                    }

                    const attrs = {};
                    const attrList = userEntry.ppiAttributes || userEntry.attributes || [];
                    for (const attr of attrList) {
                        attrs[attr.type] = attr.values || attr._vals?.map(v => v.toString()) || [];
                    }

                    const groups = attrs[LDAP_CONFIG.groupAttribute] || [];
                    const parsed = groups.map(dn => {
                        const cnMatch = dn.match(/^CN=([^,]+)/i);
                        return cnMatch ? cnMatch[1] : dn;
                    });

                    resolve(parsed);
                });
            });
        });
    });
}

/**
 * Parse AD group names to extract team and role
 * Looks for groups matching the pattern "WEEKLY-REPORT_[TEAM]_[ROLE]"
 * 
 * Examples:
 *   "WEEKLY-REPORT_ICT-AO-NIQS_ADMIN" → { teamSlug: "ICT-AO-NIQS", role: "admin" }
 *   "WEEKLY-REPORT_ICT-AO-NIQS_USER"  → { teamSlug: "ICT-AO-NIQS", role: "user" }
 * 
 * If user has both ADMIN and USER roles, ADMIN wins.
 */
function parseTeamRole(groups) {
    let result = { teamSlug: null, role: 'user' };

    for (const group of groups) {
        const upperGroup = group.toUpperCase().trim();

        // Pattern: Starts with WEEKLY-REPORT_, then team slug, then _USER or _ADMIN
        const regex = /^WEEKLY-REPORT_([A-Z0-9-]+)_(USER|ADMIN)$/;
        const match = upperGroup.match(regex);

        if (match) {
            const [, parsedTeamSlug, parsedRole] = match;
            const newRole = parsedRole === 'ADMIN' ? 'admin' : 'user';

            if (newRole === 'admin') {
                result = { teamSlug: parsedTeamSlug, role: 'admin' };
                break; // Admin takes highest priority
            } else if (result.role !== 'admin') {
                result = { teamSlug: parsedTeamSlug, role: 'user' };
            }
        }
    }

    return result;
}

module.exports = { ldapAuthenticate, parseTeamRole, LDAP_CONFIG };
