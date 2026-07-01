

const bcrypt = require('bcryptjs');

// Configuration
const PASSWORD = 'admin12345'; // CHANGE THIS to your desired admin password
const SALT_ROUNDS = 10;

console.log('🔐 Generating Password Hash...\n');
console.log(`Password: ${PASSWORD}`);
console.log(`Salt Rounds: ${SALT_ROUNDS}\n`);

bcrypt.hash(PASSWORD, SALT_ROUNDS, (err, hash) => {
  if (err) {
    console.error('❌ Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('✅ Password Hash Generated Successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Copy this hash:\n');
  console.log(hash);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Next Steps:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Open Table Editor → admins table');
  console.log('3. Find your admin row (email: admin@gmail.com)');
  console.log('4. Click Edit on the row');
  console.log('5. Paste the hash above into the "password_hash" field');
  console.log('6. Save the changes\n');
  console.log(' You can now login with:');
  console.log(`   Email: admin@gmail.com`);
  console.log(`   Password: ${PASSWORD}\n`);
});

