export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;
}

export const templates: Template[] = [
  {
    id: "blank",
    name: "Blank Note",
    icon: "📄",
    description: "Start from scratch",
    content: "",
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    icon: "🤝",
    description: "Capture meeting discussions",
    content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n**Agenda:**\n\n## Discussion Points\n\n1. \n2. \n3. \n\n## Action Items\n\n- [ ] \n- [ ] \n- [ ] \n\n## Next Steps\n\n`,
  },
  {
    id: "study",
    name: "Study Notes",
    icon: "📚",
    description: "Organize study material",
    content: `# Study Notes\n\n**Subject:** \n**Topic:** \n**Date:** ${new Date().toLocaleDateString()}\n\n## Key Concepts\n\n1. \n2. \n3. \n\n## Important Details\n\n\n\n## Questions to Review\n\n- \n- \n\n## Summary\n\n`,
  },
  {
    id: "journal",
    name: "Daily Journal",
    icon: "📔",
    description: "Reflect on your day",
    content: `# Journal — ${new Date().toLocaleDateString()}\n\n## How I'm Feeling\n\n\n\n## Today's Highlights\n\n1. \n2. \n3. \n\n## Gratitude\n\n- \n- \n- \n\n## Tomorrow's Goals\n\n- [ ] \n- [ ] \n- [ ] \n`,
  },
  {
    id: "todo",
    name: "To-Do List",
    icon: "✅",
    description: "Track your tasks",
    content: `# To-Do List\n\n## Priority\n\n- [ ] \n- [ ] \n\n## Today\n\n- [ ] \n- [ ] \n- [ ] \n\n## This Week\n\n- [ ] \n- [ ] \n\n## Later\n\n- [ ] \n`,
  },
  {
    id: "project",
    name: "Project Plan",
    icon: "🚀",
    description: "Plan your project",
    content: `# Project Plan\n\n**Project:** \n**Start Date:** \n**Deadline:** \n\n## Overview\n\n\n\n## Goals\n\n1. \n2. \n3. \n\n## Milestones\n\n- [ ] Phase 1: \n- [ ] Phase 2: \n- [ ] Phase 3: \n\n## Resources Needed\n\n- \n- \n\n## Notes\n\n`,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: "💡",
    description: "Capture creative ideas",
    content: `# Brainstorm Session\n\n**Topic:** \n**Date:** ${new Date().toLocaleDateString()}\n\n## Ideas\n\n1. \n2. \n3. \n4. \n5. \n\n## Best Ideas to Explore\n\n- \n- \n\n## Next Steps\n\n- [ ] \n`,
  },
  {
    id: "class",
    name: "Class Notes",
    icon: "🎓",
    description: "Take organized class notes",
    content: `# Class Notes\n\n**Course:** \n**Lecture:** \n**Date:** ${new Date().toLocaleDateString()}\n**Professor:** \n\n## Main Topics\n\n### Topic 1\n\n\n\n### Topic 2\n\n\n\n## Key Takeaways\n\n1. \n2. \n3. \n\n## Homework / Assignments\n\n- [ ] \n- [ ] \n`,
  },
  {
    id: "shopping",
    name: "Shopping List",
    icon: "🛒",
    description: "Track what you need to buy",
    content: `# Shopping List\n\n## Groceries\n\n- [ ] \n- [ ] \n- [ ] \n\n## Household\n\n- [ ] \n- [ ] \n\n## Other\n\n- [ ] \n`,
  },
  {
    id: "travel",
    name: "Travel Plan",
    icon: "✈️",
    description: "Plan your trip",
    content: `# Travel Plan\n\n**Destination:** \n**Dates:** \n**Budget:** \n\n## Packing List\n\n- [ ] Passport / ID\n- [ ] Chargers\n- [ ] Clothes\n- [ ] Toiletries\n- [ ] \n\n## Itinerary\n\n### Day 1\n\n\n\n### Day 2\n\n\n\n## Accommodation\n\n\n\n## Notes\n\n`,
  },
];
