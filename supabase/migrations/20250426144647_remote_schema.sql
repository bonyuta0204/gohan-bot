create sequence "public"."fridge_items_id_seq";

create sequence "public"."meal_logs_id_seq";

create table "public"."fridge_items" (
    "id" bigint not null default nextval('fridge_items_id_seq'::regclass),
    "item_name" text not null,
    "added_at" timestamp with time zone default now(),
    "meta" jsonb
);


alter table "public"."fridge_items" enable row level security;

create table "public"."meal_logs" (
    "id" bigint not null default nextval('meal_logs_id_seq'::regclass),
    "meal_name" text not null,
    "eaten_at" date default CURRENT_DATE,
    "meta" jsonb
);


alter table "public"."meal_logs" enable row level security;

alter sequence "public"."fridge_items_id_seq" owned by "public"."fridge_items"."id";

alter sequence "public"."meal_logs_id_seq" owned by "public"."meal_logs"."id";

CREATE UNIQUE INDEX fridge_items_pkey ON public.fridge_items USING btree (id);

CREATE UNIQUE INDEX meal_logs_pkey ON public.meal_logs USING btree (id);

alter table "public"."fridge_items" add constraint "fridge_items_pkey" PRIMARY KEY using index "fridge_items_pkey";

alter table "public"."meal_logs" add constraint "meal_logs_pkey" PRIMARY KEY using index "meal_logs_pkey";

grant delete on table "public"."fridge_items" to "anon";

grant insert on table "public"."fridge_items" to "anon";

grant references on table "public"."fridge_items" to "anon";

grant select on table "public"."fridge_items" to "anon";

grant trigger on table "public"."fridge_items" to "anon";

grant truncate on table "public"."fridge_items" to "anon";

grant update on table "public"."fridge_items" to "anon";

grant delete on table "public"."fridge_items" to "authenticated";

grant insert on table "public"."fridge_items" to "authenticated";

grant references on table "public"."fridge_items" to "authenticated";

grant select on table "public"."fridge_items" to "authenticated";

grant trigger on table "public"."fridge_items" to "authenticated";

grant truncate on table "public"."fridge_items" to "authenticated";

grant update on table "public"."fridge_items" to "authenticated";

grant delete on table "public"."fridge_items" to "service_role";

grant insert on table "public"."fridge_items" to "service_role";

grant references on table "public"."fridge_items" to "service_role";

grant select on table "public"."fridge_items" to "service_role";

grant trigger on table "public"."fridge_items" to "service_role";

grant truncate on table "public"."fridge_items" to "service_role";

grant update on table "public"."fridge_items" to "service_role";

grant delete on table "public"."meal_logs" to "anon";

grant insert on table "public"."meal_logs" to "anon";

grant references on table "public"."meal_logs" to "anon";

grant select on table "public"."meal_logs" to "anon";

grant trigger on table "public"."meal_logs" to "anon";

grant truncate on table "public"."meal_logs" to "anon";

grant update on table "public"."meal_logs" to "anon";

grant delete on table "public"."meal_logs" to "authenticated";

grant insert on table "public"."meal_logs" to "authenticated";

grant references on table "public"."meal_logs" to "authenticated";

grant select on table "public"."meal_logs" to "authenticated";

grant trigger on table "public"."meal_logs" to "authenticated";

grant truncate on table "public"."meal_logs" to "authenticated";

grant update on table "public"."meal_logs" to "authenticated";

grant delete on table "public"."meal_logs" to "service_role";

grant insert on table "public"."meal_logs" to "service_role";

grant references on table "public"."meal_logs" to "service_role";

grant select on table "public"."meal_logs" to "service_role";

grant trigger on table "public"."meal_logs" to "service_role";

grant truncate on table "public"."meal_logs" to "service_role";

grant update on table "public"."meal_logs" to "service_role";


