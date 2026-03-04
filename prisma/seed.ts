import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.result.deleteMany();
  await prisma.budgetCalc.deleteMany();
  await prisma.document.deleteMany();
  await prisma.pilot.deleteMany();
  await prisma.match.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.challenge.deleteMany();

  const challenge = await prisma.challenge.create({
    data: {
      title: 'Restaurant Water Waste Reduction',
      description:
        'Restaurants in El Paso are experiencing inconsistent water tracking during prep and cleaning, creating measurable waste and cost leakage.',
      category: 'Water Efficiency',
      city: 'El Paso',
      kpiName: 'Gallons per day',
      desiredOutcome: 'Reduce water usage by 10% in 45 days',
      baselineValue: 1200,
      targetValue: 1080,
      timelineDays: 45,
      budgetMin: 12000,
      budgetMax: 28000,
      fundingStatus: 'FUNDED',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      status: 'TESTING',
    },
  });

  const vendorA = await prisma.vendor.create({
    data: {
      name: 'Desert Ops Lab',
      tags: 'water,operations,monitoring',
      website: 'https://desertopslab.example',
      contactName: 'Sofia Marquez',
      email: 'pilot@desertopslab.example',
      phone: '+1-915-555-0182',
      typicalMinCost: 15000,
      typicalMaxCost: 32000,
      notes: 'Strong track record with hospitality efficiency pilots.',
    },
  });

  const vendorB = await prisma.vendor.create({
    data: {
      name: 'Flowwise Systems',
      tags: 'iot,water,analytics',
      website: 'https://flowwise.example',
      contactName: 'Nora Patel',
      email: 'hello@flowwise.example',
      phone: '+1-915-555-0196',
      typicalMinCost: 11000,
      typicalMaxCost: 25000,
      notes: 'Low-cost instrumentation and dashboard workflows.',
    },
  });

  const selectedMatch = await prisma.match.create({
    data: {
      challengeId: challenge.id,
      vendorId: vendorA.id,
      solutionSummary:
        'Install meter snapshot workflow and line-level accountability checklist.',
      pilotPlan:
        '45-day rollout with baseline confirmation in week 1, operational intervention in week 2, and weekly optimization reviews.',
      expectedImpact:
        'Target 12% reduction in gallons/day and improved consistency across shifts.',
      proposedCost: 18500,
      measurementPlan:
        'Twice-daily meter captures normalized by ticket volume and weekly variance control.',
      status: 'PILOT_ACTIVE',
    },
  });

  await prisma.match.create({
    data: {
      challengeId: challenge.id,
      vendorId: vendorB.id,
      solutionSummary: 'Sensor-based leak detection with automated maintenance alerts.',
      pilotPlan: '45-day staged deployment across two high-volume locations.',
      expectedImpact: 'Reduce avoidable leaks by 8% and daily usage by 6%.',
      proposedCost: 16200,
      measurementPlan: 'Compare leak events and gallons/day against 4-week pre-pilot average.',
      status: 'SUBMITTED',
    },
  });

  const startDate = subDays(new Date(), 14);
  const endDate = addDays(startDate, challenge.timelineDays);

  const pilot = await prisma.pilot.create({
    data: {
      challengeId: challenge.id,
      matchId: selectedMatch.id,
      startDate,
      endDate,
      kpiBaseline: 1200,
      kpiTarget: 1080,
      kpiCurrent: 1116,
      weeklyUpdates:
        'Week 1: Baseline confirmed\nWeek 2: SOP rollout completed\nWeek 3: Early savings sustained',
      decision: 'UNDECIDED',
      status: 'ACTIVE',
    },
  });

  await prisma.document.createMany({
    data: [
      {
        pilotId: pilot.id,
        vendorId: vendorA.id,
        type: 'NDA',
        status: 'SIGNED',
        fileUrl: '/uploads/nda-desert-ops.pdf',
        notes: 'Signed by both parties.',
      },
      {
        pilotId: pilot.id,
        vendorId: vendorA.id,
        type: 'PILOT_AGREEMENT',
        status: 'PENDING',
        fileUrl: '/uploads/pilot-agreement-desert-ops.pdf',
        notes: 'Awaiting final finance signature.',
      },
    ],
  });

  await prisma.budgetCalc.create({
    data: {
      pilotId: pilot.id,
      pilotCost: 18500,
      monthlyBenefit: 6200,
      roiPercent: Number((((6200 * 12 - 18500) / 18500) * 100).toFixed(1)),
      paybackMonths: Number((18500 / 6200).toFixed(1)),
      notes: 'Initial estimate based on utility trend and usage normalization.',
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

