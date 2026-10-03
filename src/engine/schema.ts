import { z } from 'zod';

// ---- Primitive schemas ----

/** Scenario / rule / cause identifier: lowercase kebab-case. Also used as a file name. */
export const ID_PATTERN = /^[a-z0-9-]+$/;

/** Flag name: snake_case. */
export const FLAG_PATTERN = /^[a-z][a-z0-9_]*$/;

const idSchema = z.string().min(1).max(64).regex(ID_PATTERN, 'must match ^[a-z0-9-]+$');
const flagName = z.string().min(1).max(64).regex(FLAG_PATTERN, 'must match ^[a-z][a-z0-9_]*$');

/** Text shown to the player in both supported languages. */
export const localizedTextSchema = z.strictObject({
  ja: z.string().trim().min(1, 'ja text is required'),
  en: z.string().trim().min(1, 'en text is required'),
});

/** A set of flag requirements; every listed flag must equal its value. */
const flagConditionSchema = z.record(flagName, z.boolean());

// Match strings must already be normalized so they can match normalized input.
const matchString = z
  .string()
  .min(1)
  .max(200)
  .refine((s) => s === s.trim().split(/\s+/).join(' '), 'match strings must be whitespace-normalized');

// ---- Rule ----

export const ruleSchema = z.strictObject({
  id: idSchema,
  match: z.array(matchString).min(1),
  matchType: z.enum(['exact', 'prefix']).default('exact'),
  when: flagConditionSchema.optional(),
  output: z.string().max(8000),
  effects: z.record(flagName, z.boolean()).optional(),
  danger: z
    .strictObject({
      penalty: z.number().int().min(1).max(100),
      message: localizedTextSchema,
    })
    .optional(),
  note: localizedTextSchema.optional(),
});

// ---- Scenario ----

export const scenarioSchema = z.strictObject({
  $schema: z.string().optional(),
  id: idSchema,
  version: z.literal(1),
  title: localizedTextSchema,
  briefing: localizedTextSchema,
  severity: z.enum(['P1', 'P2', 'P3', 'P4']),
  category: z.enum(['linux', 'aws']),
  host: z.string().regex(/^[a-z0-9-]{1,32}$/, 'host must be a short fictional hostname'),
  par: z.number().int().min(1).max(50),
  initialFlags: z.record(flagName, z.boolean()),
  commands: z.array(ruleSchema).min(1),
  recovery: flagConditionSchema.refine((c) => Object.keys(c).length > 0, 'recovery needs at least one flag'),
  hints: z.array(localizedTextSchema).min(1),
  rootCauses: z
    .array(z.strictObject({ id: idSchema, label: localizedTextSchema }))
    .min(2),
  correctRootCause: idSchema,
  postmortem: z.strictObject({
    summary: localizedTextSchema,
    fix: localizedTextSchema,
    prevention: localizedTextSchema,
  }),
});

// ---- Inferred types ----

/** Supported UI languages. */
export type Locale = 'ja' | 'en';
/** Bilingual text. */
export type LocalizedText = z.infer<typeof localizedTextSchema>;
/** A parsed scenario rule (defaults applied). */
export type Rule = z.infer<typeof ruleSchema>;
/** A parsed scenario (defaults applied). */
export type Scenario = z.infer<typeof scenarioSchema>;
/** Flag requirements map. */
export type FlagCondition = Record<string, boolean>;
