const fs   = require('fs');
const path = require('path');
const { dbFileCache } = require('./cache');

const DATA = path.join(__dirname, '../../data');

function file(name) { return path.join(DATA, `${name}.json`); }

function load(name) {
  const cached = dbFileCache.get(name);
  if (cached !== undefined) return cached;
  try {
    if (!fs.existsSync(file(name))) fs.writeFileSync(file(name), '{}');
    const data = JSON.parse(fs.readFileSync(file(name), 'utf8'));
    dbFileCache.set(name, data);
    return data;
  } catch { return {}; }
}

function save(name, data) {
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2));
  dbFileCache.set(name, data);
}

function get(name, key, def = null) {
  const db = load(name);
  return key in db ? db[key] : def;
}

function set(name, key, value) {
  const db = load(name);
  db[key] = value;
  save(name, db);
}

function del(name, key) {
  const db = load(name);
  delete db[key];
  save(name, db);
}

function push(name, key, value) {
  const db  = load(name);
  const arr = Array.isArray(db[key]) ? db[key] : [];
  arr.push(value);
  db[key] = arr;
  save(name, db);
}

function all(name) { return load(name); }

module.exports = { load, save, get, set, del, push, all, file };
