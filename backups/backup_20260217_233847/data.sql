SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict sOaIlyvjPiacSnKT1QLCMvpDFYy0Ue3eE3dqE2t7NKYFd82hYcaDMnfA34a5LzN

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
	('00000000-0000-0000-0000-000000000000', '144fdab0-6cdd-4392-83de-bf2534bdf997', '{"action":"token_revoked","actor_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-02-17 13:19:30.883597+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', 'authenticated', 'authenticated', 'test@gmail.com', '$2a$10$sAkYlMoeGlURpY2pIdfv7O86ZcvGx9rbY9T/qqwjtxZSMVp7Q/yoy', '2026-02-13 11:42:20.967633+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:20.955151+00', '2026-02-13 11:42:20.968575+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '467befb4-ee25-433c-be40-886ba3871d97', 'authenticated', 'authenticated', 'test1@gmail.com', '$2a$10$.NxzNS06FMrRVNc2w.mRJ.RvdjOITaTGKTh76dFpJUac9IPpibuCi', '2026-02-13 11:42:52.828135+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:52.822127+00', '2026-02-13 11:42:52.829177+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', 'authenticated', 'authenticated', 'wada007@gmail.com', '$2a$10$bAJPz4ybTg6NIzOHnkv0t.4.qb6KLBhkTo0eww0b5smAF6fSM98He', '2026-02-13 12:40:48.266023+00', NULL, '', NULL, '65c8047776286be6f84ea0444e22a8138ccb0ad9b2848d147df84500', '2026-02-17 05:36:52.131725+00', '', '', NULL, '2026-02-17 08:20:22.651652+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 12:40:48.260315+00', '2026-02-17 13:19:30.887058+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


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
	('d5750fa7-4e39-4a1d-9ccf-befa833f1d26', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', '2026-02-17 08:20:22.652075+00', '2026-02-17 13:19:30.889613+00', NULL, 'aal1', NULL, '2026-02-17 13:19:30.88956', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('d5750fa7-4e39-4a1d-9ccf-befa833f1d26', '2026-02-17 08:20:22.662932+00', '2026-02-17 08:20:22.662932+00', 'password', '494fa358-ca92-4978-bb9d-9446bad11dec');


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
	('00000000-0000-0000-0000-000000000000', 1, 'rufc35zq53da', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-17 08:20:22.657579+00', '2026-02-17 09:18:22.972436+00', NULL, 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26'),
	('00000000-0000-0000-0000-000000000000', 2, 'j5a4gerjpzgw', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-17 09:18:22.973911+00', '2026-02-17 10:18:30.596554+00', 'rufc35zq53da', 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26'),
	('00000000-0000-0000-0000-000000000000', 3, 'xz5hrl4kay7z', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-17 10:18:30.598448+00', '2026-02-17 11:22:12.123095+00', 'j5a4gerjpzgw', 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26'),
	('00000000-0000-0000-0000-000000000000', 4, 'z6y447a6p3cl', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-17 11:22:12.124857+00', '2026-02-17 12:21:01.525537+00', 'xz5hrl4kay7z', 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26'),
	('00000000-0000-0000-0000-000000000000', 5, 'hm3korqktlaz', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true, '2026-02-17 12:21:01.526913+00', '2026-02-17 13:19:30.884364+00', 'z6y447a6p3cl', 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26'),
	('00000000-0000-0000-0000-000000000000', 6, 'y5cyq4r5xt5b', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', false, '2026-02-17 13:19:30.885639+00', '2026-02-17 13:19:30.885639+00', 'hm3korqktlaz', 'd5750fa7-4e39-4a1d-9ccf-befa833f1d26');


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
	('194390c5-dafd-482b-b979-60f165b7ae28', 100, '基本設定（SaaS管理者）', '', 'released'),
	('ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', 20, '人事・採用支援', '', 'released'),
	('1dc338ff-19d7-407e-94e4-06e60b1339a0', 10, '組織の健康度測定', '', 'released'),
	('35c69c7f-6580-4250-a125-d15c28ead6b2', 10, '基本登録（従業員・組織）', '', 'released');


--
-- Data for Name: service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."service" ("id", "service_category_id", "name", "category", "title", "description", "sort_order", "route_path", "app_role_group_id", "app_role_group_uuid", "target_audience", "release_status") VALUES
	('340b1610-665c-48c9-8e64-37755da227c3', '194390c5-dafd-482b-b979-60f165b7ae28', 'SaaSサービス管理', NULL, '', NULL, 30020, '', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', NULL, 'saas_adm', '公開'),
	('3a5034ba-06dc-4157-b1bd-351d4bc5c01f', '35c69c7f-6580-4250-a125-d15c28ead6b2', '従業員・組織の登録', NULL, '', NULL, 20010, '', NULL, NULL, 'adm', '公開'),
	('5a166a87-a010-4c9c-893e-5e286193dcd8', 'ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', '人事・採用支援', NULL, '', NULL, 11010, '', NULL, NULL, 'all_users', '公開'),
	('c6701a83-2bd9-47de-a41e-084f280d117a', '1dc338ff-19d7-407e-94e4-06e60b1339a0', 'パルス回答 (Echo)', NULL, '', '', 10010, '', NULL, NULL, 'all_users', '公開'),
	('2eb4f512-4129-4657-8c93-dcffdd04c7db', '194390c5-dafd-482b-b979-60f165b7ae28', '新規ご契約（会社登録）', NULL, '', '新規の会社を登録します。', 30010, '', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52', NULL, 'saas_adm', '公開');


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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 6, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict sOaIlyvjPiacSnKT1QLCMvpDFYy0Ue3eE3dqE2t7NKYFd82hYcaDMnfA34a5LzN

RESET ALL;
