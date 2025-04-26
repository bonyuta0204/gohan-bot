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
        description: "Add an item to the user's fridge",
        parameters: {
          type: "object",
          properties: {
            item_name: {
              type: "string",
              description: "Name of the item to add",
            },
          },
          required: ["item_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "record_meal",
        description: "Record a meal eaten by the user",
        parameters: {
          type: "object",
          properties: {
            meal_name: { type: "string", description: "Name of the meal" },
          },
          required: ["meal_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fetch_recent_items",
        description: "Fetch recently added fridge items for the user",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description: "Max number of items to fetch",
            },
          },
          required: [],
        },
      },
    },
  ];
}
