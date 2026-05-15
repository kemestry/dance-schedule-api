import { CostumeChecklistItem, RoutineCostume, ScheduleEntry } from "@/types/models";
import { openClawService } from "@/services/openClawService";

function toChecklistSlug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function createNoteChecklistLabel(prefix: string, notes?: string) {
  const trimmed = notes?.trim();

  if (!trimmed) {
    return null;
  }

  const summary = trimmed.length > 48 ? `${trimmed.slice(0, 45).trim()}...` : trimmed;
  return `${prefix}: ${summary}`;
}

export const costumeService = {
  buildChecklistFromRoutineCostume(costume: RoutineCostume): CostumeChecklistItem[] {
    const items: CostumeChecklistItem[] = [
      {
        id: `${costume.id}-base-costume`,
        competitionId: costume.competitionId,
        dancerId: costume.dancerId,
        scheduleEntryId: costume.scheduleEntryId,
        routineCostumeId: costume.id,
        label: `Pack ${costume.costumeName}`,
        category: "costume",
        status: "todo",
      },
    ];

    for (const shoe of costume.shoes ?? []) {
      items.push({
        id: `${costume.id}-shoe-${toChecklistSlug(shoe)}`,
        competitionId: costume.competitionId,
        dancerId: costume.dancerId,
        scheduleEntryId: costume.scheduleEntryId,
        routineCostumeId: costume.id,
        label: `Pack ${shoe}`,
        category: "shoes",
        status: "todo",
      });
    }

    for (const accessory of costume.accessories ?? []) {
      items.push({
        id: `${costume.id}-accessory-${toChecklistSlug(accessory)}`,
        competitionId: costume.competitionId,
        dancerId: costume.dancerId,
        scheduleEntryId: costume.scheduleEntryId,
        routineCostumeId: costume.id,
        label: `Pack ${accessory}`,
        category: "accessory",
        status: "todo",
      });
    }

    const hairLabel = createNoteChecklistLabel("Confirm hair", costume.hairNotes);
    if (hairLabel) {
      items.push({
        id: `${costume.id}-hair-notes`,
        competitionId: costume.competitionId,
        dancerId: costume.dancerId,
        scheduleEntryId: costume.scheduleEntryId,
        routineCostumeId: costume.id,
        label: hairLabel,
        category: "hair",
        status: "todo",
      });
    }

    const makeupLabel = createNoteChecklistLabel("Confirm makeup", costume.makeupNotes);
    if (makeupLabel) {
      items.push({
        id: `${costume.id}-makeup-notes`,
        competitionId: costume.competitionId,
        dancerId: costume.dancerId,
        scheduleEntryId: costume.scheduleEntryId,
        routineCostumeId: costume.id,
        label: makeupLabel,
        category: "makeup",
        status: "todo",
      });
    }

    return items;
  },

  createTemplateCostume(entry: ScheduleEntry): RoutineCostume {
    return {
      id: `costume-${entry.id}`,
      competitionId: entry.competitionId,
      dancerId: entry.dancerId,
      scheduleEntryId: entry.id,
      costumeName: `${entry.category} ${entry.performanceType} set`,
      shoes: [],
      accessories: [],
      source: "template",
    };
  },

  async generateFromSchedule(entry: ScheduleEntry) {
    if (!openClawService.isConfigured()) {
      return {
        costume: this.createTemplateCostume(entry),
        checklistItems: [] as CostumeChecklistItem[],
      };
    }

    const enrichment = await openClawService.enrichCompetitionSchedule({
      competition: {
        id: entry.competitionId,
        name: "",
        startDate: entry.eventDate,
        endDate: entry.eventDate,
        sourceType: "manual",
        createdAt: new Date().toISOString(),
      },
      entries: [entry],
    });

    return {
      costume: enrichment.routineCostumes[0] ?? this.createTemplateCostume(entry),
      checklistItems: enrichment.costumeChecklistItems.filter((item) => item.scheduleEntryId === entry.id),
    };
  },
};
