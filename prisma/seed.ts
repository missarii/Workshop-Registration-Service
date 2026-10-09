import { PrismaClient, Role, WorkshopStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Idempotency guard: the API entrypoint runs this seed on every boot,
  // so it must be a safe no-op when data already exists.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('⏭️  Database already seeded — skipping.');
    return;
  }

  // Create locations
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc-downtown' },
      update: {},
      create: {
        id: 'loc-downtown',
        name: 'Downtown Centre',
        address: '12 High Street, City Centre, CC1 1AA',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc-northside' },
      update: {},
      create: {
        id: 'loc-northside',
        name: 'Northside Hub',
        address: '45 North Avenue, Northside, NS2 3BB',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc-eastpark' },
      update: {},
      create: {
        id: 'loc-eastpark',
        name: 'East Park Studio',
        address: '78 Park Road, Eastside, EP4 5CC',
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create users
  const adminPassword = await argon2.hash('Admin@123456');
  const managerPassword = await argon2.hash('Manager@123456');
  const staffPassword = await argon2.hash('Staff@123456');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@workshop.local' },
    update: {},
    create: {
      id: 'user-admin',
      name: 'System Admin',
      email: 'admin@workshop.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@workshop.local' },
    update: {},
    create: {
      id: 'user-manager',
      name: 'Jane Manager',
      email: 'manager@workshop.local',
      passwordHash: managerPassword,
      role: Role.MANAGER,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: 'alice@workshop.local' },
    update: {},
    create: {
      id: 'user-staff-1',
      name: 'Alice Smith',
      email: 'alice@workshop.local',
      passwordHash: staffPassword,
      role: Role.STAFF,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'bob@workshop.local' },
    update: {},
    create: {
      id: 'user-staff-2',
      name: 'Bob Jones',
      email: 'bob@workshop.local',
      passwordHash: staffPassword,
      role: Role.STAFF,
    },
  });

  console.log(`✅ Created users: ${[admin, manager, staff1, staff2].map((u) => u.email).join(', ')}`);

  // Create sample workshops
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));

  const workshops = [
    {
      id: 'ws-pottery-001',
      code: 'POT-001',
      title: 'Introduction to Pottery',
      description: 'Learn the fundamentals of pottery throwing and hand-building techniques.',
      instructor: 'Maria Chen',
      locationId: locations[2].id,
      startsAt: new Date(nextMonday.getTime() + 9 * 60 * 60 * 1000),
      endsAt: new Date(nextMonday.getTime() + 12 * 60 * 60 * 1000),
      capacity: 12,
      reservedSeats: 0,
      status: WorkshopStatus.SCHEDULED,
    },
    {
      id: 'ws-coding-001',
      code: 'COD-001',
      title: 'Python for Beginners',
      description: 'A hands-on introduction to Python programming for complete beginners.',
      instructor: 'David Park',
      locationId: locations[0].id,
      startsAt: new Date(nextMonday.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endsAt: new Date(nextMonday.getTime() + 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000),
      capacity: 20,
      reservedSeats: 0,
      status: WorkshopStatus.SCHEDULED,
    },
    {
      id: 'ws-fitness-001',
      code: 'FIT-001',
      title: 'Morning Yoga Flow',
      description: 'A gentle morning yoga session for all levels, focusing on flexibility and mindfulness.',
      instructor: 'Sarah Johnson',
      locationId: locations[1].id,
      startsAt: new Date(nextMonday.getTime() + 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
      endsAt: new Date(nextMonday.getTime() + 2 * 24 * 60 * 60 * 1000 + 8.5 * 60 * 60 * 1000),
      capacity: 15,
      reservedSeats: 0,
      status: WorkshopStatus.SCHEDULED,
    },
    {
      id: 'ws-cooking-001',
      code: 'CKG-001',
      title: 'Italian Cooking Masterclass',
      description: 'Learn to make authentic Italian pasta and sauces from scratch.',
      instructor: 'Marco Rossi',
      locationId: locations[0].id,
      startsAt: new Date(nextMonday.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      endsAt: new Date(nextMonday.getTime() + 3 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      capacity: 8,
      reservedSeats: 0,
      status: WorkshopStatus.SCHEDULED,
    },
    {
      id: 'ws-pottery-002',
      code: 'POT-002',
      title: 'Advanced Pottery Glazing',
      description: 'Explore advanced glazing techniques and decorative firing methods.',
      instructor: 'Maria Chen',
      locationId: locations[2].id,
      startsAt: new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endsAt: new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      capacity: 10,
      reservedSeats: 0,
      status: WorkshopStatus.SCHEDULED,
    },
  ];

  for (const ws of workshops) {
    await prisma.workshop.upsert({
      where: { id: ws.id },
      update: {},
      create: ws,
    });
  }

  console.log(`✅ Created ${workshops.length} workshops`);

  // Add a few sample registrations to make the demo more realistic
  const registration1 = await prisma.registration.upsert({
    where: {
      unique_active_registration: {
        workshopId: 'ws-pottery-001',
        attendeeEmail: 'john.doe@example.com',
        status: 'ACTIVE',
      },
    },
    update: {},
    create: {
      workshopId: 'ws-pottery-001',
      attendeeName: 'John Doe',
      attendeeEmail: 'john.doe@example.com',
      status: 'ACTIVE',
      registeredById: staff1.id,
    },
  });

  const registration2 = await prisma.registration.upsert({
    where: {
      unique_active_registration: {
        workshopId: 'ws-pottery-001',
        attendeeEmail: 'emma.wilson@example.com',
        status: 'ACTIVE',
      },
    },
    update: {},
    create: {
      workshopId: 'ws-pottery-001',
      attendeeName: 'Emma Wilson',
      attendeeEmail: 'emma.wilson@example.com',
      status: 'ACTIVE',
      registeredById: staff2.id,
    },
  });

  // Update reserved seats
  await prisma.workshop.update({
    where: { id: 'ws-pottery-001' },
    data: { reservedSeats: 2 },
  });

  // One cancelled registration for history
  const cancelledReg = await prisma.registration.create({
    data: {
      workshopId: 'ws-coding-001',
      attendeeName: 'Tom Brown',
      attendeeEmail: 'tom.brown@example.com',
      status: 'CANCELLED',
      registeredById: staff1.id,
      cancelledById: staff2.id,
      cancelledAt: new Date(),
    },
  });

  // Seed audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: staff1.id,
        action: 'REGISTRATION_CREATED',
        entityType: 'registration',
        entityId: registration1.id,
        metadata: { workshopCode: 'POT-001', attendeeEmail: 'john.doe@example.com' },
      },
      {
        actorId: staff2.id,
        action: 'REGISTRATION_CREATED',
        entityType: 'registration',
        entityId: registration2.id,
        metadata: { workshopCode: 'POT-001', attendeeEmail: 'emma.wilson@example.com' },
      },
      {
        actorId: staff1.id,
        action: 'REGISTRATION_CREATED',
        entityType: 'registration',
        entityId: cancelledReg.id,
        metadata: { workshopCode: 'COD-001', attendeeEmail: 'tom.brown@example.com' },
      },
      {
        actorId: staff2.id,
        action: 'REGISTRATION_CANCELLED',
        entityType: 'registration',
        entityId: cancelledReg.id,
        metadata: { workshopCode: 'COD-001', attendeeEmail: 'tom.brown@example.com' },
      },
    ],
  });

  console.log('✅ Created sample registrations and audit logs');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Dev Credentials:');
  console.log('  Admin:   admin@workshop.local   / Admin@123456');
  console.log('  Manager: manager@workshop.local / Manager@123456');
  console.log('  Staff:   alice@workshop.local   / Staff@123456');
  console.log('  Staff:   bob@workshop.local     / Staff@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
