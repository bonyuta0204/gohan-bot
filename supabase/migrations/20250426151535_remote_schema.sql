create policy "ALL fridge_items"
on "public"."fridge_items"
as permissive
for all
to public
using (true)
with check (true);


create policy "All meal_logs"
on "public"."meal_logs"
as permissive
for all
to public
using (true)
with check (true);



