const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const MAX_BACKUPS = 5;

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[data-manager] loadData error:', err && err.message ? err.message : err);
    return null;
  }
}

function pruneBackups() {
  try {
    const dir = path.dirname(DATA_FILE);
    const files = fs.readdirSync(dir);
    const backupFiles = files
      .filter(name => name.startsWith(path.basename(DATA_FILE) + '.bak.'))
      .map(name => ({
        name,
        filePath: path.join(dir, name),
        time: fs.statSync(path.join(dir, name)).birthtimeMs || fs.statSync(path.join(dir, name)).ctimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (backupFiles.length <= MAX_BACKUPS) return;

    backupFiles.slice(MAX_BACKUPS).forEach(file => {
      try {
        fs.unlinkSync(file.filePath);
      } catch (err) {
        console.warn('[data-manager] pruneBackups: could not remove', file.filePath, err && err.message ? err.message : err);
      }
    });
  } catch (err) {
    console.warn('[data-manager] pruneBackups error:', err && err.message ? err.message : err);
  }
}

function createBackup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${DATA_FILE}.bak.${timestamp}`;
    fs.copyFileSync(DATA_FILE, backupPath);
    pruneBackups();
  } catch (err) {
    console.warn('[data-manager] createBackup error:', err && err.message ? err.message : err);
  }
}

function saveData(state) {
  const tmpFile = `${DATA_FILE}.tmp`;
  try {
    if (fs.existsSync(DATA_FILE)) {
      createBackup();
    }

    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('[data-manager] saveData error:', err && err.message ? err.message : err);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (cleanupErr) {
      console.warn('[data-manager] saveData cleanup failed:', cleanupErr && cleanupErr.message ? cleanupErr.message : cleanupErr);
    }
  }
}

module.exports = { loadData, saveData, DATA_FILE };
