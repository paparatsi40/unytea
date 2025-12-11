import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Checking database connection...\n");

    // Test connection
    await prisma.$connect();
    console.log("✅ Database connection successful!\n");

    // Check users
    const usersCount = await prisma.user.count();
    console.log(`👥 Users in database: ${usersCount}`);

    if (usersCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      console.log("Sample users:");
      users.forEach((u) => {
        console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) [${u.id}]`);
      });
    }

    console.log();

    // Check communities
    const communitiesCount = await prisma.community.count();
    console.log(`🏘️  Communities in database: ${communitiesCount}`);

    if (communitiesCount > 0) {
      const communities = await prisma.community.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          memberCount: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      console.log("Sample communities:");
      communities.forEach((c) => {
        console.log(
          `  - ${c.name} (/${c.slug}) - ${c.memberCount} members - Owner: ${c.owner.firstName} ${c.owner.lastName}`
        );
      });
    }

    console.log();

    // Check members
    const membersCount = await prisma.member.count();
    console.log(`👨‍👩‍👧‍👦 Memberships in database: ${membersCount}`);

    console.log("\n✅ Database check complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
