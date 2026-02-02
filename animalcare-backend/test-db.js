// test-db.js - GECORRIGEERDE VERSIE
console.log('🔍 Database Connection Test\n');

// Load environment variables
require('dotenv').config();

console.log('1. Environment check:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ NOT SET');
if (process.env.DATABASE_URL) {
  // Show URL with password hidden
  const safeUrl = process.env.DATABASE_URL.replace(/:([^:@]*)@/, ':***@');
  console.log('   Database:', safeUrl);
}
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET');

async function testDatabase() {
  console.log('\n2. Checking if Prisma can be loaded...');
  try {
    const { PrismaClient } = require('@prisma/client');
    console.log('   ✅ Prisma module loaded');
    
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    console.log('\n3. Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('   ✅ Connected to database!');
    
    // Try a simple query
    try {
      const userCount = await prisma.user.count();
      console.log(`   📊 Found ${userCount} users in database`);
    } catch (queryError) {
      console.log('   ⚠️  Could not count users:', queryError.message);
      console.log('   This might mean the users table doesn\'t exist yet');
    }
    
    await prisma.$disconnect();
    console.log('\n🎉 All tests passed! Database is working.');
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    
    if (error.code === 'P1001') {
      console.log('   This means: Cannot connect to the database');
      console.log('   Possible causes:');
      console.log('   1. PostgreSQL is not running');
      console.log('   2. Wrong DATABASE_URL in .env');
      console.log('   3. Wrong username/password');
      console.log('   4. Database does not exist');
    } else if (error.code === 'P1012') {
      console.log('   Prisma schema error - try: npx prisma generate');
    }
    
    console.log('\n💡 Solutions:');
    console.log('   A) Start PostgreSQL in Laragon');
    console.log('   B) Check your .env file');
    console.log('   C) Run: npx prisma generate');
    console.log('   D) Run: npx prisma db push');
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testDatabase();