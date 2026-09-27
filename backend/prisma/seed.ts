import { PrismaClient, SkillLevel, SkillType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

interface SeedSkill {
  name: string;
  description: string;
}

interface SeedCategory {
  name: string;
  description: string;
  skills: SeedSkill[];
}

const CATALOG: SeedCategory[] = [
  {
    name: "Technology",
    description: "Programming, software, and digital skills.",
    skills: [
      { name: "JavaScript", description: "Web development fundamentals and beyond." },
      { name: "TypeScript", description: "Typed JavaScript for larger applications." },
      { name: "Python", description: "General-purpose programming language." },
      { name: "SQL", description: "Querying and modeling relational databases." },
      { name: "React", description: "Building modern user interfaces." },
      { name: "Node.js", description: "Server-side JavaScript with Express and friends." },
      { name: "Web Design", description: "HTML, CSS, and responsive layout." },
      { name: "Excel", description: "Spreadsheets, formulas, and data analysis." },
    ],
  },
  {
    name: "Business",
    description: "Entrepreneurship, marketing, and management.",
    skills: [
      { name: "Marketing", description: "Reaching and engaging customers." },
      { name: "Financial Literacy", description: "Budgeting, saving, and personal finance." },
      { name: "Public Speaking", description: "Confident speaking in front of others." },
      { name: "Project Management", description: "Planning and delivering projects." },
      { name: "Sales", description: "Finding customers and closing deals." },
      { name: "Resume Writing", description: "Crafting an effective CV." },
      { name: "Interview Prep", description: "Preparing for job interviews." },
    ],
  },
  {
    name: "Languages",
    description: "Spoken and written languages.",
    skills: [
      { name: "English", description: "Spoken and written English." },
      { name: "French", description: "Spoken and written French." },
      { name: "Amharic", description: "Spoken and written Amharic." },
      { name: "Spanish", description: "Spoken and written Spanish." },
      { name: "Arabic", description: "Spoken and written Arabic." },
    ],
  },
  {
    name: "Music",
    description: "Instruments, theory, and performance.",
    skills: [
      { name: "Guitar", description: "Acoustic or electric guitar." },
      { name: "Piano", description: "Piano and keyboard." },
      { name: "Singing", description: "Vocal technique and performance." },
      { name: "Music Theory", description: "Notes, chords, and harmony." },
      { name: "Drums", description: "Rhythm and percussion." },
    ],
  },
  {
    name: "Photography",
    description: "Capturing and editing images.",
    skills: [
      { name: "Photography", description: "Composition, exposure, and light." },
      { name: "Photo Editing", description: "Retouching and post-processing." },
      { name: "Videography", description: "Shooting and editing video." },
    ],
  },
  {
    name: "Cooking",
    description: "Culinary skills from basic to advanced.",
    skills: [
      { name: "Cooking", description: "Everyday cooking techniques." },
      { name: "Baking", description: "Breads, pastries, and desserts." },
      { name: "Ethiopian Cooking", description: "Traditional Ethiopian dishes." },
      { name: "Meal Prep", description: "Planning and preparing meals ahead." },
    ],
  },
  {
    name: "Arts",
    description: "Drawing, painting, and creative crafts.",
    skills: [
      { name: "Drawing", description: "Sketching and illustration." },
      { name: "Painting", description: "Watercolor, acrylic, and oil." },
      { name: "Digital Art", description: "Creating art with a tablet or computer." },
    ],
  },
  {
    name: "Fitness",
    description: "Health, exercise, and wellbeing.",
    skills: [
      { name: "Yoga", description: "Poses, breathing, and mindfulness." },
      { name: "Weight Training", description: "Strength training fundamentals." },
      { name: "Running", description: "Training for endurance and speed." },
    ],
  },
  {
    name: "Sports",
    description: "Athletic and ball sports.",
    skills: [
      { name: "Football", description: "Soccer fundamentals and drills." },
      { name: "Basketball", description: "Basketball skills and drills." },
      { name: "Tennis", description: "Tennis technique and practice." },
      { name: "Swimming", description: "Swimming technique and safety." },
    ],
  },

{
    name: "Automotive",
    description: "Cars, maintenance, and repair.",
    skills: [
      { name: "Car Maintenance", description: "Oil, brakes, tires, and basic upkeep." },
      { name: "Driving", description: "Learning to drive safely." },
      { name: "Motorcycle Riding", description: "Riding fundamentals and safety." },
    ],
  },
  {
    name: "Agriculture",
    description: "Farming, gardening, and livestock.",
    skills: [
      { name: "Vegetable Gardening", description: "Growing vegetables at home." },
      { name: "Coffee Farming", description: "Growing and processing coffee." },
      { name: "Beekeeping", description: "Keeping bees and harvesting honey." },
    ],
  },
  {
    name: "Crafts",
    description: "Handmade and hobby crafts.",
    skills: [
      { name: "Knitting", description: "Knitting and crochet basics." },
      { name: "Woodworking", description: "Building with wood." },
      { name: "Pottery", description: "Working with clay." },
    ],
  },
  {
    name: "Education",
    description: "Academic and study skills.",
    skills: [
      { name: "Math", description: "Arithmetic through calculus." },
      { name: "Physics", description: "Mechanics, waves, and electricity." },
      { name: "Study Skills", description: "Note-taking, focus, and exam prep." },
      { name: "Essay Writing", description: "Structuring and writing essays." },
    ],
  },
  {
    name: "Career",
    description: "Workplace and professional skills.",
    skills: [
      { name: "Leadership", description: "Leading teams and projects." },
      { name: "Communication", description: "Clear and effective communication." },
      { name: "Time Management", description: "Prioritizing and planning your time." },
      { name: "Networking", description: "Building professional relationships." },
    ],
  },
  {
    name: "Home Improvement",
    description: "DIY and household skills.",
    skills: [
      { name: "DIY", description: "Handy projects around the house." },
      { name: "Plumbing", description: "Fixing leaks and installing fixtures." },
      { name: "Electrician Basics", description: "Safe basic electrical work." },
    ],
  },
  {
    name: "Other",
    description: "Anything that doesn't fit elsewhere.",
    skills: [
      { name: "Chess", description: "Strategy and tactics." },
      { name: "Meditation", description: "Building a daily practice." },
      { name: "First Aid", description: "Basic emergency response." },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database (Phase 3: users, skills catalog, demo profiles)...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const alex = await prisma.user.upsert({
    where: { email: "alex@skillloop.app" },
    update: {},
    create: {
      email: "alex@skillloop.app",
      username: "alex",
      passwordHash,
      firstName: "Alex",
      lastName: "Bekele",
      bio: "Learning photography, teaching JavaScript.",
      location: "Addis Ababa, Ethiopia",
      timezone: "Africa/Addis_Ababa",
      isVerified: true,
    },
  });

  const michael = await prisma.user.upsert({
    where: { email: "michael@skillloop.app" },
    update: {},
    create: {
      email: "michael@skillloop.app",
      username: "michael",
      passwordHash,
      firstName: "Michael",
      lastName: "Tesfaye",
      bio: "Photographer with 5 years of practical experience.",
      location: "Jimma, Ethiopia",
      timezone: "Africa/Addis_Ababa",
      isVerified: true,
    },
  });

  // Categories + skills (idempotent — safe to re-run).
  for (const category of CATALOG) {
    const upsertedCategory = await prisma.skillCategory.upsert({
      where: { slug: slugify(category.name) },
      update: { description: category.description },
      create: {
        name: category.name,
        slug: slugify(category.name),
        description: category.description,
      },
    });
    for (const skill of category.skills) {
      await prisma.skill.upsert({
        where: { slug: slugify(skill.name) },
        update: { description: skill.description, categoryId: upsertedCategory.id },
        create: {
          name: skill.name,
          slug: slugify(skill.name),
          description: skill.description,
          categoryId: upsertedCategory.id,
        },
      });
    }
  }

  // Demo teach/learn profiles — Alex and Michael complement each other,
  // which exercises the matching engine in later phases.
  await setUserSkill(
    alex.id,
    "JavaScript",
    "TEACH",
    "ADVANCED",
    5,
    "Building web applications for 5 years."
  );
  await setUserSkill(
    alex.id,
    "Photography",
    "LEARN",
    "BEGINNER",
    0,
    "Want to learn manual camera settings."
  );
  await setUserSkill(
    michael.id,
    "Photography",
    "TEACH",
    "EXPERT",
    8,
    "Professional photographer teaching composition and exposure."
  );
  await setUserSkill(
    michael.id,
    "JavaScript",
    "LEARN",
    "INTERMEDIATE",
    1,
    "Want to build a portfolio website."
  );

  const skillCount = await prisma.skill.count();

  // Phase 15: demo course materials (priced in credits, sold via wallet).
  await upsertMaterial(michael.id, "Photography", {
    title: "Photography Field Notes",
    description:
      "A condensed walkthrough of aperture, shutter speed, ISO and composition that I hand out before every practical session.",
    price: 40,
    links: [
      "https://www.canon.com.au/learn/exposure-triangle-aperture-shutter-speed-and-iso",
      "https://www.adorama.com/alc/the-elements-of-composition/",
    ],
  });
  await upsertMaterial(alex.id, "JavaScript", {
    title: "JS Interview Prep Guide",
    description:
      "The exact study list I used to prepare for front-end interviews: core concepts, array methods, and common gotchas.",
    price: 25,
    links: [
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      "https://www.jsv9000.app/",
    ],
  });

  console.log("✅ Seeded users:", alex.username, michael.username);
  console.log(`✅ Seeded ${skillCount} skills across ${CATALOG.length} categories`);
  console.log("✅ Seeded demo course materials");
  console.log("   (Offerings, exchanges, sessions, etc. are added from Phase 5 onward.)");
}

async function upsertMaterial(teacherId: string, skillName: string | undefined, data: {
  title: string;
  description: string;
  price: number;
  links: string[];
}) {
  const skill = skillName ? await prisma.skill.findUnique({ where: { name: skillName } }) : null;
  const existing = await prisma.material.findFirst({ where: { teacherId, title: data.title } });
  if (existing) {
    await prisma.material.update({
      where: { id: existing.id },
      data: { description: data.description, price: data.price, links: data.links },
    });
    return;
  }
  await prisma.material.create({
    data: { teacherId, skillId: skill?.id ?? null, fileNames: [], ...data },
  });
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
async function setUserSkill(
  userId: string,
  skillName: string,
  type: SkillType,
  level: SkillLevel,
  yearsExperience: number,
  description: string
) {
  const skill = await prisma.skill.findUnique({ where: { name: skillName } });
  if (!skill) {
    console.log(`⚠ Skipping user skill "${skillName}" — not in catalog`);
    return;
  }
  await prisma.userSkill.upsert({
    where: { userId_skillId: { userId, skillId: skill.id } },
    update: { type, level, yearsExperience, description },
    create: { userId, skillId: skill.id, type, level, yearsExperience, description },
  });
}
