const db = require('../utils/db');

function setBirthday(userId, day, month) {
  db.set('birthdays', userId, { day: parseInt(day), month: parseInt(month) });
}

function getBirthday(userId) {
  return db.get('birthdays', userId, null);
}

function clearBirthday(userId) {
  db.del('birthdays', userId);
}

function getTodayBirthdays() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const all = db.all('birthdays');
  return Object.entries(all)
    .filter(([, v]) => v && v.day === day && v.month === month)
    .map(([userId]) => userId);
}

module.exports = { setBirthday, getBirthday, clearBirthday, getTodayBirthdays };
