#!/usr/bin/env node
// Run on the server: node manage-family.js
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, 'library.db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ library.db not found. Start the server at least once first.');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  const listMembers = () => {
    const stmt = db.prepare('SELECT id, name FROM family_members ORDER BY id');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  console.log('\n── ניהול חברי משפחה ──────────────────────');

  while (true) {
    const members = listMembers();
    console.log('\nחברים נוכחיים:');
    members.forEach(m => console.log(`  ${m.id}. ${m.name}`));

    console.log('\n1. הוסף חבר');
    console.log('2. הסר חבר');
    console.log('3. יציאה');

    const choice = (await ask('\nבחירה: ')).trim();

    if (choice === '1') {
      const name = (await ask('שם החבר החדש: ')).trim();
      if (!name) { console.log('⚠️  שם ריק — מבוטל.'); continue; }
      try {
        db.run('INSERT INTO family_members (name) VALUES (?)', [name]);
        save();
        console.log(`✅ "${name}" נוסף.`);
      } catch {
        console.log(`⚠️  "${name}" כבר קיים.`);
      }

    } else if (choice === '2') {
      const idStr = (await ask('מספר החבר להסרה: ')).trim();
      const member = members.find(m => String(m.id) === idStr);
      if (!member) { console.log('⚠️  מספר לא קיים.'); continue; }
      const confirm = (await ask(`למחוק את "${member.name}"? (כן/לא): `)).trim();
      if (confirm === 'כן') {
        db.run('DELETE FROM family_members WHERE id = ?', [member.id]);
        save();
        console.log(`✅ "${member.name}" הוסר.`);
      } else {
        console.log('בוטל.');
      }

    } else if (choice === '3') {
      break;

    } else {
      console.log('⚠️  בחירה לא תקינה.');
    }
  }

  db.close();
  rl.close();
  console.log('להתראות.');
}

main().catch(err => { console.error(err); process.exit(1); });
