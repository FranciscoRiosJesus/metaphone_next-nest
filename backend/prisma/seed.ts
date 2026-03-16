import { PrismaClient } from '@prisma/client';
import { normalizeName, normalizeEmail, getPhoneticKeys } from '../../shared/src';

const prisma = new PrismaClient();

const seedAthletes = [
  { firstName: 'John', lastName: 'Smith', position: 'Forward', parentEmail: 'smith.family@example.com' },
  { firstName: 'Sara', lastName: 'Gonzalez', position: 'Midfielder', parentEmail: 'gonzalez.home@example.com' },
  { firstName: 'Luis', lastName: 'Martinez', position: 'Defender', parentEmail: 'martinez@example.com' },
  { firstName: 'Nicolas', lastName: 'Garcia', position: 'Goalkeeper', parentEmail: 'garcia.parents@example.com' },
  { firstName: 'Philip', lastName: 'Brown', position: 'Forward', parentEmail: 'brown.family@example.com' },
];

async function main() {
  console.log('Seeding database...');

  for (const athlete of seedAthletes) {
    const normalizedFirstName = normalizeName(athlete.firstName);
    const normalizedLastName = normalizeName(athlete.lastName);
    const normalizedParentEmail = normalizeEmail(athlete.parentEmail);
    const [metaphoneFirstName] = getPhoneticKeys(athlete.firstName);
    const [metaphoneLastName] = getPhoneticKeys(athlete.lastName);

    await prisma.athlete.upsert({
      where: {
        unique_normalized_athlete: {
          normalizedFirstName,
          normalizedLastName,
          normalizedParentEmail,
        },
      },
      update: {},
      create: {
        ...athlete,
        normalizedFirstName,
        normalizedLastName,
        normalizedParentEmail,
        metaphoneFirstName,
        metaphoneLastName,
      },
    });

    console.log(`  ✓ ${athlete.firstName} ${athlete.lastName}`);
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
