/**
 * Manual Password Reset Script
 * 
 * Usage:
 * npx tsx scripts/reset-password.ts <email> <newPassword>
 * 
 * Example:
 * npx tsx scripts/reset-password.ts user@example.com MyNewPassword123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  try {
    console.log('\n🔐 Starting password reset process...\n');

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.error('❌ Error: User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('');

    // Hash new password
    console.log('🔒 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Password updated successfully!\n');
    console.log('🎉 You can now sign in with:');
    console.log('   Email:', user.email);
    console.log('   Password:', newPassword);
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('\n❌ Error: Missing arguments\n');
  console.log('Usage: npx tsx scripts/reset-password.ts <email> <newPassword>');
  console.log('Example: npx tsx scripts/reset-password.ts user@example.com MyNewPassword123\n');
  process.exit(1);
}

const [email, newPassword] = args;

if (newPassword.length < 8) {
  console.error('\n❌ Error: Password must be at least 8 characters long\n');
  process.exit(1);
}

// Run the reset
resetPassword(email, newPassword);
