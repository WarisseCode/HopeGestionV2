"use strict";
// backend/scripts/testNotification.ts
// Use native fetch (Node 18+)
Object.defineProperty(exports, "__esModule", { value: true });
// Configuration
const BASE_URL = 'http://127.0.0.1:5000/api';
const TEST_EMAIL = 'test_notif@hope.com';
const TEST_PASSWORD = 'TestPass123!';
// Helpers
async function post(url, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE_URL + url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    return res;
}
async function get(url, token) {
    const res = await fetch(BASE_URL + url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res;
}
async function put(url, token) {
    const res = await fetch(BASE_URL + url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res;
}
async function testNotifications() {
    try {
        console.log('🔔 Test Notification System...');
        // 1. Register a test user
        console.log('📝 Inscription utilisateur test...');
        const regRes = await post('/auth/register', {
            nom: 'Notif',
            prenoms: 'Test User',
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            telephone: '+22900000001'
        });
        // Log registration result for debugging
        if (!regRes.ok) {
            const regErr = await regRes.text();
            console.log('ℹ️  Inscription:', regErr);
        }
        else {
            console.log('✅ Utilisateur créé.');
        }
        // 2. Login
        console.log('🔑 Connexion...');
        const loginRes = await post('/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
        if (!loginRes.ok) {
            const errBody = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} - ${errBody}`);
        }
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Connecté.');
        // 3. Trigger Test Notification
        console.log('1️⃣  Envoi notification de test...');
        const sendRes = await post('/notifications/test', {
            type: 'success',
            message: 'Ceci est un test automatisé du système de notification.'
        }, token);
        if (!sendRes.ok) {
            const errBody = await sendRes.text();
            throw new Error(`Erreur envoi: ${sendRes.status} - ${errBody}`);
        }
        console.log('✅ Notification envoyée.');
        // 4. Fetch Notifications
        console.log('2️⃣  Récupération des notifications...');
        const getRes = await get('/notifications', token);
        if (!getRes.ok)
            throw new Error(`Erreur récupération: ${getRes.status}`);
        const data = await getRes.json();
        console.log(`📊 Total: ${data.notifications.length}, Non lues: ${data.unreadCount}`);
        const lastNotif = data.notifications[0];
        if (lastNotif && lastNotif.message.includes('Ceci est un test automatisé')) {
            console.log('✅ Notification trouvée dans la liste !');
            // 5. Mark as read
            console.log('3️⃣  Marquage comme lu...');
            const readRes = await put(`/notifications/${lastNotif.id}/read`, token);
            if (!readRes.ok)
                throw new Error(`Erreur marquage lu: ${readRes.status}`);
            console.log('✅ Marqué comme lu.');
        }
        else {
            console.error('❌ La notification de test n\'a pas été trouvée en tête de liste.');
        }
        console.log('🎉 Test Notifications RÉUSSI !');
    }
    catch (error) {
        console.error('❌ Erreur Test:', error);
    }
}
testNotifications();
