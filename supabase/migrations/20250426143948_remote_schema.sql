revoke delete on table "public"."fridge_items" from "anon";

revoke insert on table "public"."fridge_items" from "anon";

revoke references on table "public"."fridge_items" from "anon";

revoke select on table "public"."fridge_items" from "anon";

revoke trigger on table "public"."fridge_items" from "anon";

revoke truncate on table "public"."fridge_items" from "anon";

revoke update on table "public"."fridge_items" from "anon";

revoke delete on table "public"."fridge_items" from "authenticated";

revoke insert on table "public"."fridge_items" from "authenticated";

revoke references on table "public"."fridge_items" from "authenticated";

revoke select on table "public"."fridge_items" from "authenticated";

revoke trigger on table "public"."fridge_items" from "authenticated";

revoke truncate on table "public"."fridge_items" from "authenticated";

revoke update on table "public"."fridge_items" from "authenticated";

revoke delete on table "public"."fridge_items" from "service_role";

revoke insert on table "public"."fridge_items" from "service_role";

revoke references on table "public"."fridge_items" from "service_role";

revoke select on table "public"."fridge_items" from "service_role";

revoke trigger on table "public"."fridge_items" from "service_role";

revoke truncate on table "public"."fridge_items" from "service_role";

revoke update on table "public"."fridge_items" from "service_role";

revoke delete on table "public"."meal_logs" from "anon";

revoke insert on table "public"."meal_logs" from "anon";

revoke references on table "public"."meal_logs" from "anon";

revoke select on table "public"."meal_logs" from "anon";

revoke trigger on table "public"."meal_logs" from "anon";

revoke truncate on table "public"."meal_logs" from "anon";

revoke update on table "public"."meal_logs" from "anon";

revoke delete on table "public"."meal_logs" from "authenticated";

revoke insert on table "public"."meal_logs" from "authenticated";

revoke references on table "public"."meal_logs" from "authenticated";

revoke select on table "public"."meal_logs" from "authenticated";

revoke trigger on table "public"."meal_logs" from "authenticated";

revoke truncate on table "public"."meal_logs" from "authenticated";

revoke update on table "public"."meal_logs" from "authenticated";

revoke delete on table "public"."meal_logs" from "service_role";

revoke insert on table "public"."meal_logs" from "service_role";

revoke references on table "public"."meal_logs" from "service_role";

revoke select on table "public"."meal_logs" from "service_role";

revoke trigger on table "public"."meal_logs" from "service_role";

revoke truncate on table "public"."meal_logs" from "service_role";

revoke update on table "public"."meal_logs" from "service_role";

alter table "public"."fridge_items" drop constraint "fridge_items_pkey";

alter table "public"."meal_logs" drop constraint "meal_logs_pkey";

drop index if exists "public"."fridge_items_pkey";

drop index if exists "public"."meal_logs_pkey";

drop table "public"."fridge_items";

drop table "public"."meal_logs";

drop sequence if exists "public"."fridge_items_id_seq";

drop sequence if exists "public"."meal_logs_id_seq";


