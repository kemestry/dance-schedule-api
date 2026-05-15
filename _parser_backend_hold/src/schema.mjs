export const competitionScheduleSchema = {
  name: "competition_schedule_payload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["competition", "dancers", "entries", "selectedDancers"],
    properties: {
      competition: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "startDate", "endDate", "sourceType", "sourceUrl", "createdAt"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          sourceType: {
            type: "string",
            enum: ["manual", "link", "screenshot", "pdf"]
          },
          sourceUrl: {
            anyOf: [{ type: "string" }, { type: "null" }]
          },
          createdAt: { type: "string" }
        }
      },
      dancers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "competitionId", "name", "colorToken"],
          properties: {
            id: { type: "string" },
            competitionId: { type: "string" },
            name: { type: "string" },
            colorToken: { type: "string" }
          }
        }
      },
      entries: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "competitionId",
            "dancerId",
            "eventDate",
            "eventTime",
            "datetimeStart",
            "title",
            "category",
            "performanceType",
            "notes"
          ],
          properties: {
            id: { type: "string" },
            competitionId: { type: "string" },
            dancerId: { type: "string" },
            eventDate: { type: "string", description: "YYYY-MM-DD" },
            eventTime: { type: "string", description: "Human-readable local time like 8:35 AM" },
            datetimeStart: { type: "string", description: "ISO 8601 datetime" },
            title: { type: "string" },
            category: { type: "string" },
            performanceType: {
              type: "string",
              enum: ["Solo", "Duo/Trio", "Group", "Line", "Production"]
            },
            notes: {
              anyOf: [{ type: "string" }, { type: "null" }]
            }
          }
        }
      },
      selectedDancers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "competitionId", "dancerId"],
          properties: {
            id: { type: "string" },
            competitionId: { type: "string" },
            dancerId: { type: "string" }
          }
        }
      }
    }
  }
};
