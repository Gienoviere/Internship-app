const prisma = require("../src/prisma");

const mappings = [
    { taskName: "Feed horses", feedName: "Appels" },
  { taskName: "Feed pigeons", feedName: "Duivenvoer" },
  { taskName: "Feed geese", feedName: "Ganzenvoer" },
  { taskName: "Feed quails", feedName: "Kwartelvoer" },
  { taskName: "Feed cows", feedName: "Koeienpellets" },
  { taskName: "Use strows", feedName: "Midibalen" },
  { taskName: "Feed pluimvee", feedName: "Pluimvee" },
  { taskName: "Use Ponies", feedName: "ponies" },
  { taskName: "Feed sheep", feedName: "Schapenvoer" },
  { taskName: "Feed pigs", feedName: "Varkens voer" },
  { taskName: "Feed fish", feedName: "Vissenvoer" },
  { taskName: "Feed zebra finches", feedName: "Zebravinken" },
];

async function main() {
  for (const item of mappings) {
    const feedItem = await prisma.feedItem.findFirst({
      where: { name: item.feedName },
      select: { id: true, name: true },
    });

    if (!feedItem) {
      console.warn(`Feed item not found: ${item.feedName}`);
      continue;
    }

    const existingTask = await prisma.task.findFirst({
      where: { name: item.taskName },
      select: { id: true, name: true },
    });

    if (existingTask) {
      await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          category: "Feeding",
          active: true,
          isDaily: true,
          affectsInventory: true,
          feedItemId: feedItem.id,
        },
      });

      console.log(`Updated task "${item.taskName}" -> "${feedItem.name}"`);
    } else {
      await prisma.task.create({
        data: {
          name: item.taskName,
          category: "Feeding",
          active: true,
          isDaily: true,
          affectsInventory: true,
          feedItemId: feedItem.id,
        },
      });

      console.log(`Created task "${item.taskName}" -> "${feedItem.name}"`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });