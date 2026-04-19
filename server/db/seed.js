const { v4: uuidv4 } = require('uuid');

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const now = new Date();
const currentWeek = getISOWeek(now);
const currentYear = now.getFullYear();

const teams = [
    { id: 'team-1', name: 'ICT-AO-NIQS', slug: 'ICT-AO-NIQS', department: 'Engineering' },
    { id: 'team-2', name: 'ICT-AO-DEVOPS', slug: 'ICT-AO-DEVOPS', department: 'Infrastructure' },
    { id: 'team-3', name: 'ICT-AO-FRONTEND', slug: 'ICT-AO-FRONTEND', department: 'Engineering' },
];

const users = [
    {
        id: 'user-1', name: 'Ahmet Yılmaz', email: 'ahmet@company.com', username: 'ahmet.yilmaz',
        password: 'demo123', teamId: 'team-1',
    },
    {
        id: 'user-2', name: 'Elif Demir', email: 'elif@company.com', username: 'elif.demir',
        password: 'demo123', teamId: 'team-1',
    },
    {
        id: 'user-3', name: 'Mehmet Kara', email: 'mehmet@company.com', username: 'mehmet.kara',
        password: 'demo123', teamId: 'team-3',
    },
    {
        id: 'user-4', name: 'Zeynep Aksoy', email: 'zeynep@company.com', username: 'zeynep.aksoy',
        password: 'demo123', teamId: 'team-3',
    },
    {
        id: 'user-5', name: 'Can Öztürk', email: 'can@company.com', username: 'can.ozturk',
        password: 'demo123', teamId: 'team-2',
    },
];

const reports = [
    {
        id: uuidv4(),
        userId: 'user-1',
        teamId: 'team-1',
        appName: 'Payment Service',
        category: 'Development',
        severity: 'info',
        importance: 1,
        content: '<p>Payment Service v2.3 deployment tamamlandı. Tüm servisler stabil çalışmakta.</p><ul><li>API response süreleri %15 iyileştirildi</li><li>Yeni retry mekanizması eklendi</li></ul>',
        week: currentWeek,
        year: currentYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        userId: 'user-2',
        teamId: 'team-1',
        appName: 'Auth Gateway',
        category: 'Security',
        severity: 'highlight',
        importance: 3,
        content: '<p><strong>OAuth 2.0 migration</strong> başarıyla tamamlandı! 🎉</p><p>Tüm servisler yeni authentication flow\'a geçirildi. Session yönetimi optimize edildi.</p>',
        week: currentWeek,
        year: currentYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        userId: 'user-3',
        teamId: 'team-3',
        appName: 'Customer Portal',
        category: 'Bug Fix',
        severity: 'lowlight',
        importance: 2,
        content: '<p>Müşteri portalında yaşanan <strong>session timeout</strong> sorunu devam etmektedir.</p><ul><li>Root cause analizi yapılıyor</li><li>Geçici workaround uygulandı</li><li>Kalıcı çözüm için backend ekibiyle koordinasyon sağlanıyor</li></ul>',
        week: currentWeek,
        year: currentYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        userId: 'user-5',
        teamId: 'team-2',
        appName: 'CI/CD Pipeline',
        category: 'Infrastructure',
        severity: 'escalation',
        importance: 3,
        content: '<p><strong>Production Kubernetes cluster</strong> üzerinde disk kapasitesi %92\'ye ulaştı.</p><p>Acil kapasite artırımı planlandı. Eski logların temizlenmesi için CronJob hazırlanıyor.</p>',
        week: currentWeek,
        year: currentYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        userId: 'user-4',
        teamId: 'team-3',
        appName: 'Admin Dashboard',
        category: 'Feature',
        severity: 'info',
        importance: 1,
        content: '<p>Admin Dashboard\'a yeni <strong>rapor filtreleme</strong> özelliği eklendi.</p><ul><li>Tarih aralığı filtresi</li><li>Departman bazlı filtreleme</li><li>CSV export desteği</li></ul>',
        week: currentWeek,
        year: currentYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const templates = [
    {
        id: 'template-1',
        userId: 'user-1',
        teamId: 'team-1',
        name: 'Haftalık Geliştirme Raporu',
        items: JSON.stringify([
            {
                id: uuidv4(),
                appName: 'Payment Service',
                severity: 'info',
                importance: 1,
                content: '<p>Geliştirme durumu ve deployment notları</p>',
            },
            {
                id: uuidv4(),
                appName: 'Auth Gateway',
                severity: 'highlight',
                importance: 2,
                content: '<p>Güvenlik güncellemeleri ve iyileştirmeler</p>',
            },
        ]),
        shareToken: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'template-2',
        userId: 'user-2',
        teamId: 'team-1',
        name: 'Sprint Review Template',
        items: JSON.stringify([
            {
                id: uuidv4(),
                appName: 'Sprint Tasks',
                severity: 'info',
                importance: 1,
                content: '<p>Bu hafta tamamlanan görevler</p><ul><li>Görev 1</li><li>Görev 2</li></ul>',
            },
        ]),
        shareToken: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

module.exports = { teams, users, reports, templates };
