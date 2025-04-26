import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function recordMeal(
  supabase: SupabaseClient,
  args: { meal_name: string },
) {
  const { error } = await supabase.from("meal_logs").insert({
    meal_name: args.meal_name,
  });
  if (error) {
    console.error("Error recording meal:", error);
    return {
      status: "error",
      detail: `Failed to record meal: ${error.message}`,
    };
  }
  return {
    status: "success",
    detail: `Recorded meal ${args.meal_name}`,
  };
}
