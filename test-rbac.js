const http = require('http');

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = {};
        if (data) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(data);
        }
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(
            { hostname: 'localhost', port: 5001, path, method, headers },
            (res) => {
                let b = '';
                res.on('data', (c) => (b += c));
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(b) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: b });
                    }
                });
            }
        );
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

const post = (p, b, t) => request('POST', p, b, t);
const get = (p, t) => request('GET', p, null, t);
const put = (p, b, t) => request('PUT', p, b, t);
const del = (p, t) => request('DELETE', p, null, t);

async function main() {
    let passed = 0;
    let failed = 0;

    function check(name, actual, expected) {
        if (actual === expected) {
            console.log(`  PASS: ${name} (status ${actual})`);
            passed++;
        } else {
            console.log(`  FAIL: ${name} — expected ${expected}, got ${actual}`);
            failed++;
        }
    }

    // Login all users
    const admin1 = await post('/api/auth/login', { email: 'elif@company.com', password: 'demo123' });
    const user1 = await post('/api/auth/login', { email: 'ahmet@company.com', password: 'demo123' });
    const admin3 = await post('/api/auth/login', { email: 'zeynep@company.com', password: 'demo123' });
    const admin2 = await post('/api/auth/login', { email: 'can@company.com', password: 'demo123' });

    console.log('Users:');
    console.log(`  Elif  — role: ${admin1.body.user.role}, team: ${admin1.body.user.teamId}`);
    console.log(`  Ahmet — role: ${user1.body.user.role}, team: ${user1.body.user.teamId}`);
    console.log(`  Zeynep — role: ${admin3.body.user.role}, team: ${admin3.body.user.teamId}`);
    console.log(`  Can   — role: ${admin2.body.user.role}, team: ${admin2.body.user.teamId}`);
    console.log('');

    // Get all reports
    const reports = await get('/api/reports', admin1.body.token);
    const allReports = reports.body;
    console.log(`Total reports: ${allReports.length}`);

    const ahmetReport = allReports.find((r) => r.userId === 'user-1'); // team-1
    const elifReport = allReports.find((r) => r.userId === 'user-2'); // team-1
    const team3Report = allReports.find((r) => r.teamId === 'team-3');
    const team2Report = allReports.find((r) => r.teamId === 'team-2');

    console.log(`  Ahmet report (team-1): ${ahmetReport?.id}`);
    console.log(`  Elif report (team-1): ${elifReport?.id}`);
    console.log(`  Team-3 report: ${team3Report?.id}`);
    console.log(`  Team-2 report: ${team2Report?.id}`);
    console.log('');

    // TEST 1: Admin (Elif, team-1) edits Ahmet's report (same team) → SHOULD SUCCEED (200)
    console.log('TEST 1: Admin edits team member report (same team)');
    const t1 = await put('/api/reports/' + ahmetReport.id, { content: '<p>Admin edited this</p>' }, admin1.body.token);
    check('Admin edit same-team report', t1.status, 200);

    // TEST 2: User (Ahmet) edits own report → SHOULD SUCCEED (200)
    console.log('TEST 2: User edits own report');
    const t2 = await put('/api/reports/' + ahmetReport.id, { content: '<p>User edited own report</p>' }, user1.body.token);
    check('User edit own report', t2.status, 200);

    // TEST 3: User (Ahmet) edits Elif's report (same team, not owner) → SHOULD FAIL (403)
    console.log('TEST 3: User edits another user report (same team)');
    const t3 = await put('/api/reports/' + elifReport.id, { content: '<p>Hacked!</p>' }, user1.body.token);
    check('User edit other user report', t3.status, 403);

    // TEST 4: Cross-team admin (Zeynep, team-3) edits team-1 report → SHOULD FAIL (403)
    console.log('TEST 4: Cross-team admin edits another team report');
    const t4 = await put('/api/reports/' + ahmetReport.id, { content: '<p>Cross-team hack!</p>' }, admin3.body.token);
    check('Cross-team admin edit', t4.status, 403);

    // TEST 5: Admin (Zeynep, team-3) edits own team report → SHOULD SUCCEED (200)
    console.log('TEST 5: Admin edits own team report');
    const t5 = await put('/api/reports/' + team3Report.id, { content: '<p>Admin edited team-3 report</p>' }, admin3.body.token);
    check('Admin edit own-team report', t5.status, 200);

    // TEST 6: User (Ahmet) deletes Elif's report → SHOULD FAIL (403)
    console.log('TEST 6: User deletes another user report');
    const t6 = await del('/api/reports/' + elifReport.id, user1.body.token);
    check('User delete other user report', t6.status, 403);

    // TEST 7: Admin (Elif) deletes Ahmet's report (same team) → SHOULD SUCCEED (200)
    console.log('TEST 7: Admin deletes team member report');
    const t7 = await del('/api/reports/' + ahmetReport.id, admin1.body.token);
    check('Admin delete same-team report', t7.status, 200);

    // TEST 8: Unauthenticated request → SHOULD FAIL (401)
    console.log('TEST 8: Unauthenticated request');
    const t8 = await get('/api/reports');
    check('Unauthenticated GET', t8.status, 401);

    console.log('');
    console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
});
