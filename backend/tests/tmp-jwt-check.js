// Temporary check: does browser atob() survive jsonwebtoken base64url payloads?
const jwt = require('jsonwebtoken');
const t = jwt.sign({ id: 7, role: 'admin', userType: 'admin' }, 'x'.repeat(64), { expiresIn: '15m' });
const p = t.split('.')[1];
console.log('payload b64url:', p);
console.log('contains - :', p.includes('-'));
console.log('contains _ :', p.includes('_'));

// Simulate browser atob(): strict base64, invalid chars throw InvalidCharacterError
const strictBase64 = /^[A-Za-z0-9+/]*={0,2}$/;
console.log('atob would throw InvalidCharacterError:', !strictBase64.test(p));

// Correct decode using base64url -> base64
const raw = p.replace(/-/g, '+').replace(/_/g, '/');
const padded = raw + '='.repeat((4 - raw.length % 4) % 4);
const json = Buffer.from(padded, 'base64').toString('utf8');
console.log('decoded ok:', json);