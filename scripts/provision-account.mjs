// Emit provisioning SQL for the existing approved owner. No sign-in code is generated here.
import {readFileSync} from 'node:fs';
const owner=process.argv[2],config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
if(!/^[a-f0-9]{64}$/.test(owner||''))throw Error('Supply the existing 64-character owner ID from the authenticated /session response. Do not generate a new ID.');
const email=config.vars.ALLOWED_EMAIL;
if(typeof email!=='string'||!email.includes('@'))throw Error('Missing approved email.');
const quote=value=>"'"+value.replaceAll("'","''")+"'",now=Date.now();
console.log('INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt") VALUES ('+[quote(owner),quote('Lampy account'),quote(email.toLowerCase()),1,now,now].join(',')+');');
