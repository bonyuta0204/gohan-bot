import { addFridgeItem } from "./add_fridge_item.ts";
import { recordMeal } from "./record_meal.ts";
import { fetchRecentItems } from "./fetch_recent_items.ts";
import OpenAI from "npm:openai";

export const toolHandlers = {
  add_fridge_item: addFridgeItem,
  record_meal: recordMeal,
  fetch_recent_items: fetchRecentItems,
};
export function getToolSchema(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "add_fridge_item",
        description:
          "Add one or more items to the fridge. Use when the user says they bought or still have ingredients.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              description: "One JSON object per item.",
              items: {
                type: "object",
                properties: {
                  item_name: {
                    type: "string",
                    description: "Ingredient name, singular (e.g. 'broccoli')",
                  },
                  meta: {
                    type: "object",
                    description:
                      "Optional; only include if the user gives extra info such as category, expiry, quantity, notes.",
                    additionalProperties: true,
                  },
                  expire_at: {
                    type: "string",
                    format: "date-time",
                    description: "Optional; expiration date in ISO8601 format.",
                  },
                  note: {
                    type: "string",
                    description: "Optional; any note about the item.",
                  },
                },
                required: ["item_name"],
              },
              minItems: 1,
            },
          },
          required: ["items"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "record_meal",
        description:
          "Log a meal the user has eaten. Call when the user talks about finishing or eating a dish.",
        parameters: {
          type: "object",
          properties: {
            meal_name: {
              type: "string",
              description: "E.g. 'Spaghetti Bolognese', 'Grilled mackerel set'",
            },
          },
          required: ["meal_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_recent_items",
        description:
          "Retrieve the most recently added fridge items. Useful before proposing a dinner menu.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description: "Max rows to return (default 20).",
            },
          },
        },
      },
    },
  ];
}
