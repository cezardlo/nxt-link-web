import { z } from 'zod';

const measurableText = (label: string) =>
  z
    .string()
    .trim()
    .min(3, `${label} is required`)
    .refine((value) => /\d/.test(value), `${label} must include a measurable value`);

const optionalNumber = z
  .union([z.coerce.number().finite(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value;
  });

export const challengeInputSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(12),
  category: z.string().trim().min(2),
  city: z.string().trim().min(2).default('El Paso'),
  kpiName: z.string().trim().min(2),
  desiredOutcome: measurableText('Desired outcome'),
  baselineValue: optionalNumber,
  targetValue: optionalNumber,
  timelineDays: z.coerce.number().int().min(1).max(365).default(45),
  budgetMin: optionalNumber,
  budgetMax: optionalNumber,
  fundingStatus: z.enum(['FUNDED', 'PARTIAL', 'SEEKING', 'EXPLORATION']).default('EXPLORATION'),
  status: z.enum(['OPEN', 'REVIEWING', 'TESTING', 'CLOSED']).default('REVIEWING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export const vendorInputSchema = z.object({
  name: z.string().trim().min(2),
  tags: z.string().trim().min(2),
  website: z.string().trim().url().optional().or(z.literal('')),
  contactName: z.string().trim().optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  typicalMinCost: optionalNumber,
  typicalMaxCost: optionalNumber,
  notes: z.string().trim().optional(),
});

export const adminMatchInputSchema = z.object({
  vendorId: z.string().trim().min(1),
  solutionSummary: z.string().trim().min(12),
  pilotPlan: z.string().trim().min(20),
  expectedImpact: measurableText('Expected impact'),
  proposedCost: optionalNumber,
  measurementPlan: z.string().trim().min(12),
});

export const publicSubmissionInputSchema = z.object({
  vendorName: z.string().trim().min(2),
  email: z.string().trim().email(),
  website: z.string().trim().url().optional().or(z.literal('')),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  tags: z.string().trim().optional(),
  solutionSummary: z.string().trim().min(12),
  pilotPlan: z
    .string()
    .trim()
    .min(20)
    .refine(
      (value) => value.toLowerCase().includes('45') && value.toLowerCase().includes('day'),
      'Pilot plan must include a 45-day test description',
    ),
  expectedImpact: measurableText('Expected impact'),
  proposedCost: optionalNumber,
  measurementPlan: z.string().trim().min(12),
});

export const pilotCreateSchema = z.object({
  startDate: z.string().trim().optional(),
  kpiBaseline: z.coerce.number().finite(),
  kpiTarget: z.coerce.number().finite(),
});

export const pilotUpdateSchema = z.object({
  kpiCurrent: z.coerce.number().finite(),
  weeklyUpdate: z.string().trim().optional(),
});

export const documentInputSchema = z.object({
  vendorId: z.string().trim().optional(),
  type: z.enum(['NDA', 'PILOT_AGREEMENT', 'OTHER']),
  status: z.enum(['PENDING', 'SIGNED']).default('PENDING'),
  fileUrl: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const budgetInputSchema = z.object({
  pilotCost: z.coerce.number().positive(),
  monthlyBenefit: z.coerce.number().positive(),
  notes: z.string().trim().optional(),
});

export const resultInputSchema = z.object({
  summary: z.string().trim().min(10),
  beforeAfter: measurableText('Before / After'),
  lessonsLearned: z.string().trim().min(10),
  published: z.boolean(),
});

