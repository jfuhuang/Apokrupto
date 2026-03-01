const GM_USERNAMES    = new Set((process.env.GM_USERNAMES    || '').split(',').map(s => s.trim()).filter(Boolean));
const ADMIN_USERNAMES = new Set((process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim()).filter(Boolean));
const JWT_SECRET      = process.env.JWT_SECRET;

module.exports = { GM_USERNAMES, ADMIN_USERNAMES, JWT_SECRET };
