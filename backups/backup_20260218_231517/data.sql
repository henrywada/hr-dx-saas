SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict hGTMsbX0KwLQIymvpWfg8UaaDl4bUrzhLvQ0tyqk3jOFhpyrBnmNPid4sLWeetO

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'ec270dee-a0cd-45c8-8a26-f04b6d943f4f', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test@gmail.com","user_id":"610ac6ac-395b-436a-b7f3-8a6d83cb073c","user_phone":""}}', '2026-02-13 11:42:20.965022+00', ''),
	('00000000-0000-0000-0000-000000000000', '638d1493-b306-464d-ae30-db3d46e41cb4', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test1@gmail.com","user_id":"467befb4-ee25-433c-be40-886ba3871d97","user_phone":""}}', '2026-02-13 11:42:52.826275+00', ''),
	('00000000-0000-0000-0000-000000000000', '9fd15386-38d9-4a1a-a376-1f08fc443b7b', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"wada007@gmail.com","user_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","user_phone":""}}', '2026-02-13 12:40:48.264402+00', ''),
	('00000000-0000-0000-0000-000000000000', '7c0cbe8f-a3be-42ed-969b-843f9103e115', '{"action":"user_recovery_requested","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-17 05:36:52.128564+00', ''),
	('00000000-0000-0000-0000-000000000000', '19e1308f-3f76-4277-8915-d6cf8be36356', '{"action":"login","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-17 08:20:22.639353+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f3ba797-38b8-4556-b546-a30cfb8b3ab1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 09:18:22.970624+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb4736ab-613f-41ea-b204-acb4960df616', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 09:18:22.971752+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a9d654d5-404d-44dd-9019-0c7a5a5d0ac7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:30.593478+00', ''),
	('00000000-0000-0000-0000-000000000000', '3111dfce-c177-4c77-b24b-2dad37f25778', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:30.595822+00', ''),
	('00000000-0000-0000-0000-000000000000', '7c3a5f53-bc65-4e61-9bfd-9287aec8bf0d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:30.975695+00', ''),
	('00000000-0000-0000-0000-000000000000', '2cffd516-0ab3-42d4-9158-f339147bbf60', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:31.25718+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a5a2e1bf-d511-4836-8498-1044c8cbd2ff', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:31.533382+00', ''),
	('00000000-0000-0000-0000-000000000000', '7d8b1f1a-33c4-45fd-9e06-892fc218a083', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:31.798744+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd1d669dc-1f2c-4e04-81b4-051c8ebc4801', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:32.092085+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a464837d-2331-418d-a947-daa88b4fa2fc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:32.35572+00', ''),
	('00000000-0000-0000-0000-000000000000', '2c1b6867-8f79-42a3-a6c0-85b11d32d347', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:32.606804+00', ''),
	('00000000-0000-0000-0000-000000000000', '57f0100a-242c-417a-a056-816bfcaf37fd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:32.849631+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e3bf30a8-0447-4b0f-8da3-bb5fb08ffc1d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:33.113005+00', ''),
	('00000000-0000-0000-0000-000000000000', '77faefda-bd80-477f-8f00-4d4f8ce8900d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:33.357424+00', ''),
	('00000000-0000-0000-0000-000000000000', '9bbc5542-e07d-488c-9a9a-d7a5718df774', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:33.592711+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c4f8ea25-a439-413d-b0f1-b5a7ad4ae0e3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:33.827727+00', ''),
	('00000000-0000-0000-0000-000000000000', '508f6bda-0733-454b-b37e-1beeac6a2f14', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:34.081498+00', ''),
	('00000000-0000-0000-0000-000000000000', '57c7116f-75aa-44c8-b4c1-e3bb25bec2c0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:34.327252+00', ''),
	('00000000-0000-0000-0000-000000000000', '57dda112-2cbf-4da3-9b15-10ef9a5ebd5e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:34.579531+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f84c15eb-5b11-438a-8a65-c432bcd73695', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:34.816242+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b0434884-fd80-4fb1-959d-d40193f8bde2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:35.048426+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fab31c3a-8867-494a-9ec6-362874a7667e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:35.297281+00', ''),
	('00000000-0000-0000-0000-000000000000', '6731fdcc-9e33-4570-938f-83851d80f49d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:35.572648+00', ''),
	('00000000-0000-0000-0000-000000000000', '01912977-6666-4b2b-9cdf-702e107ccde1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:35.804952+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e08e026b-fffd-4b1a-99e2-646a3220db10', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:36.046891+00', ''),
	('00000000-0000-0000-0000-000000000000', '247fd7d5-6b15-4313-8742-3ca18b0aa553', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:36.304101+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a0bf935-70ad-4142-adfd-f9db5465529c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:36.557889+00', ''),
	('00000000-0000-0000-0000-000000000000', '364a0007-c6e7-412d-a9b7-bf7c44260daa', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:36.78837+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd02ea833-730e-4140-880b-92b25e3b08cc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:37.034635+00', ''),
	('00000000-0000-0000-0000-000000000000', '8d3b664d-f3bd-4ca5-a705-8fca08ec0b9a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:37.298512+00', ''),
	('00000000-0000-0000-0000-000000000000', '1d3e56e2-fa83-4c61-8e26-b111b17504c7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:37.544324+00', ''),
	('00000000-0000-0000-0000-000000000000', 'afd7922c-96e0-4385-b826-69e2f59b4cb3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:37.820637+00', ''),
	('00000000-0000-0000-0000-000000000000', '408b5e85-ed4c-426a-9180-14112b8b60e2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:38.058881+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cc4285ba-315b-43e8-8611-870aac4b1738', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:38.29788+00', ''),
	('00000000-0000-0000-0000-000000000000', '94bf604f-6183-43d4-b558-b25b3c54fa29', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:38.531851+00', ''),
	('00000000-0000-0000-0000-000000000000', '0697ddc1-31bb-4088-b9c4-b00b956d173d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:38.765339+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a26e0d16-d8c6-44ba-b58e-324b3848f82e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:39.003511+00', ''),
	('00000000-0000-0000-0000-000000000000', '9cd4c2f9-cdbc-4ca6-8b5a-1b4aa82bc75d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:39.242021+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c0e5dcaa-3bfa-4390-bab3-43b8be418988', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:39.483274+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f2d3110a-061b-4326-b74d-5df950ecdb8d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:39.715618+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ba75cf76-2f48-4a70-a91c-998943b34dbd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:39.97242+00', ''),
	('00000000-0000-0000-0000-000000000000', '9c055ada-3974-4f34-b0b9-b063224b1636', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:40.207897+00', ''),
	('00000000-0000-0000-0000-000000000000', '73351879-c913-4d94-a7b9-a4526f63edc2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:40.457334+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c5cbb60-861c-4173-a721-3f1d0c9385ea', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:40.679116+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fbddb27d-d0b9-4255-b2e1-0dfae4c702b7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:40.904304+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a649e8b0-1af5-43d9-90a7-0a27448839f3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:41.136506+00', ''),
	('00000000-0000-0000-0000-000000000000', '37b55f4e-f0d1-42e9-8fe3-4964cf372af4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:41.354121+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c7ba3198-f642-42f0-85da-684757995675', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:41.621262+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b68a012d-2b03-476b-bc98-e90d6bb526f3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:41.892384+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f4a158b3-2fcd-4d28-90ff-10f74a497e4a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:42.127452+00', ''),
	('00000000-0000-0000-0000-000000000000', '771f39ff-0013-46be-9cae-5308e588b833', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:42.370906+00', ''),
	('00000000-0000-0000-0000-000000000000', '4f6bafe6-1dc7-4cd8-8d19-26739b18da8e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:42.626624+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c6f8a177-3c66-4171-b35a-0dc92eed0b15', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:42.864053+00', ''),
	('00000000-0000-0000-0000-000000000000', '0a3bb57a-1496-40ca-a9bc-4fe023a4d994', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:43.104798+00', ''),
	('00000000-0000-0000-0000-000000000000', '6c5a9fb7-8563-4a33-a198-3f787c4ac2d7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:43.333125+00', ''),
	('00000000-0000-0000-0000-000000000000', '81f7d9f3-aff4-4552-b27f-44d39c4d6ef0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:43.570104+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f5aba2fe-e537-4198-9eb7-d45dab70feac', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:43.806258+00', ''),
	('00000000-0000-0000-0000-000000000000', '034c0b66-7764-49d0-845f-539f6b2d8424', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:44.069657+00', ''),
	('00000000-0000-0000-0000-000000000000', '60c8ae57-97ad-4bb6-8ea7-dcd3f9f0503d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:44.337202+00', ''),
	('00000000-0000-0000-0000-000000000000', '6cf6ffb4-6bfc-48b3-a495-8754af7de635', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:44.583236+00', ''),
	('00000000-0000-0000-0000-000000000000', '3931727e-3738-4fd5-9dc6-d75e8093dfd6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 10:18:44.835288+00', ''),
	('00000000-0000-0000-0000-000000000000', '1e243a48-c53a-45ea-9221-d753f7d1babe', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 11:22:12.119212+00', ''),
	('00000000-0000-0000-0000-000000000000', '068a53bb-5b12-4691-8564-647bb3562c97', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 11:22:12.122042+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e0c1edc3-8eda-48f1-95cf-d878d3f7eb24', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 12:21:01.522742+00', ''),
	('00000000-0000-0000-0000-000000000000', 'df0c28aa-68aa-4fc7-9305-196b5a684d04', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 12:21:01.524647+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aed0725c-fe6f-4a13-9a75-0352ee2aa8da', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 13:19:30.881658+00', ''),
	('00000000-0000-0000-0000-000000000000', '144fdab0-6cdd-4392-83de-bf2534bdf997', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 13:19:30.883597+00', ''),
	('00000000-0000-0000-0000-000000000000', '80c0277e-544d-4f6f-92ad-9bcd9dd4209e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 02:37:39.376976+00', ''),
	('00000000-0000-0000-0000-000000000000', '98d72343-0f69-4832-a104-6345caaa6a9d', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 02:37:39.379446+00', ''),
	('00000000-0000-0000-0000-000000000000', '959f8c2c-77b2-4da9-941c-2f8524a570db', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:05.854778+00', ''),
	('00000000-0000-0000-0000-000000000000', '26882525-b236-415a-941a-b573bf272cdf', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:05.857306+00', ''),
	('00000000-0000-0000-0000-000000000000', '56817a64-e713-4b52-8409-ad71e9d720dc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:05.938456+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cea1ebe1-806d-48d2-a8e0-275c06c32f8d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:05.968121+00', ''),
	('00000000-0000-0000-0000-000000000000', '13ae512e-55f3-40b3-a697-4c312c8630a3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:06.081539+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce15f573-bf28-4b42-a0a6-14b307f02eda', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 03:37:06.292826+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fe7194b5-ee09-46bf-b84e-caad62b2a765', '{"action":"logout","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-02-18 03:38:51.76248+00', ''),
	('00000000-0000-0000-0000-000000000000', '9cde03cc-8480-455d-baad-4ed0659ca8f4', '{"action":"login","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-18 03:39:26.80107+00', ''),
	('00000000-0000-0000-0000-000000000000', '295f9f94-36d2-4c29-b349-fe3573dd569b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 04:37:57.943255+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e1fe97e1-e91b-48ba-9ec6-b0fd46b0525f', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 04:37:57.945984+00', ''),
	('00000000-0000-0000-0000-000000000000', '308c49f8-285f-45a6-aeee-389a39330602', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 05:36:24.434217+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ba883e3c-c766-4647-bd91-4a697801fe91', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 05:36:24.436228+00', ''),
	('00000000-0000-0000-0000-000000000000', '5e4806f3-ea9d-4d00-93a2-65237f62363b', '{"action":"logout","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-02-18 05:43:37.017016+00', ''),
	('00000000-0000-0000-0000-000000000000', '02c9935c-5d69-4bc1-9d79-678b4bedefca', '{"action":"login","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-18 05:43:44.896698+00', ''),
	('00000000-0000-0000-0000-000000000000', '683997d1-785f-4a33-aa74-3528c0f393e7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 06:44:59.301266+00', ''),
	('00000000-0000-0000-0000-000000000000', '9a7eaba1-8ccb-40d4-9839-bb489119fb3a', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 06:44:59.303699+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e79eb620-f20d-4030-9129-fc08c5aa07b9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 07:43:27.413934+00', ''),
	('00000000-0000-0000-0000-000000000000', '261c1991-7a67-4436-a334-a137bfff939c', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 07:43:27.415874+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb6c4a1c-2c43-444f-9036-797676a777b6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 08:41:35.390622+00', ''),
	('00000000-0000-0000-0000-000000000000', '521bad1b-9d69-4be6-a4db-77ca3ee4bdc4', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 08:41:35.39244+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f0f7d5ee-f81a-4224-aa6d-ccd742df3e10', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 09:39:51.664105+00', ''),
	('00000000-0000-0000-0000-000000000000', '61fa54d8-a401-4e75-8b03-9e5d0fb89692', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 09:39:51.66497+00', ''),
	('00000000-0000-0000-0000-000000000000', '21a7ef99-0470-407a-9350-4172a6a9ce01', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.548361+00', ''),
	('00000000-0000-0000-0000-000000000000', '6a5b89b5-13f7-4308-b3cd-5a8fdb5d7948', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.551363+00', ''),
	('00000000-0000-0000-0000-000000000000', '898e7307-d95d-4174-9fe5-c939721c1c40', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.67429+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b56922a3-fdb8-4d1d-954d-114fa03d4bb0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.78362+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c3ae141-4670-4046-ae23-60998f0d0ee2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.891252+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b8f177fa-188b-4562-8560-56816baa8a03', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.905606+00', ''),
	('00000000-0000-0000-0000-000000000000', '82f26e4b-93d5-477a-8e1e-c6de7ed86ae2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:29.931879+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b65adf6c-fa75-467a-8e17-6bcbb5568840', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:30.187615+00', ''),
	('00000000-0000-0000-0000-000000000000', '8f91c56a-2ec3-4671-8719-c2f32ee7c28d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:30.972709+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e5fb4c7c-2aa5-4321-a7c3-70fa7ba6d927', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.003664+00', ''),
	('00000000-0000-0000-0000-000000000000', '04f906b1-54cb-4372-ab7f-f6e2dfcfbcaa', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.109962+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f09e804b-3ae2-4898-8e92-de148d365006', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.259868+00', ''),
	('00000000-0000-0000-0000-000000000000', '52011f83-7e95-426f-8ed8-6573cb8e1e22', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.407223+00', ''),
	('00000000-0000-0000-0000-000000000000', '50e526db-34bf-4503-8f45-0f5c4f438997', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.437238+00', ''),
	('00000000-0000-0000-0000-000000000000', '64cb02ee-5936-4426-b88f-186d546e7c98', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.52365+00', ''),
	('00000000-0000-0000-0000-000000000000', '871bbf0f-ad90-443f-bee8-b44f0338e1a6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.650067+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f99b0280-6f14-48f4-9d46-4e9949c24605', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.662367+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ef172c7-772c-4957-85a0-e554ab0f8685', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.822345+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd17b604c-fb16-4686-9629-28f1966470a9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:31.84143+00', ''),
	('00000000-0000-0000-0000-000000000000', '7cb7b73a-db5a-4729-ad54-7ab23f786468', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.074324+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a7643e50-3a58-4095-bae7-031bca71b8da', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.089228+00', ''),
	('00000000-0000-0000-0000-000000000000', '68f3f2c0-7d96-4777-bd43-bec8b4191e06', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.240545+00', ''),
	('00000000-0000-0000-0000-000000000000', '4c0750f6-16ec-4160-93cf-e8d9dbdbb15b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.276766+00', ''),
	('00000000-0000-0000-0000-000000000000', '30577ed9-3a9b-4dc1-8bd4-8afd93335cac', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.456578+00', ''),
	('00000000-0000-0000-0000-000000000000', '578ceb13-4ab6-420b-83d7-c3743b288359', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.486791+00', ''),
	('00000000-0000-0000-0000-000000000000', '8155f02f-9caf-43c3-a824-0467787db073', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.60458+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd5559994-048e-4d6c-b315-4513070324bd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.689081+00', ''),
	('00000000-0000-0000-0000-000000000000', '0f6b46b3-20e1-4d06-a560-5b11cb0e4972', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.781114+00', ''),
	('00000000-0000-0000-0000-000000000000', '8f4e26e9-ce24-4cdc-9e99-eb212ada4a2c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.853517+00', ''),
	('00000000-0000-0000-0000-000000000000', '317d1111-f99b-40dd-bf5d-99624d922554', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:32.903659+00', ''),
	('00000000-0000-0000-0000-000000000000', '3467b95d-0773-428f-8200-e9a3ddffe3c0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.017138+00', ''),
	('00000000-0000-0000-0000-000000000000', '7505cf6d-0541-4ca7-9fe7-4f48c44e67f9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.074337+00', ''),
	('00000000-0000-0000-0000-000000000000', '37246635-68ce-40ad-b959-0bb24dd7a18f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.146894+00', ''),
	('00000000-0000-0000-0000-000000000000', '14987647-8c81-4dca-98b3-11c129fec9b8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.242235+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a5242fa1-6d49-4d5c-83b0-00fff6cae0a4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.358091+00', ''),
	('00000000-0000-0000-0000-000000000000', '08a36518-24e3-41c9-93b1-3b728a0c1de7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.401018+00', ''),
	('00000000-0000-0000-0000-000000000000', '1328421c-79a5-4900-8e26-c5b567992231', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.477168+00', ''),
	('00000000-0000-0000-0000-000000000000', '37750ca9-1a1e-45ea-a7fa-5d5474e35992', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.594646+00', ''),
	('00000000-0000-0000-0000-000000000000', '99a8f43a-02fb-494b-95f4-cbfe6282b96b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.701218+00', ''),
	('00000000-0000-0000-0000-000000000000', '2cc57a79-387f-4750-a407-73d419d5e780', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.735145+00', ''),
	('00000000-0000-0000-0000-000000000000', '0852f90e-6ee2-41ed-8056-d31a49b5b19a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.887534+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c19ef2fd-670a-45cf-98bc-f9e4fe7db4f1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:33.951951+00', ''),
	('00000000-0000-0000-0000-000000000000', '635cc5b6-8715-448a-88ae-361485bc3d4b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.015222+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc5f0742-42bf-4c35-b787-a1f7944c1cd8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.080321+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a774d90-55ee-4712-9629-5c0a0e87e1f6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.269961+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a4779372-78d2-43f7-a6d8-1bdb08cbaf44', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.294546+00', ''),
	('00000000-0000-0000-0000-000000000000', '14a7d8ba-16b2-4c43-adc3-3a1bc548a52d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.342974+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e95fa993-dafd-4436-be07-79e16e1acc9c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.399541+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e77f7884-ba1f-4008-8e77-f5c31b39d3b9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.597785+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f3ea438d-bdba-4d5a-8bfd-eac14143cfa7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.63465+00', ''),
	('00000000-0000-0000-0000-000000000000', '07a3af3d-fc78-48f4-9672-3d45a6c90a73', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.727742+00', ''),
	('00000000-0000-0000-0000-000000000000', '7bfad789-bccd-4ffb-bcf0-a77e4da4b290', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.839153+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f192f8b-e1eb-4403-926f-d441f06595fc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.922417+00', ''),
	('00000000-0000-0000-0000-000000000000', '3b55c3a8-b086-4fdb-9ad4-bd140294448f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:34.965119+00', ''),
	('00000000-0000-0000-0000-000000000000', '9ce977ab-6993-485b-8cb6-d3ef261411c8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.064237+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ac2d7db-b236-4e3c-9489-120c20afe00f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.171326+00', ''),
	('00000000-0000-0000-0000-000000000000', '97674ed1-8bdc-4037-a2f3-aac8f539c477', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.293445+00', ''),
	('00000000-0000-0000-0000-000000000000', '33655b4e-1454-4e57-8a29-8f5d3ef3725a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.329808+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bdb2afa5-697d-4e5c-8d10-cd4307c602ae', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.425549+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ee27e1e0-5f26-424f-8bac-6455a8989f3a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.489648+00', ''),
	('00000000-0000-0000-0000-000000000000', '3fffa818-b56e-4209-86e1-d9e7ba33d38f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.669205+00', ''),
	('00000000-0000-0000-0000-000000000000', '2311d3f2-626a-4f56-b1aa-174a5a472b55', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.74653+00', ''),
	('00000000-0000-0000-0000-000000000000', '60ee71bc-fd0e-42a5-8a07-1218f418fafd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.786517+00', ''),
	('00000000-0000-0000-0000-000000000000', '854d14c7-1296-45fa-a820-c668772b421b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:35.827603+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f1194e2f-c85a-42bc-87c9-8747ab38a5be', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.004775+00', ''),
	('00000000-0000-0000-0000-000000000000', '2d8752d0-8c03-4c36-8a3d-9028073cde00', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.047102+00', ''),
	('00000000-0000-0000-0000-000000000000', '54b859c5-0bb3-4814-9311-dd44ab7c460f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.139313+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c6503986-b4c8-4140-8020-5f9c6cdfac41', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.164219+00', ''),
	('00000000-0000-0000-0000-000000000000', '72ef0f21-88b6-4e1f-9a5a-d8cc99a7c853', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.314239+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a7015cf0-01b7-4afe-ac12-013c4584b726', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.355051+00', ''),
	('00000000-0000-0000-0000-000000000000', '9e1d5206-ea3d-45c5-8228-1ea314338f12', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.425197+00', ''),
	('00000000-0000-0000-0000-000000000000', 'db0d73c6-70f4-4d7a-821b-afc0a1dc729d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.515471+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bb18749d-a0ef-4569-a962-541f01363937', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.634269+00', ''),
	('00000000-0000-0000-0000-000000000000', '99a6a1c2-c3ea-41f0-8439-605863cbf4f8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.703591+00', ''),
	('00000000-0000-0000-0000-000000000000', '788bd7a3-e50f-43a8-84fa-8358f4a4e949', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.741291+00', ''),
	('00000000-0000-0000-0000-000000000000', '8929c98c-a87a-4bc4-accd-6fb9e9531a34', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.845823+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c533b572-8e6d-41ea-801d-05c4f9242997', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:36.965706+00', ''),
	('00000000-0000-0000-0000-000000000000', '2970da83-71e9-4a81-ba86-22b9fc62d7c8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.119926+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bb0b595b-a567-492a-bc0d-17b1e7ac9736', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.258093+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f6eee09-c3ba-440e-81e4-e55376b52958', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.331972+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd810bb1b-e67d-4a84-b709-ea303b53423d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.377261+00', ''),
	('00000000-0000-0000-0000-000000000000', 'db64def4-f3ea-44b6-88d8-0bffe657e17b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.462619+00', ''),
	('00000000-0000-0000-0000-000000000000', '320e149c-2bc9-40a1-ad25-a27b885f7f8f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.67092+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f457cf3-0b58-4a16-a547-ced0beb91d6e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.691419+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8a70373-f121-4ab3-bb64-9880e5d80176', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.761128+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3f08390-fb36-47d8-858f-00b721577bb4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:37.816742+00', ''),
	('00000000-0000-0000-0000-000000000000', '65437274-c072-4090-99a7-5f113fc66835', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.000972+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a9071b35-3520-481e-bb76-656bf872b0d2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.258451+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f858b884-7161-436c-9221-6d27680f3d7c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.283846+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f2b5d762-25a9-4f6d-9b3f-e7652f5e25dd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.405812+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae78f5ff-0a22-4a45-83b2-aa5dea2759e8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.429037+00', ''),
	('00000000-0000-0000-0000-000000000000', '98b0790e-8f23-4d34-b410-f965006e873c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.56318+00', ''),
	('00000000-0000-0000-0000-000000000000', '584753c3-5a13-4ccd-8c96-88de2ba3135d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.610717+00', ''),
	('00000000-0000-0000-0000-000000000000', '62f7b09a-8327-4a5c-b8a2-66d9e96a924c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.78284+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f475bf5e-a6a7-40d3-9994-af2e80666aa5', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.795112+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c9d219ae-7577-4b8c-a3ab-dcf8ca1d5749', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:38.985197+00', ''),
	('00000000-0000-0000-0000-000000000000', '76096353-6a3b-4e6b-97e3-f552e238b720', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.096912+00', ''),
	('00000000-0000-0000-0000-000000000000', '870c6588-61bd-4fbe-bcd6-73c1b4ba8874', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.171458+00', ''),
	('00000000-0000-0000-0000-000000000000', '34a710e6-74d7-43ea-bfd6-38f8f0d11f7d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.295428+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dee7a73c-421b-4a4a-b37d-b8fdb051bca4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.329225+00', ''),
	('00000000-0000-0000-0000-000000000000', '9e074486-25e9-4c79-919e-a24d80c9c8a8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.453809+00', ''),
	('00000000-0000-0000-0000-000000000000', '49b8d76e-1f8f-4818-81e4-fbff22572164', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.492938+00', ''),
	('00000000-0000-0000-0000-000000000000', '10a4feab-7e5d-44b7-9def-6acc60407b30', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.597782+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cd2dc912-340c-411c-b2c0-dd6aaa025e65', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:39.643065+00', ''),
	('00000000-0000-0000-0000-000000000000', '31d4a471-ef72-46e0-be8e-7d88ad92d9cd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:40.547748+00', ''),
	('00000000-0000-0000-0000-000000000000', '5093fabe-1e20-4776-8c78-7e64d9dc1a2a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:40.603029+00', ''),
	('00000000-0000-0000-0000-000000000000', '38df7ec1-043d-4fb5-bda6-5b241e620242', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:40.718649+00', ''),
	('00000000-0000-0000-0000-000000000000', '8686cc71-7851-4984-bb4f-5bb18cb587c4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:40.73872+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e24de42f-1b10-47cb-8380-4f0392919227', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:41.940893+00', ''),
	('00000000-0000-0000-0000-000000000000', '3f93d996-fddb-4d9c-9ced-a82cc995d7d3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:41.982368+00', ''),
	('00000000-0000-0000-0000-000000000000', '268ba56e-bdb2-42a0-ab71-3f82090251e3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.174513+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b785660a-89e0-459c-96c1-3c7dc89f613a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.308437+00', ''),
	('00000000-0000-0000-0000-000000000000', '21378864-8a16-49f9-9960-31705bd69805', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.350611+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b125a8e8-1ca8-4ba3-9116-7a42644c8487', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.416707+00', ''),
	('00000000-0000-0000-0000-000000000000', '5c80fad6-8425-4646-9f01-17160011dff4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.530449+00', ''),
	('00000000-0000-0000-0000-000000000000', '341e7f39-a102-4c95-b36c-690a32fc89e9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.58805+00', ''),
	('00000000-0000-0000-0000-000000000000', '0f3a3816-201e-452b-99b6-ef7ae37298d4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.669073+00', ''),
	('00000000-0000-0000-0000-000000000000', '9b3fb3f9-627c-4851-8f45-f087beb1f88e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.810499+00', ''),
	('00000000-0000-0000-0000-000000000000', '4b28b661-1acd-4016-aa7f-752b49dfda5e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.834311+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b11bfa3d-b223-4caf-9106-5c04f2c43c7b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.908935+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e8bbe027-866f-4684-b8c1-f1b42fc9783a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:42.975029+00', ''),
	('00000000-0000-0000-0000-000000000000', '4a843f03-d5cd-43df-86e2-16a9588eb31a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.142231+00', ''),
	('00000000-0000-0000-0000-000000000000', '1a9cf4cb-9a5d-47c7-9bc9-d63e3684eef1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.170519+00', ''),
	('00000000-0000-0000-0000-000000000000', '508796b6-e322-494e-95a5-f3ba5f159850', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.237528+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd86d9ba3-feb2-4978-9106-61736fe81168', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.292464+00', ''),
	('00000000-0000-0000-0000-000000000000', '0232f0d2-060d-4414-97aa-1aee32412b0a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.484184+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c79de08c-1879-435c-b578-e6e7315e1f57', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.556347+00', ''),
	('00000000-0000-0000-0000-000000000000', '80670921-ccac-469e-96f6-76184df0f0f4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.610923+00', ''),
	('00000000-0000-0000-0000-000000000000', '6436cd62-2e82-4813-9090-cb44e25567d5', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.708547+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be655f89-26d7-45c6-8c68-60f2b4073260', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.784402+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f8d63c5-f933-40e8-a881-22750f6d44d2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.832063+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f080731f-01f2-4d6f-8d64-abc8e60c74fb', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:43.904416+00', ''),
	('00000000-0000-0000-0000-000000000000', '7af1bfbf-9305-44c5-a5e7-f697e2d8eecb', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.040917+00', ''),
	('00000000-0000-0000-0000-000000000000', '1cacdf0a-7c6f-451a-93df-9b62f1fd021a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.125839+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd9c81147-745f-4f27-a558-cb0686de2244', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.183164+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fc7032a2-0cc8-478f-aa84-16e335e4d7e8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.270483+00', ''),
	('00000000-0000-0000-0000-000000000000', '4dfef383-daec-4f27-b394-b289973edc42', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.403811+00', ''),
	('00000000-0000-0000-0000-000000000000', '0e7b7c2d-b5b9-482d-8657-457bc85369e1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.529495+00', ''),
	('00000000-0000-0000-0000-000000000000', '6ea74586-1423-41d8-8b84-db71710adee5', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.630374+00', ''),
	('00000000-0000-0000-0000-000000000000', '466e68f9-bef5-4104-9eb4-cc3b57381bac', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.649654+00', ''),
	('00000000-0000-0000-0000-000000000000', '74fa1417-876b-4b8d-9bf6-7bb20172039d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:44.81774+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c66b4384-a6fd-44fc-b8dd-534acd668f5e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.074627+00', ''),
	('00000000-0000-0000-0000-000000000000', '211f8905-c096-4df1-b5e4-b388c6e0f57b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.25115+00', ''),
	('00000000-0000-0000-0000-000000000000', '2d86bec0-2cf8-4eb2-b3ae-086c9e2ea03a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.314392+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be410dcc-669b-4649-9fde-c43c2731b990', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.360666+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fd6fa21a-e2b2-4866-b408-da32166090ca', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.443946+00', ''),
	('00000000-0000-0000-0000-000000000000', '1fbeaae8-5cdd-4589-aecc-06878b1908d4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.575394+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e798d688-5af2-4b7e-913d-babdf84640b8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.622956+00', ''),
	('00000000-0000-0000-0000-000000000000', '50dcc41f-f467-408b-a5e5-d56380251772', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.679122+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd4d59cf4-f928-4352-be69-5fed325ad99e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.821608+00', ''),
	('00000000-0000-0000-0000-000000000000', '2c1acb9d-840e-402a-99d8-a9d50fe5cd06', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.87559+00', ''),
	('00000000-0000-0000-0000-000000000000', 'afe36e85-8e0e-42a4-a6a3-bdb268f7bc59', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.949931+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a40f61a3-bbe6-4992-9d60-5ba71eaec552', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:45.992885+00', ''),
	('00000000-0000-0000-0000-000000000000', '21e1311c-f15e-48f7-84b7-1fececfbd0da', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.170528+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bfc4f763-3802-4d46-88dc-a643855db0f2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.218778+00', ''),
	('00000000-0000-0000-0000-000000000000', '99d3f73c-ad15-4d64-bfb3-254d6be8aea7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.284422+00', ''),
	('00000000-0000-0000-0000-000000000000', '16b879ba-57d2-405d-a331-e683fac617ee', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.3242+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a63804fa-54ca-43ee-b55a-15c7446c34f2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.561408+00', ''),
	('00000000-0000-0000-0000-000000000000', '38f52fe6-27b6-45cd-8927-9d67da7c6936', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.617778+00', ''),
	('00000000-0000-0000-0000-000000000000', '7dbd0069-caff-4ce6-a6ca-b108bdaa8bd3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.641884+00', ''),
	('00000000-0000-0000-0000-000000000000', '849570ea-3b33-4498-a4b9-077fe7e1894e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.667523+00', ''),
	('00000000-0000-0000-0000-000000000000', '1fd20763-d7cf-4e18-b22e-d7a93f34483c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.871509+00', ''),
	('00000000-0000-0000-0000-000000000000', '6a582d96-5fc1-4032-9fac-b6f6747f69cb', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.937536+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce7e7e2b-c635-4e00-9d1a-2abb2e428c85', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:46.96586+00', ''),
	('00000000-0000-0000-0000-000000000000', '27f0386a-4245-4195-82ec-19d5d18fb433', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.024956+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ef471263-ff0a-49e0-9cdb-137f017cd008', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.19392+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f3f4b1e2-53be-4dfd-8735-b1185d01b111', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.275157+00', ''),
	('00000000-0000-0000-0000-000000000000', '18833e6d-8519-4181-8bf6-50e6996cac8b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.339293+00', ''),
	('00000000-0000-0000-0000-000000000000', '088d0b08-798d-4b7c-a57a-a94b6683e0c0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.392004+00', ''),
	('00000000-0000-0000-0000-000000000000', '08445ed3-4b1b-4472-aeca-a62051433ece', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.521168+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cebe7331-3168-4d19-bed6-846fdf890d66', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.563093+00', ''),
	('00000000-0000-0000-0000-000000000000', '786466a3-8035-486c-a886-684906b8ad5a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.652136+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e8233a79-5fbf-40d3-8cb8-0bff561ca803', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.76108+00', ''),
	('00000000-0000-0000-0000-000000000000', '5fbe8b3c-57c7-43e2-bff3-a50339bf34f7', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.845133+00', ''),
	('00000000-0000-0000-0000-000000000000', '7ad173b8-a4b7-4238-9747-53495b2eed9a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:47.884348+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c78598f8-9894-44d2-b98d-09638f39ff56', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.006854+00', ''),
	('00000000-0000-0000-0000-000000000000', '37925f89-eca4-4861-a6ee-b593830edc7f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.143298+00', ''),
	('00000000-0000-0000-0000-000000000000', '30a718b9-9d5f-4f5a-963c-a381bdaebb3d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.268364+00', ''),
	('00000000-0000-0000-0000-000000000000', '07a3ead1-dc2a-477f-927f-47a0934429e8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.34218+00', ''),
	('00000000-0000-0000-0000-000000000000', '2a39a3b7-760c-4b73-8a1d-43d7b1705004', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.389404+00', ''),
	('00000000-0000-0000-0000-000000000000', '87ae4e2d-a7fc-4e17-99e7-64d56828a508', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.476381+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c0bf1ba-4318-4757-a964-1d17b2c44358', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.625512+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e0d55f6c-3ffc-4c83-9de7-de682425ad6c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.67318+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed840808-d8b9-4a16-8526-a90b8f36699a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.74785+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ee8ac4fd-6386-40fc-8b4a-7dbc7bece9dd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.784347+00', ''),
	('00000000-0000-0000-0000-000000000000', '6f78b5f8-142a-4718-9fb3-98db729d7395', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.936099+00', ''),
	('00000000-0000-0000-0000-000000000000', '88c03f1f-bb20-409b-aebd-3bb3f45440e9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:48.994876+00', ''),
	('00000000-0000-0000-0000-000000000000', '51365f06-d054-48e2-b7a1-6e65afb08e3c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.069645+00', ''),
	('00000000-0000-0000-0000-000000000000', '6d182315-d26e-4ba8-b929-eeae6aecd59e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.189257+00', ''),
	('00000000-0000-0000-0000-000000000000', '338040a6-2631-43cc-91cc-c5e931ff4432', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.248719+00', ''),
	('00000000-0000-0000-0000-000000000000', '82a2af9e-76ae-4d13-a7ae-9ae9b8852614', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.31222+00', ''),
	('00000000-0000-0000-0000-000000000000', '1fbe148e-7837-40ce-a29e-048b7df941e4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.406553+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c32982f6-3fde-4b18-bf3d-7249001b0f54', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.53195+00', ''),
	('00000000-0000-0000-0000-000000000000', '969c2d98-95fb-4c9f-a71c-89c8c679d89d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.597294+00', ''),
	('00000000-0000-0000-0000-000000000000', '144da966-b916-497b-8c2e-5d91c90c7a8d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.64307+00', ''),
	('00000000-0000-0000-0000-000000000000', '47b29a73-6253-4814-a6ed-d5c54898b03d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.724287+00', ''),
	('00000000-0000-0000-0000-000000000000', '648fb1cc-ff9f-4a83-b3c0-2a3d7f8fb72b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.886006+00', ''),
	('00000000-0000-0000-0000-000000000000', '6ee5eb4b-a8bd-493e-aefa-9c35939814f8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.922438+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e3eaeaa-f23e-4e34-ac1a-ec6467e37109', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:49.970819+00', ''),
	('00000000-0000-0000-0000-000000000000', '16cd2c0e-eeae-46b2-9de9-3b42184c548b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.039612+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c39aa55-5a5d-4fed-b460-8f94bbf63873', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.249141+00', ''),
	('00000000-0000-0000-0000-000000000000', '74034f59-f72f-441f-9b4e-d0e125db615c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.315916+00', ''),
	('00000000-0000-0000-0000-000000000000', '8de8ed23-aa36-441c-a0eb-bb46e38eeb9c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.363362+00', ''),
	('00000000-0000-0000-0000-000000000000', '34f5a9e8-d502-4edd-8265-380df3712760', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.383354+00', ''),
	('00000000-0000-0000-0000-000000000000', '622f316b-94de-4926-83f5-e9fb5204da8f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.567565+00', ''),
	('00000000-0000-0000-0000-000000000000', '9d80103e-eab8-47ae-995c-e38057e2f3dc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.627908+00', ''),
	('00000000-0000-0000-0000-000000000000', '331e82f0-bdba-447c-90b3-b9a7dff07497', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.668989+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f36b5ef7-7688-4bb8-8774-48184d44ace9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.768024+00', ''),
	('00000000-0000-0000-0000-000000000000', '2604dbbd-90af-44c4-bce5-816132ee838b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.922279+00', ''),
	('00000000-0000-0000-0000-000000000000', '3ef1613d-152e-4e33-a63b-b8d0bdc52f0a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:50.954885+00', ''),
	('00000000-0000-0000-0000-000000000000', '0f1b708e-684e-43a2-bb15-f78856337734', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.004171+00', ''),
	('00000000-0000-0000-0000-000000000000', '101dd3d3-9f5d-4f66-b771-4388e74f66ea', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.125022+00', ''),
	('00000000-0000-0000-0000-000000000000', '2cad82e4-e40d-4530-99c1-90b467d22c51', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.211689+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3cc9fac-6838-4b5f-a0b3-ec54c8546b4a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.328864+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b5182a63-923e-496f-a70e-5ee33730eb69', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.342718+00', ''),
	('00000000-0000-0000-0000-000000000000', '6f3591bd-2a57-46f9-bddd-acf546bbf3d3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.457577+00', ''),
	('00000000-0000-0000-0000-000000000000', '7a2cc58e-e5a6-4dd2-84b2-7bf0d4bbdf7c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.499961+00', ''),
	('00000000-0000-0000-0000-000000000000', '3f569084-2cd2-4839-a9e9-3d5cd0201eb0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.691053+00', ''),
	('00000000-0000-0000-0000-000000000000', '6380d13c-30de-440f-8436-4bd4709659b9', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.803299+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c7df359-c9e7-4e9c-9c77-259fd453d2a5', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.85325+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c629d8ab-1198-4a5c-8b64-24945abff106', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:51.866758+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b9da2d60-003d-42fc-9dbe-77d9f84435a8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.039134+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ef14ce28-31de-4745-b5bd-8efe4a00b1a6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.11565+00', ''),
	('00000000-0000-0000-0000-000000000000', '869dc7bf-5be1-4f11-97a3-87fd0bb196e8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.183096+00', ''),
	('00000000-0000-0000-0000-000000000000', '37e03257-dc53-4750-9620-426c81502c45', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.421279+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eefd6648-71f8-4046-a35e-e03021cfb60a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.482881+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ca1d77ed-0eb7-43f4-bc8c-ba12b164d19e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.585284+00', ''),
	('00000000-0000-0000-0000-000000000000', '08e6844b-7029-496d-8fcc-6e2fc63b9f50', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.706008+00', ''),
	('00000000-0000-0000-0000-000000000000', '50ad0f01-fed0-484d-ad65-282016c2fcfe', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.780534+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b4838911-f230-4330-a8a8-17693e05fe05', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.849636+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f6e7e29-7bf7-45d9-b75c-087cb791eee4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:52.957037+00', ''),
	('00000000-0000-0000-0000-000000000000', '369fba59-1b36-45a3-9129-a9358ef51e26', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.018933+00', ''),
	('00000000-0000-0000-0000-000000000000', '689fd4aa-1aa2-4760-921e-2dca40df0c5c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.238057+00', ''),
	('00000000-0000-0000-0000-000000000000', '6ad5c553-6ce6-4b13-9741-d27af2888d58', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.325551+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bb1ce8e3-d7df-4952-ad02-b79eefbb79e4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.34977+00', ''),
	('00000000-0000-0000-0000-000000000000', '723f97e8-16f3-4af0-8833-644372bf9c68', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.362729+00', ''),
	('00000000-0000-0000-0000-000000000000', '7e671de8-d736-4687-bfca-22e77ea1754d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.569049+00', ''),
	('00000000-0000-0000-0000-000000000000', '3c2a8517-27ef-44aa-a7fa-ee1084cbe375', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.616619+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd199f9df-a122-4aea-851e-952345bf74ce', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.698044+00', ''),
	('00000000-0000-0000-0000-000000000000', '2fbcb03c-ceb7-43c5-aa71-7962c35bf79e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.715435+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd62132d5-0d84-4a41-8f47-6ef62ee66b03', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.854313+00', ''),
	('00000000-0000-0000-0000-000000000000', '4185dabe-68c5-4a76-b378-9e94e929ab72', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.919836+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f4ffbd4-5c04-45be-860b-c8a359588afa', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:53.974962+00', ''),
	('00000000-0000-0000-0000-000000000000', '3662cfb1-4e19-44a2-a38e-6284d54ab036', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.075361+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a2b0a3c7-7473-4be4-a531-84ba0431fde2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.183511+00', ''),
	('00000000-0000-0000-0000-000000000000', '248f687d-5d79-4502-9cf2-bba5eedfe80b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.232258+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8aa3b08-1919-4f9b-be36-239fcbfc92d3', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.280653+00', ''),
	('00000000-0000-0000-0000-000000000000', '3469208d-7d17-4525-83f3-1620e5857ed0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.440274+00', ''),
	('00000000-0000-0000-0000-000000000000', '3b8646b8-61fc-4bed-88de-f68d8544e021', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.553665+00', ''),
	('00000000-0000-0000-0000-000000000000', '783fd18d-e7f1-4ef2-bb4f-09f2b049fc67', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.64924+00', ''),
	('00000000-0000-0000-0000-000000000000', 'feee0926-cacd-42d3-891c-5b3de005cbfe', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.66796+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fec3ae6e-b6c5-455c-a2a1-20377b462af2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.760041+00', ''),
	('00000000-0000-0000-0000-000000000000', '2eefa94b-2108-41eb-81d2-543e6cf4658a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.930676+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e5662dda-953c-40e6-988e-c62403063c58', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:54.970704+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bb9ec03b-1a79-40a1-aa24-c4639f326dca', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.007084+00', ''),
	('00000000-0000-0000-0000-000000000000', '68e353dd-19f2-4150-8aea-b47a1744dc21', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.101233+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ebd12e07-d0ba-4303-a679-03a9766d9eda', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.249479+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f31b1671-3160-4dd6-8b08-169ce77803da', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.294053+00', ''),
	('00000000-0000-0000-0000-000000000000', '336e8d1b-22b9-40e3-a3d9-bf6004e78847', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.31797+00', ''),
	('00000000-0000-0000-0000-000000000000', '7a22a7db-2119-47c3-8a3a-f2c786e36641', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.455169+00', ''),
	('00000000-0000-0000-0000-000000000000', '709e495d-0749-4f75-bdc1-fab5b58b4533', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.559697+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a01144b-564f-4476-92c8-af69f7679776', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.654678+00', ''),
	('00000000-0000-0000-0000-000000000000', '2a617635-201f-4bca-be00-16bacb026fa1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.671374+00', ''),
	('00000000-0000-0000-0000-000000000000', 'abb7123d-64bd-4def-81da-ab367f31b4c8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.801815+00', ''),
	('00000000-0000-0000-0000-000000000000', '701e70d8-d2d3-4e07-9068-28b48c91ada8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:55.897332+00', ''),
	('00000000-0000-0000-0000-000000000000', '8818a217-3f47-47d9-827f-609c364533aa', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.029029+00', ''),
	('00000000-0000-0000-0000-000000000000', '904191f3-e80c-4eb7-bcf3-40dac627b0bc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.126602+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed04eefe-4e70-49bc-a259-cc53c961c7d5', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.233674+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c9b7b45e-a687-40ac-b852-f48a531cefa4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.443889+00', ''),
	('00000000-0000-0000-0000-000000000000', '44a61136-ed99-4d86-ad6b-176ab8c01367', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.690572+00', ''),
	('00000000-0000-0000-0000-000000000000', '03ec147e-15bd-401b-8ee0-7c3e36294131', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:56.923892+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e1a2e22e-13f3-4926-943b-95052b5cca3e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:57.162894+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f70b80ca-0670-4c5d-b321-6892885d6764', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:57.413831+00', ''),
	('00000000-0000-0000-0000-000000000000', '0c545f50-3fc8-45df-b1f6-9554706dcb53', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:57.684601+00', ''),
	('00000000-0000-0000-0000-000000000000', '10d8f8f4-6383-40a1-ae0e-5cc44fb22c3f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:57.954227+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed1a855a-18c2-429a-9392-740017134081', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:58.195902+00', ''),
	('00000000-0000-0000-0000-000000000000', '1d323ba6-dd94-4c56-8369-dbfb69450d9f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:58.433452+00', ''),
	('00000000-0000-0000-0000-000000000000', '64e8b0e2-b5ff-446b-99e1-cf6d1c071927', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:58.675332+00', ''),
	('00000000-0000-0000-0000-000000000000', 'baebca32-02a8-47ac-b828-91de2aa8eef4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:58.914561+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ff95c7a3-eda4-44c1-9a54-3fd7cccefde8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:59.138879+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae1289b8-a402-4f2b-a26e-1f2ff48dc32c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:59.392435+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ec6b87fc-bca1-45c1-b3d3-ab3262ea7b56', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:59.653192+00', ''),
	('00000000-0000-0000-0000-000000000000', '90fbcedd-94a4-4d22-bde8-98d819a93457', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:38:59.917087+00', ''),
	('00000000-0000-0000-0000-000000000000', '7dfe89d8-905d-4c5b-a077-8d7069ad52ed', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:00.16122+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a0df7a4-4c0c-4c1d-bc09-92b7f76e62a6', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:00.404111+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a87e8a97-57b2-4c30-8742-5b85b3431b38', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:00.636473+00', ''),
	('00000000-0000-0000-0000-000000000000', '22c6a47b-5dbc-4aab-9443-8e29c352293c', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:00.875706+00', ''),
	('00000000-0000-0000-0000-000000000000', '85a2c2b6-4bf2-423d-a656-aca6af487cee', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:01.121536+00', ''),
	('00000000-0000-0000-0000-000000000000', '0a60f170-e2b2-4b5e-ade4-ad63705aa09e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:01.3546+00', ''),
	('00000000-0000-0000-0000-000000000000', '968b0e68-c42c-4d40-930b-39478e7485da', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:01.593973+00', ''),
	('00000000-0000-0000-0000-000000000000', '550b6565-f317-4f14-ad5c-022bd039dd33', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:01.833391+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a09a461-affd-4baa-89dd-664f06569574', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:02.07576+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ba6cd583-5bfc-43a5-8dcd-52063bbc4f4a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:02.310659+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c0598b9e-57ec-4387-87c8-15973e0ac2ce', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:02.542331+00', ''),
	('00000000-0000-0000-0000-000000000000', '7343df5e-9b16-4229-8bcc-e4ac6e5ea758', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:02.80726+00', ''),
	('00000000-0000-0000-0000-000000000000', '6a730b16-07e6-4d35-a7aa-98b30183b489', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:03.053307+00', ''),
	('00000000-0000-0000-0000-000000000000', '1be2fe6b-d335-4ef6-bffc-4ca61eb1813e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:03.298815+00', ''),
	('00000000-0000-0000-0000-000000000000', 'acbe1f9e-6210-4245-8a37-fc391e11bc64', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:03.549527+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dcb7c12a-b8ff-4c67-9c0d-17e3ed5eaa8e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:03.783866+00', ''),
	('00000000-0000-0000-0000-000000000000', '78832d48-051c-472b-a358-17426f7213c2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:04.027142+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ee9792be-87da-4121-81e5-293e27b7f805', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:04.250488+00', ''),
	('00000000-0000-0000-0000-000000000000', '2899a65e-d0a8-4bbf-b4f9-245d83e74293', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:04.478091+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c81934d1-239c-4d35-8ea6-51e1641d7ba8', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:04.722938+00', ''),
	('00000000-0000-0000-0000-000000000000', '0806d53e-6480-44ae-8e63-d853ddd1257b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:04.956379+00', ''),
	('00000000-0000-0000-0000-000000000000', '19e2df34-b038-4649-8d71-7a18bf92fb1a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:05.185303+00', ''),
	('00000000-0000-0000-0000-000000000000', '22447a94-213a-47c0-922d-e00060376b24', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:05.428422+00', ''),
	('00000000-0000-0000-0000-000000000000', '5c434c0c-0ae8-43d6-a625-65cd90dc66ae', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:05.678268+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c7e88bfc-8c78-4e2a-bac9-d1441ec1dee1', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:05.927875+00', ''),
	('00000000-0000-0000-0000-000000000000', '48c6caba-e1bd-420c-b808-a600242a919e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:06.17239+00', ''),
	('00000000-0000-0000-0000-000000000000', '4373fb86-3e97-4b30-878f-0b7079e77d2a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:06.439322+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f0c8cd9-ef51-479b-a4c5-4e30fff6140f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:06.68983+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bec306a5-5381-47c0-95a0-f3cee7a4048b', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:06.929873+00', ''),
	('00000000-0000-0000-0000-000000000000', '64107595-efd3-4b2c-a1f1-d7e078748bb4', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:07.20669+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e2cc31e-57d1-44e8-a2c6-d567df2ac22e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:07.450179+00', ''),
	('00000000-0000-0000-0000-000000000000', '4fefc7be-3214-42bd-b90e-030282b594c2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:07.697168+00', ''),
	('00000000-0000-0000-0000-000000000000', '96f6301f-9f00-45fa-ad53-cfae39c88560', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:07.939636+00', ''),
	('00000000-0000-0000-0000-000000000000', '4dcad577-3770-4eb5-a437-6907cdac1dcd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:08.173223+00', ''),
	('00000000-0000-0000-0000-000000000000', '3d695ac1-3802-4a7a-94fd-80009c273d47', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:08.444874+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd881dda8-92a4-4c23-9b60-6300ffc5ab30', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:08.691552+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dc9459db-2d8f-4884-af3e-2b707c1a1d20', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:08.927148+00', ''),
	('00000000-0000-0000-0000-000000000000', '0fc9335d-153c-4f90-9eb7-0421ae95491a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:09.177343+00', ''),
	('00000000-0000-0000-0000-000000000000', '7a57b529-5c41-43c4-8229-dba854b065f0', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:09.415138+00', ''),
	('00000000-0000-0000-0000-000000000000', '994e0acc-e134-429c-af2a-b7c6cebfc617', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:09.672428+00', ''),
	('00000000-0000-0000-0000-000000000000', '53f4e906-88a6-4a04-bf8d-ef5732653beb', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:09.926659+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a19c6e6b-722d-4cd7-ae43-f2e2ef393dd2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:10.161661+00', ''),
	('00000000-0000-0000-0000-000000000000', '364fe48b-9f82-4b4b-a123-0fc19ce6b0dc', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:10.389709+00', ''),
	('00000000-0000-0000-0000-000000000000', '948802bf-6b6b-4595-a005-cc25c655b22d', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:10.627985+00', ''),
	('00000000-0000-0000-0000-000000000000', '463c42a3-3fe0-42c8-989b-f0c6a48f5573', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:10.861431+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd7ccacc7-022e-4a4a-ac77-058dc25095fa', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:11.102515+00', ''),
	('00000000-0000-0000-0000-000000000000', '06a82971-fb10-41c1-8111-f602eec7f65f', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:11.343817+00', ''),
	('00000000-0000-0000-0000-000000000000', '6dccd037-1476-44fd-8e72-6c736289d459', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:12.357213+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a80b8c4d-c9e1-4478-910c-5d259e6736cd', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:12.585135+00', ''),
	('00000000-0000-0000-0000-000000000000', '3cdbeaf6-5774-48a0-b3bb-5de13ca8905e', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:13.912209+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f1d88f28-8ea9-406c-a4cd-340a922cbf47', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 10:39:14.158342+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f63705db-be9c-46c0-9ce5-0373721f9740', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 11:37:27.419095+00', ''),
	('00000000-0000-0000-0000-000000000000', '9e3a185e-8af6-45ca-935a-79b3d56cbfde', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 11:37:27.421558+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fa208ddc-2720-4784-afae-8bf1d30bd79a', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 12:35:28.850173+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ea5756ed-5bc0-43be-bb1d-052b3ea1e589', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 12:35:28.852053+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f764009-3496-49b9-84a1-23c9584cebf2', '{"action":"token_refreshed","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 13:33:55.791813+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e42683bb-6ef8-420e-b1ef-623fbec22fbe', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-18 13:33:55.794081+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', 'authenticated', 'authenticated', 'test@gmail.com', '$2a$10$sAkYlMoeGlURpY2pIdfv7O86ZcvGx9rbY9T/qqwjtxZSMVp7Q/yoy', '2026-02-13 11:42:20.967633+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:20.955151+00', '2026-02-13 11:42:20.968575+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '467befb4-ee25-433c-be40-886ba3871d97', 'authenticated', 'authenticated', 'test1@gmail.com', '$2a$10$.NxzNS06FMrRVNc2w.mRJ.RvdjOITaTGKTh76dFpJUac9IPpibuCi', '2026-02-13 11:42:52.828135+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:52.822127+00', '2026-02-13 11:42:52.829177+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', 'authenticated', 'authenticated', 'wada007@gmail.com', '$2a$10$bAJPz4ybTg6NIzOHnkv0t.4.qb6KLBhkTo0eww0b5smAF6fSM98He', '2026-02-13 12:40:48.266023+00', NULL, '', NULL, '65c8047776286be6f84ea0444e22a8138ccb0ad9b2848d147df84500', '2026-02-17 05:36:52.131725+00', '', '', NULL, '2026-02-18 05:43:44.898404+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 12:40:48.260315+00', '2026-02-18 13:33:55.798995+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('610ac6ac-395b-436a-b7f3-8a6d83cb073c', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', '{"sub": "610ac6ac-395b-436a-b7f3-8a6d83cb073c", "email": "test@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-13 11:42:20.962822+00', '2026-02-13 11:42:20.962928+00', '2026-02-13 11:42:20.962928+00', 'e73d1f55-d9a8-46ea-b875-21d616830093'),
	('467befb4-ee25-433c-be40-886ba3871d97', '467befb4-ee25-433c-be40-886ba3871d97', '{"sub": "467befb4-ee25-433c-be40-886ba3871d97", "email": "test1@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-13 11:42:52.824579+00', '2026-02-13 11:42:52.824666+00', '2026-02-13 11:42:52.824666+00', 'c29be10e-5bbc-4c70-ba0b-ebd9dfc31fa6'),
	('e97488f9-02be-4b0b-9dc9-ddb0c2902999', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', '{"sub": "e97488f9-02be-4b0b-9dc9-ddb0c2902999", "email": "wada007@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-13 12:40:48.262594+00', '2026-02-13 12:40:48.262633+00', '2026-02-13 12:40:48.262633+00', 'ceb4d51c-734a-4172-8bdc-424e2768fffd');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('d3f585d2-356b-47ed-bc7b-4c5ab6667067', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', '2026-02-18 05:43:44.898557+00', '2026-02-18 13:33:55.801777+00', NULL, 'aal1', NULL, '2026-02-18 13:33:55.801717', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('d3f585d2-356b-47ed-bc7b-4c5ab6667067', '2026-02-18 05:43:44.903991+00', '2026-02-18 05:43:44.903991+00', 'password', '19f7e0e3-d02a-4885-9247-db6caf5967eb');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('dbeb131d-c81b-4111-afaf-a2169da3e1a3', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', 'recovery_token', '65c8047776286be6f84ea0444e22a8138ccb0ad9b2848d147df84500', 'wada007@gmail.com', '2026-02-17 05:36:52.182897', '2026-02-17 05:36:52.182897');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 12, 'ayxjmlvhp7tb', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 05:43:44.901867+00', '2026-02-18 06:44:59.304557+00', NULL, 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 13, 't2mittehkveq', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 06:44:59.306669+00', '2026-02-18 07:43:27.416643+00', 'ayxjmlvhp7tb', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 14, 'dloekieb37z7', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 07:43:27.418061+00', '2026-02-18 08:41:35.393671+00', 't2mittehkveq', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 15, 'ntpgc5mn5lqr', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 08:41:35.394769+00', '2026-02-18 09:39:51.665783+00', 'dloekieb37z7', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 16, 'jfa6jnx4whkq', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 09:39:51.666472+00', '2026-02-18 10:38:29.552245+00', 'ntpgc5mn5lqr', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 17, 'sazkh7boa4iz', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 10:38:29.554749+00', '2026-02-18 11:37:27.422432+00', 'jfa6jnx4whkq', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 18, '5lbdan4uvwkp', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 11:37:27.424238+00', '2026-02-18 12:35:28.852755+00', 'sazkh7boa4iz', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 19, 'tzabprtfqdke', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-18 12:35:28.854162+00', '2026-02-18 13:33:55.795125+00', '5lbdan4uvwkp', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067'),
	('00000000-0000-0000-0000-000000000000', 20, 'xzihbcatuezq', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', false, '2026-02-18 13:33:55.79718+00', '2026-02-18 13:33:55.79718+00', 'tzabprtfqdke', 'd3f585d2-356b-47ed-bc7b-4c5ab6667067');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: app_role; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."app_role" ("id", "app_role", "name") VALUES
	('c50ebd55-3466-43dc-a702-5d8321908d69', 'hr_manager', '人事マネージャー'),
	('f422469d-c1e0-4a10-ac6c-4b656b4fec64', 'hr', '人事'),
	('7f8a303e-3b13-4fac-a0f0-6716b44a5711', 'company_doctor', '産業医'),
	('bc2f9ef0-1ddc-408a-ba9f-93cd26955f81', 'company_nurse', '保健師'),
	('b239a055-8175-43bc-acae-a7d44dff75d5', 'hsc', '安全衛生委員'),
	('74f8e05b-c99d-45ee-b368-fdbe35ee0e52', 'developer', '開発者'),
	('03c94882-88b0-4937-887b-c3733ab21028', 'employee', '従業員'),
	('25d560ff-0166-49a5-b29c-24711664bd6d', 'test', 'system tester');


--
-- Data for Name: service_category; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."service_category" ("id", "sort_order", "name", "description", "release_status") VALUES
	('ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', 20, '人事・採用支援', '', 'released'),
	('1dc338ff-19d7-407e-94e4-06e60b1339a0', 10, '組織の健康度測定', '', 'released'),
	('35c69c7f-6580-4250-a125-d15c28ead6b2', 10, '基本登録（従業員・組織）', '', 'released'),
	('194390c5-dafd-482b-b979-60f165b7ae28', 100, '基本設定[SaaS]', '', 'released');


--
-- Data for Name: service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."service" ("id", "service_category_id", "name", "category", "title", "description", "sort_order", "route_path", "app_role_group_id", "app_role_group_uuid", "target_audience", "release_status") VALUES
	('3a5034ba-06dc-4157-b1bd-351d4bc5c01f', '35c69c7f-6580-4250-a125-d15c28ead6b2', '従業員・組織の登録', NULL, '', NULL, 20010, '', NULL, NULL, 'adm', '公開'),
	('c6701a83-2bd9-47de-a41e-084f280d117a', '1dc338ff-19d7-407e-94e4-06e60b1339a0', 'パルス回答 (Echo)', NULL, '', '', 10010, '', NULL, NULL, 'all_users', '公開'),
	('2eb4f512-4129-4657-8c93-dcffdd04c7db', '194390c5-dafd-482b-b979-60f165b7ae28', '新規ご契約（会社登録）', NULL, '', '新規の会社を登録します。', 30010, '', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', NULL, 'saas_adm', '公開'),
	('5a166a87-a010-4c9c-893e-5e286193dcd8', 'ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', '人事・採用支援', NULL, 'タイトル・・・タイトル・・・', '説明・・・説明・・・説明・・・説明・・・', 11010, '/system-master', NULL, NULL, 'all_users', '公開'),
	('340b1610-665c-48c9-8e64-37755da227c3', '194390c5-dafd-482b-b979-60f165b7ae28', 'SaaSサービス管理', NULL, '', NULL, 30020, '/system-master', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', NULL, 'saas_adm', '公開'),
	('e7e2965d-f244-4bf1-8fca-5f790b61009a', 'ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', 'オファー妥当診断', NULL, '', '', 6, '', NULL, NULL, 'all_users', '公開');


--
-- Data for Name: app_role_service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."app_role_service" ("id", "app_role_id", "service_id") VALUES
	('92774932-f1dc-411b-8a1b-b11fd56158d2', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', 'c6701a83-2bd9-47de-a41e-084f280d117a'),
	('c3f21154-e066-4ff3-a3e5-082a04ac9ec0', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', '5a166a87-a010-4c9c-893e-5e286193dcd8'),
	('16c59986-aa8a-4c56-b581-8e91648b4a8e', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', '3a5034ba-06dc-4157-b1bd-351d4bc5c01f'),
	('6c6519dc-32fc-4d4b-a8c8-41fc845e05c0', '25d560ff-0166-49a5-b29c-24711664bd6d', 'c6701a83-2bd9-47de-a41e-084f280d117a'),
	('6f7c713b-92aa-4ecc-bd77-7b27a0ccc0fd', '25d560ff-0166-49a5-b29c-24711664bd6d', '5a166a87-a010-4c9c-893e-5e286193dcd8'),
	('7b8449cd-30da-459d-8c2b-e712c332ace3', '25d560ff-0166-49a5-b29c-24711664bd6d', '3a5034ba-06dc-4157-b1bd-351d4bc5c01f'),
	('0554e932-ed6f-4510-96a5-a07a48d70f22', '03c94882-88b0-4937-887b-c3733ab21028', 'c6701a83-2bd9-47de-a41e-084f280d117a'),
	('01be9706-7f89-4eb0-b65a-70c7e378ef7d', '03c94882-88b0-4937-887b-c3733ab21028', '5a166a87-a010-4c9c-893e-5e286193dcd8'),
	('14202058-eced-4787-8dd8-18d7d99cc4ee', 'c50ebd55-3466-43dc-a702-5d8321908d69', '3a5034ba-06dc-4157-b1bd-351d4bc5c01f'),
	('6260968d-d272-4b7e-850b-4626f67086fb', 'f422469d-c1e0-4a10-ac6c-4b656b4fec64', '3a5034ba-06dc-4157-b1bd-351d4bc5c01f');


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."tenants" ("id", "name", "contact_date", "paid_amount", "employee_count", "paid_date", "created_at") VALUES
	('11111111-1111-1111-1111-111111111111', 'Tenant A', NULL, NULL, NULL, NULL, '2026-02-13 10:41:30.020372+00'),
	('22222222-2222-2222-2222-222222222222', 'Tenant B', NULL, NULL, NULL, NULL, '2026-02-13 10:41:30.020372+00'),
	('421f9b0d-5db0-47b3-8d48-203b9213dc00', 'SaaS管理会社', NULL, NULL, NULL, NULL, '2026-02-17 07:24:27.616036+00');


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."divisions" ("id", "tenant_id", "name", "parent_id", "layer", "code") VALUES
	('32ac01df-f38d-44de-ac7b-28fcd0daa1c5', '421f9b0d-5db0-47b3-8d48-203b9213dc00', 'SaaS開発_全社', NULL, NULL, NULL);


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."employees" ("id", "tenant_id", "division_id", "active_status", "name", "is_manager", "app_role_id", "employee_no", "job_title", "sex", "start_date", "is_contacted_person", "contacted_date", "user_id") VALUES
	('28d3ded9-fc50-420a-bfc0-b9b55b32f19a', '421f9b0d-5db0-47b3-8d48-203b9213dc00', NULL, 'active', 'SaaS管理者', true, '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', NULL, NULL, 'M', NULL, NULL, NULL, 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');


--
-- Data for Name: tenant_service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."tenant_service" ("id", "tenant_id", "service_id", "start_date", "status") VALUES
	('e98bd128-b269-4e6f-b2ee-905d4d736a72', '421f9b0d-5db0-47b3-8d48-203b9213dc00', '5a166a87-a010-4c9c-893e-5e286193dcd8', NULL, NULL),
	('f11b2f08-4c30-4baf-ae47-93e497aa83e5', '421f9b0d-5db0-47b3-8d48-203b9213dc00', 'c6701a83-2bd9-47de-a41e-084f280d117a', NULL, NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 20, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict hGTMsbX0KwLQIymvpWfg8UaaDl4bUrzhLvQ0tyqk3jOFhpyrBnmNPid4sLWeetO

RESET ALL;
