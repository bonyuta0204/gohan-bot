import { addFridgeItem } from "./add_fridge_item.ts";
import { recordMeal } from "./record_meal.ts";
import { fetchRecentItems } from "./fetch_recent_items.ts";
import { deleteFridgeItem } from "./delete_fridge_item.ts";
import OpenAI from "npm:openai";

export const toolHandlers = {
  add_fridge_item: addFridgeItem,
  record_meal: recordMeal,
  fetch_recent_items: fetchRecentItems,
  delete_fridge_item: deleteFridgeItem,
};

export function getToolSchema(): OpenAI.Responses.Tool[] {
  return [
    {
      type: "function",
      name: "add_fridge_item",
      strict: true,
      description:
        "Add one or more items to the fridge. Use when the user says they bought or still have ingredients.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            description: "One JSON object per item.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                item_name: {
                  type: "string",
                  description: "Ingredient name, singular (e.g. 'broccoli')",
                },
                expire_at: {
                  type: "string",
                  description: "Optional; expiration date in ISO8601 format.",
                },
                note: {
                  type: "string",
                  description: "Optional; any note about the item.",
                },
              },
              required: ["item_name", "expire_at", "note"],
            },
          },
        },
        required: ["items"],
      },
    },
    {
      type: "function",
      name: "record_meal",
      strict: true,
      description:
        "Log a meal the user has eaten. Call when the user talks about finishing or eating a dish.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          meal_name: {
            type: "string",
            description: "E.g. 'Spaghetti Bolognese', 'Grilled mackerel set'",
          },
        },
        required: ["meal_name"],
      },
    },
    {
      type: "function",
      name: "fetch_recent_items",
      strict: true,
      description:
        "Retrieve the most recently added fridge items. Useful before proposing a dinner menu.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: {
            type: "integer",
            description: "Max rows to return (default 20).",
          },
        },
        required: ["limit"],
      },
    },
    {
      type: "function",
      name: "delete_fridge_item",
      strict: true,
      description:
        "Delete one or more items from the fridge by their ids. Use when the user wants to remove or discard specific fridge items.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          ids: {
            type: "array",
            items: { type: "integer" },
            description:
              "The ids (primary keys) of the fridge items to delete.",
          },
        },
        required: ["ids"],
      },
    },
  ];
}
