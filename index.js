const sqlite = require('sqlite');
const exec = require('child_process').exec;
const program = require('commander');

const config = require('./config');
const fetchGroups = require('./lib/fetch-groups');
const fetchMembers = require('./lib/fetch-members');

program
  .version('0.0.0')
  .option('-a, --accessToken [value]', 'Facebook access token')
  .parse(process.argv);


if(program.accessToken) {
  callMe();
} else {
  program.help();
}


async function callMe() {
  let db;

  try {
    db = await sqlite.open(config.dbName);
  } catch(err) {
    console.error('unable to connect to database: ', config.dbName);
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS fb_groups(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fb_group_id NUMERIC NOT NULL UNIQUE,
      fb_privacy TEXT NOT NULL,
      fb_bookmark_order INTEGER NOT NULL,
      timestamp DATETIME DEFAULT (datetime('now','localtime'))
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS fb_users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fb_user_id NUMERIC NOT NULL UNIQUE,
      timestamp DATETIME DEFAULT (datetime('now','localtime'))
    );

    `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS fb_groups_users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES fb_groups,
      user_id INTEGER NOT NULL REFERENCES db_users,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      timestamp DATETIME DEFAULT (datetime('now','localtime')),
      UNIQUE(group_id, user_id)
    );
    `);

  const result = await fetchGroups(program.accessToken);

  result.data.forEach(async function(gr) {
    try {
      // Insert data for all the groups there
      await db.run(`

        INSERT OR IGNORE INTO fb_groups (name, fb_group_id, fb_privacy, fb_bookmark_order)
        SELECT :name, :id, :privacy, :bookmark_order

        `, {
          ':name': gr.name,
          ':id': gr.id,
          ':privacy': gr.privacy,
          ':bookmark_order': gr.bookmark_order,
        });
    } catch(err) {
      console.error(err)
    }
  });

  // const groups = await db.all('SELECT * FROM fb_groups where fb_group_id = \'1504679289746034\'');
  // const groups = await db.all('SELECT * FROM fb_groups where id in (22, 95, 77, 36, 123, 47, 70, 66, 59, 109, 43, 45, 51, 65, 44, 99, 100, 106, 55, 24, 8, 20, 69, 6, 60, 19, 21, 139, 4, 18, 17, 118, 11, 16, 121, 122)');
  const groups = await db.all('SELECT * FROM fb_groups ');

  groups.forEach(async function(gr) {
    let membersEmmiter = await fetchMembers({
      accessToken: program.accessToken,
      groupId: gr.fb_group_id,
    });
    let chunkNum = 0;
    let totalMembers = 0;
    let prevTimestamp = new Date();

    console.log(`Processing group "${ gr.name }" with id ${gr.fb_group_id}`)

    await new Promise((res, rej) => {
      membersEmmiter.on('error', err => rej(err));
      membersEmmiter.on('end', err => res());
      membersEmmiter.on('load', async (res) => {
        const membersList = res.resp.data;
        const newTimestamp = new Date();

        chunkNum += 1;
        totalMembers += membersList.length;

        console.log(`Processing #${ chunkNum } total of ${ totalMembers } members, lasted ${ (newTimestamp - prevTimestamp) / 1000 }s from group ${ gr.name } with id ${ gr.fb_group_id }`)

        prevTimestamp = newTimestamp;

        for(let i = 0, l = membersList.length; i < l; i++) {
          let member = membersList[i];

          try {
            await db.run(`

              INSERT OR IGNORE INTO fb_users ( name, fb_user_id)
              SELECT :name, :id

              `, {
                ':name': member.name,
                ':id': member.id,
            });

            let user = await db.get(`SELECT * FROM fb_users WHERE fb_user_id = :id`, {
              ':id': member.id,
            });

            await db.run(`

              INSERT OR IGNORE INTO fb_groups_users ( group_id, user_id, is_admin)
              SELECT :group_id, :user_id, :is_admin

              `, {
                ':group_id': gr.id,
                ':user_id': user.id,
                ':is_admin': !!member.administrator,
            });
          } catch (err) {
            console.error(err)
          }
        }
      });
    });
  });



}
