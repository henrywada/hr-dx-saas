SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict OaEqRY979zdz5Gqb1SulVWch19iN6fHTqUINqYQmaB9hqlniW644TqG8cYiuXD0

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
	('00000000-0000-0000-0000-000000000000', '4fd7b72b-22e8-458a-adf4-4b0b0d97a8b8', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"wada007@gmail.com","user_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","user_phone":""}}', '2026-01-22 11:44:31.140809+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ea3af126-5b54-477b-b6a3-deb417b8d371', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 02:03:23.212446+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a50eae38-ce31-440e-b6eb-581463320130', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"84d1f88a-9d49-4b6c-b845-82a023633dd9"}}', '2026-01-24 02:28:11.005328+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bb359379-dc56-42ac-8086-90d850bce128', '{"action":"user_signedup","actor_id":"84d1f88a-9d49-4b6c-b845-82a023633dd9","actor_username":"test1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 02:28:32.815331+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae874311-f520-46af-8b37-6d8af3b6db19', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"84d1f88a-9d49-4b6c-b845-82a023633dd9","user_phone":""}}', '2026-01-24 02:59:38.505291+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f8b3ca5f-5e91-4d0c-8aed-dc1f71fb561f', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"593bcda1-7a76-4a8b-9b61-91e587e2484f"}}', '2026-01-24 03:00:30.984824+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b6c011fc-5216-48e3-8e26-5c54af199b1e', '{"action":"user_signedup","actor_id":"593bcda1-7a76-4a8b-9b61-91e587e2484f","actor_username":"test1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 03:01:20.479895+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b7b655e2-3809-47d7-8a1f-257c5a9f2f99', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"593bcda1-7a76-4a8b-9b61-91e587e2484f","user_phone":""}}', '2026-01-24 03:07:43.377369+00', ''),
	('00000000-0000-0000-0000-000000000000', '6be82607-7358-4027-a4d9-77073b684285', '{"action":"token_refreshed","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 03:11:16.803202+00', ''),
	('00000000-0000-0000-0000-000000000000', '0b9b9b13-43c5-4bfd-9516-0131ab52c2f8', '{"action":"token_revoked","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 03:11:16.805962+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a56030b6-8a98-49c3-9b02-16a302b0ac04', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"e3df5190-19b8-498b-ad4d-59cef886b007"}}', '2026-01-24 03:15:50.375881+00', ''),
	('00000000-0000-0000-0000-000000000000', '60502cf1-e123-439b-a3c2-9d00d67f5359', '{"action":"user_signedup","actor_id":"e3df5190-19b8-498b-ad4d-59cef886b007","actor_username":"test1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 03:16:06.510851+00', ''),
	('00000000-0000-0000-0000-000000000000', '9a70bdf7-9af7-45b6-b50a-27c0b50b0b3b', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test2@hr-dx.jp","user_id":"ad340298-0b20-45ca-a533-24b38d5bcda8"}}', '2026-01-24 03:28:39.406172+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bdd6be34-4f1e-4bbf-9f3d-9d227db1ee7d', '{"action":"user_signedup","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 03:28:46.730958+00', ''),
	('00000000-0000-0000-0000-000000000000', '03e02341-bbff-46b7-b1a4-24903fb2ee27', '{"action":"user_updated_password","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"user"}', '2026-01-24 03:28:56.93905+00', ''),
	('00000000-0000-0000-0000-000000000000', '7deae9a7-6fe9-422e-9572-a0cf9bc69a48', '{"action":"user_modified","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"user"}', '2026-01-24 03:28:56.940308+00', ''),
	('00000000-0000-0000-0000-000000000000', '4e5b404e-83e3-4474-a10f-c81fa830c686', '{"action":"token_refreshed","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 05:11:12.751929+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b2f1105d-b9d3-4f51-9341-79525fb67d5c', '{"action":"token_revoked","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 05:11:12.753183+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c076ce8-18e6-4b1c-a18f-b37df5ab3658', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"e3df5190-19b8-498b-ad4d-59cef886b007","user_phone":""}}', '2026-01-24 05:41:14.643123+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a6430375-12cb-4447-8600-92115c28340a', '{"action":"token_refreshed","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 05:41:38.983422+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b106864-4a6f-4c20-bb8e-0a48c662542f', '{"action":"token_revoked","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 05:41:38.984673+00', ''),
	('00000000-0000-0000-0000-000000000000', '1ad5cd06-37bc-4031-b255-a7bedf95f63b', '{"action":"logout","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 05:41:39.146401+00', ''),
	('00000000-0000-0000-0000-000000000000', '26d17e16-9b1f-4e3a-a0a1-094225fec622', '{"action":"login","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 05:42:00.06681+00', ''),
	('00000000-0000-0000-0000-000000000000', '7355d30f-fd2b-4fe9-a805-123d16360a23', '{"action":"logout","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 05:52:21.098429+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd0d7e86e-2d56-415b-a9a7-ebb371e5bc5d', '{"action":"login","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 05:52:35.841859+00', ''),
	('00000000-0000-0000-0000-000000000000', '152a4a3f-c16a-4b16-8344-593be1a0f56e', '{"action":"logout","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 06:50:48.040264+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fa4045cf-b35f-4e7e-baeb-b0dfe6482f9a', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 06:51:01.443172+00', ''),
	('00000000-0000-0000-0000-000000000000', '39473833-b5fa-46ff-aea2-7ef9a1f5bd98', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@hr-dx.jp","user_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c"}}', '2026-01-24 06:51:49.225204+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f2d88f5b-1be2-4410-9ffb-a1aad64cf313', '{"action":"user_signedup","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 06:51:55.745922+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bffe59a4-e175-42d9-a468-aa2730735d64', '{"action":"user_updated_password","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"user"}', '2026-01-24 06:52:05.88241+00', ''),
	('00000000-0000-0000-0000-000000000000', '3e97a4d0-7774-4de0-88a3-e72b3b34e9bb', '{"action":"user_modified","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"user"}', '2026-01-24 06:52:05.894426+00', ''),
	('00000000-0000-0000-0000-000000000000', '2e5b5e9a-8407-458f-97ab-1e9008badb41', '{"action":"logout","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 07:12:45.090132+00', ''),
	('00000000-0000-0000-0000-000000000000', '8b504f15-afbc-441a-b60f-4fa2cec93cc3', '{"action":"login","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 07:13:11.939883+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f6ce5933-8a5a-447f-bc2b-84340cbf18da', '{"action":"logout","actor_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","actor_username":"test2@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 07:26:00.294681+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd058c936-ca78-49bd-87de-656538f89070', '{"action":"login","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 07:27:24.175147+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f8b21d44-dcea-4638-9dd2-9d49a841e88a', '{"action":"token_refreshed","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 09:04:48.47187+00', ''),
	('00000000-0000-0000-0000-000000000000', '85e201e1-1525-478a-b1dd-8f4214880641', '{"action":"token_revoked","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 09:04:48.474503+00', ''),
	('00000000-0000-0000-0000-000000000000', '74c28b97-bb86-48c8-8898-a2b5c0754b6d', '{"action":"token_refreshed","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 10:36:44.723989+00', ''),
	('00000000-0000-0000-0000-000000000000', '38100a6b-aa27-44cf-82f6-af34b5bc846e', '{"action":"token_revoked","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 10:36:44.725982+00', ''),
	('00000000-0000-0000-0000-000000000000', '880776da-1425-41f4-ab1f-782ddc63d8ac', '{"action":"token_refreshed","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 11:45:45.920825+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bfd88088-289b-4166-89b5-cdd0844a0cfe', '{"action":"token_revoked","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"token"}', '2026-01-24 11:45:45.923056+00', ''),
	('00000000-0000-0000-0000-000000000000', '0731f5bc-07c1-4d57-b804-4c419dcc0107', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test3@hr-dx.jp","user_id":"76d85788-8b67-4ad2-a577-7f2e29008c65"}}', '2026-01-24 12:13:04.655095+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f0a008a5-bc5a-4efc-b2f1-ad7389fe9e40', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test4@hr-dx.jp","user_id":"476bf4f5-dd95-4896-ba2e-d84ffdeb42e7"}}', '2026-01-24 12:18:11.715795+00', ''),
	('00000000-0000-0000-0000-000000000000', '60293d47-b95b-4433-988d-4613ec5912e6', '{"action":"user_signedup","actor_id":"76d85788-8b67-4ad2-a577-7f2e29008c65","actor_username":"test3@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 12:19:22.925602+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ba30171e-8dc3-41b6-ac1f-fe7f4f448535', '{"action":"logout","actor_id":"76d85788-8b67-4ad2-a577-7f2e29008c65","actor_username":"test3@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 12:25:35.741781+00', ''),
	('00000000-0000-0000-0000-000000000000', '9202a269-1fbb-4ee5-9ce1-37bccffc7b36', '{"action":"user_recovery_requested","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 12:25:55.51458+00', ''),
	('00000000-0000-0000-0000-000000000000', '3797d0c5-9130-46b2-af30-fb9de407b15a', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 12:26:15.34067+00', ''),
	('00000000-0000-0000-0000-000000000000', '25f82c4d-f585-4749-a2dd-d57214d4f26b', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"recovery"}}', '2026-01-24 12:26:15.427739+00', ''),
	('00000000-0000-0000-0000-000000000000', '6d103d03-9a28-4d2f-8189-d6375a292cf1', '{"action":"user_updated_password","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 12:26:52.596657+00', ''),
	('00000000-0000-0000-0000-000000000000', '10aff56d-821e-48b0-b251-a54866f7cd23', '{"action":"user_modified","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 12:26:52.597578+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b7c16741-f78b-4c39-aa7f-107556154c36', '{"action":"logout","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 12:40:38.607931+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a461227f-bf6f-4cbd-b0ac-664d68a08459', '{"action":"login","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 12:40:51.654732+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f78df43a-6cc8-46b1-b0a5-113b49e1265f', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test5@hr-dx.jp","user_id":"bb9bdc31-dc25-4cdb-a871-7e2927d51a1b"}}', '2026-01-24 12:41:50.119777+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c718d9a2-d961-4b83-92f2-dcdbc98ab2db', '{"action":"user_signedup","actor_id":"bb9bdc31-dc25-4cdb-a871-7e2927d51a1b","actor_username":"test5@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 12:41:59.434613+00', ''),
	('00000000-0000-0000-0000-000000000000', '601a2161-8551-4c9a-b11d-6657345726c0', '{"action":"logout","actor_id":"bb9bdc31-dc25-4cdb-a871-7e2927d51a1b","actor_username":"test5@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 12:46:35.969014+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ebe30872-dd57-4e65-8725-de760f38d3f1', '{"action":"login","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 12:46:52.567669+00', ''),
	('00000000-0000-0000-0000-000000000000', '6398bafc-e439-49ad-acdd-e8996c0b681b', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test7@hr-dx.jp","user_id":"5be2b213-163a-4c43-8b6c-84d48638145e"}}', '2026-01-24 12:47:47.15806+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b4a127d8-0a56-4f52-8af6-d9bcadc52063', '{"action":"user_signedup","actor_id":"5be2b213-163a-4c43-8b6c-84d48638145e","actor_username":"test7@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 12:47:55.317743+00', ''),
	('00000000-0000-0000-0000-000000000000', '15a615fb-36cf-462f-9c67-9c769a88f6bf', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test8@gmail.com","user_id":"03c164c0-7f35-4291-8bf0-0ddbb641790a"}}', '2026-01-24 12:53:34.280595+00', ''),
	('00000000-0000-0000-0000-000000000000', '08b9c8f4-0382-4f10-9778-023b50e3065a', '{"action":"user_signedup","actor_id":"03c164c0-7f35-4291-8bf0-0ddbb641790a","actor_username":"test8@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 12:53:55.685411+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab3f91f5-e16d-488a-97b6-8221e545c20c', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test9@hr-dx.jp","user_id":"b6c68ff2-fbea-4b1f-a5b9-a07c7b27c59e"}}', '2026-01-24 12:59:42.653171+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cdb41429-3a72-4cd6-aa8e-b9582be49e15', '{"action":"user_signedup","actor_id":"b6c68ff2-fbea-4b1f-a5b9-a07c7b27c59e","actor_username":"test9@hr-dx.jp","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 12:59:54.353104+00', ''),
	('00000000-0000-0000-0000-000000000000', '16c5fc1c-483e-4078-a8da-60f992b2b6c3', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test10@gmai.com","user_id":"36b2b550-95f9-4ad9-a28e-d1ef25636d8f"}}', '2026-01-24 13:03:38.66231+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f1b3d09e-0bfb-43a5-adbb-2c8a10d3633f', '{"action":"user_signedup","actor_id":"36b2b550-95f9-4ad9-a28e-d1ef25636d8f","actor_username":"test10@gmai.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 13:03:46.686953+00', ''),
	('00000000-0000-0000-0000-000000000000', '74c5256b-edb3-43bb-b517-4cf3c69be6f2', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test11@gmail.com","user_id":"43e69bee-9459-4215-b307-5faf3f05a7b6"}}', '2026-01-24 13:10:50.474154+00', ''),
	('00000000-0000-0000-0000-000000000000', '77bd317b-6f59-4401-8971-40f77b15744a', '{"action":"user_signedup","actor_id":"43e69bee-9459-4215-b307-5faf3f05a7b6","actor_username":"test11@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 13:11:19.591487+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8cf8f44-4f6c-4d88-a709-9b3cd609f473', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test12@gmail.com","user_id":"38e601d1-5044-4596-a846-4c660f96a2a9"}}', '2026-01-24 13:17:18.20039+00', ''),
	('00000000-0000-0000-0000-000000000000', '2b2d0389-0302-451c-ba50-06bdac269d91', '{"action":"user_signedup","actor_id":"38e601d1-5044-4596-a846-4c660f96a2a9","actor_username":"test12@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 13:17:25.0367+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b8e59f71-a1bb-46d1-8f6d-9643cd754b8d', '{"action":"logout","actor_id":"38e601d1-5044-4596-a846-4c660f96a2a9","actor_username":"test12@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 13:22:17.659515+00', ''),
	('00000000-0000-0000-0000-000000000000', '088d5faa-8132-4832-935c-768f3cf56129', '{"action":"login","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 13:22:32.131574+00', ''),
	('00000000-0000-0000-0000-000000000000', '4086f046-e5ec-4549-9d04-a671e6922ebf', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test15@gmail.com","user_id":"2e6ca620-1745-4ef9-b44f-1cd94eb67f16","user_phone":""}}', '2026-01-24 13:23:28.39761+00', ''),
	('00000000-0000-0000-0000-000000000000', '1800badf-90b5-40e7-b390-bc1ce5b064c1', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test16@gmail.com","user_id":"b350db6b-d4b4-43c5-b2ae-1a19a29572cc","user_phone":""}}', '2026-01-24 13:26:11.865501+00', ''),
	('00000000-0000-0000-0000-000000000000', '909bb0f0-8dd2-427a-ba49-c051abd39825', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test20@gmail.com","user_id":"d78b49bc-6edf-47e2-9147-c2f68ace4908","user_phone":""}}', '2026-01-24 13:38:48.103102+00', ''),
	('00000000-0000-0000-0000-000000000000', '10e86ad0-5c1c-4bc5-be5b-e7cbbcdad803', '{"action":"logout","actor_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","actor_username":"test1@hr-dx.jp","actor_via_sso":false,"log_type":"account"}', '2026-01-24 13:42:06.08303+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bf85cdcf-f1b1-480d-893c-840a262c5855', '{"action":"login","actor_id":"d78b49bc-6edf-47e2-9147-c2f68ace4908","actor_username":"test20@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 13:42:19.991707+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae486752-b58a-4a70-b5c5-4deeb03e517b', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test21@gmail.com","user_id":"419854cf-f8e8-41f3-a946-31caf538f2f9"}}', '2026-01-24 13:53:36.388588+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c2da36ec-4b5d-424d-bdeb-d4e81a52f689', '{"action":"user_signedup","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-24 13:53:44.653627+00', ''),
	('00000000-0000-0000-0000-000000000000', '7d9eb059-9d79-4e6e-b693-b7ef3990477e', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test30@gmail.com","user_id":"6da4454a-7e90-463e-bfcc-23e8ad5a5b72","user_phone":""}}', '2026-01-24 14:01:31.25956+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b86bbad8-ff95-48aa-9aa5-1aaf05de2bb8', '{"action":"user_recovery_requested","actor_id":"6da4454a-7e90-463e-bfcc-23e8ad5a5b72","actor_username":"test30@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:01:31.361204+00', ''),
	('00000000-0000-0000-0000-000000000000', '73b70a50-5ff7-46ad-b902-e4bc4cb39df5', '{"action":"login","actor_id":"6da4454a-7e90-463e-bfcc-23e8ad5a5b72","actor_username":"test30@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 14:01:41.716901+00', ''),
	('00000000-0000-0000-0000-000000000000', '2176f84d-7c98-4b11-83e4-a0fed53d46e5', '{"action":"user_updated_password","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:02:01.256498+00', ''),
	('00000000-0000-0000-0000-000000000000', '23d94fb8-66f1-488d-8a4a-61c4e4c9e038', '{"action":"user_modified","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:02:01.257526+00', ''),
	('00000000-0000-0000-0000-000000000000', '40d2c63f-e984-4025-b1f3-64ccc1576ba5', '{"action":"logout","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 14:02:15.698914+00', ''),
	('00000000-0000-0000-0000-000000000000', '799a0b5d-ae16-4496-b8ad-417b90cc1f16', '{"action":"login","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 14:02:34.091081+00', ''),
	('00000000-0000-0000-0000-000000000000', '52d66dd5-40cf-4681-bb9a-9c6cad9aeaad', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test70@gmail.com","user_id":"086d1433-b685-4563-84c0-1636ce087f84","user_phone":""}}', '2026-01-24 14:23:34.343988+00', ''),
	('00000000-0000-0000-0000-000000000000', '542c9e86-6b17-4258-b5f9-63946c66a29d', '{"action":"user_recovery_requested","actor_id":"086d1433-b685-4563-84c0-1636ce087f84","actor_username":"test70@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:23:34.437874+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e3c483f1-a6d7-4216-8dfe-094023cf03c1', '{"action":"login","actor_id":"086d1433-b685-4563-84c0-1636ce087f84","actor_username":"test70@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 14:23:45.458905+00', ''),
	('00000000-0000-0000-0000-000000000000', '4e56f714-e043-44cc-9079-1ec6b63abfd4', '{"action":"user_updated_password","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:24:07.225314+00', ''),
	('00000000-0000-0000-0000-000000000000', '8c9ee284-30bf-41f6-98d5-babbe7ab89a1', '{"action":"user_modified","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 14:24:07.22632+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc82e153-cf40-4f82-b3ba-08ad9d65ccda', '{"action":"logout","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-24 14:24:21.39368+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd4d0285a-f82e-4441-9d9f-d86dec2e400b', '{"action":"login","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-24 14:24:31.988798+00', ''),
	('00000000-0000-0000-0000-000000000000', '74f68b79-11a7-4159-b5f2-005e94fa37db', '{"action":"token_refreshed","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 16:46:49.866464+00', ''),
	('00000000-0000-0000-0000-000000000000', '2cc344b5-4f67-4e2d-b130-4b4f2486f9f4', '{"action":"token_revoked","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 16:46:49.867433+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f8d99e0a-4d3f-4992-a3ea-4a0d95ee5705', '{"action":"token_refreshed","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 17:51:14.716811+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c14ced75-8f85-4ef4-952f-7c164852f5e4', '{"action":"token_revoked","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-24 17:51:14.719413+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e982752a-0de2-4f23-9a46-416d5218b4df', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test00@gmail.com","user_id":"4a619815-3346-4795-8f3d-13a8273cf755","user_phone":""}}', '2026-01-24 18:16:32.367552+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b5408a43-a26b-40da-84c3-1c6b275d085c', '{"action":"user_recovery_requested","actor_id":"4a619815-3346-4795-8f3d-13a8273cf755","actor_username":"test00@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-24 18:16:32.479533+00', ''),
	('00000000-0000-0000-0000-000000000000', '73dda94b-5d41-4d24-8511-bf7add1878d5', '{"action":"token_refreshed","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-25 02:18:13.244904+00', ''),
	('00000000-0000-0000-0000-000000000000', '2517cb0e-064d-446b-8392-cb1065548c27', '{"action":"token_revoked","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-25 02:18:13.248698+00', ''),
	('00000000-0000-0000-0000-000000000000', '017132fc-6755-4636-a49f-ac4d7ca399d6', '{"action":"logout","actor_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","actor_username":"test21@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-25 02:56:27.127729+00', ''),
	('00000000-0000-0000-0000-000000000000', '49ec5c19-9071-429e-82a1-4b9063d20076', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-25 03:13:31.98132+00', ''),
	('00000000-0000-0000-0000-000000000000', '8030d577-eca6-40b5-a500-9e0b5fdd5834', '{"action":"logout","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-25 03:14:18.866636+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b06f87fb-835b-410e-a6d0-0ed7a7d9669e', '{"action":"login","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-25 03:16:05.777719+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c6ec99c5-20de-478b-bf5d-512910c5a012', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"sample1@gmail.com","user_id":"1be29cb0-ef54-473c-beba-ff95f4d9c0fd"}}', '2026-01-25 03:17:08.380956+00', ''),
	('00000000-0000-0000-0000-000000000000', '1610a9d1-5b95-4005-b646-604583752a3b', '{"action":"user_signedup","actor_id":"1be29cb0-ef54-473c-beba-ff95f4d9c0fd","actor_username":"sample1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-25 03:17:14.895563+00', ''),
	('00000000-0000-0000-0000-000000000000', '26cd6ecf-d90a-4394-a066-09beadda702a', '{"action":"user_updated_password","actor_id":"1be29cb0-ef54-473c-beba-ff95f4d9c0fd","actor_username":"sample1@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 03:17:26.726515+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fd0ae52c-dbfd-476c-8a81-524e9d3193c8', '{"action":"user_modified","actor_id":"1be29cb0-ef54-473c-beba-ff95f4d9c0fd","actor_username":"sample1@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 03:17:26.727741+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ecdc85e6-1084-489f-bc6f-6fcc093449a7', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"sample2@gmail.com","user_id":"a07f03a3-df3d-4317-b9b0-384045b72d0c","user_phone":""}}', '2026-01-25 03:31:55.998287+00', ''),
	('00000000-0000-0000-0000-000000000000', '40011b11-7523-4bb4-895a-dcd3ff631e1c', '{"action":"user_recovery_requested","actor_id":"a07f03a3-df3d-4317-b9b0-384045b72d0c","actor_username":"sample2@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 03:31:56.106487+00', ''),
	('00000000-0000-0000-0000-000000000000', '6fc0644f-12e3-40c0-9541-3768e1685f59', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"sample3@gmail.com","user_id":"470e97e4-b3ab-425f-b4c9-b0e0c9631d0d","user_phone":""}}', '2026-01-25 03:33:24.509259+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed964298-ae33-4007-9366-66d4f9452708', '{"action":"user_recovery_requested","actor_id":"470e97e4-b3ab-425f-b4c9-b0e0c9631d0d","actor_username":"sample3@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 03:33:24.615363+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd02c248c-a7b1-472d-8a39-e46ae79f718d', '{"action":"token_refreshed","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-25 04:16:28.962562+00', ''),
	('00000000-0000-0000-0000-000000000000', '550fa3dd-323e-443b-b027-316a961bebd2', '{"action":"token_revoked","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-01-25 04:16:28.964633+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fc2a27fa-1175-4e6f-9b59-cac01de13b37', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@hr-dx.jp","user_id":"7439d2ac-c481-4f72-8075-3f90cda5ab7c","user_phone":""}}', '2026-01-25 04:51:44.751583+00', ''),
	('00000000-0000-0000-0000-000000000000', '60f9d99f-9fbf-4360-8070-0660a78dc1ee', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"sample1@gmail.com","user_id":"1be29cb0-ef54-473c-beba-ff95f4d9c0fd","user_phone":""}}', '2026-01-25 04:51:44.752619+00', ''),
	('00000000-0000-0000-0000-000000000000', '6533d006-14c6-40bc-9eef-695fe0b0679b', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"sample2@gmail.com","user_id":"a07f03a3-df3d-4317-b9b0-384045b72d0c","user_phone":""}}', '2026-01-25 04:51:44.756318+00', ''),
	('00000000-0000-0000-0000-000000000000', '94ab245e-d0bb-4e8b-85ca-4476f7be1f76', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test00@gmail.com","user_id":"4a619815-3346-4795-8f3d-13a8273cf755","user_phone":""}}', '2026-01-25 04:51:44.756469+00', ''),
	('00000000-0000-0000-0000-000000000000', '07ac4b7d-2c4e-43d5-9dc7-c3f1c37eff55', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test30@gmail.com","user_id":"6da4454a-7e90-463e-bfcc-23e8ad5a5b72","user_phone":""}}', '2026-01-25 04:51:44.760334+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd6166c45-a60e-474d-a7a8-454dee0ccfc2', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"sample3@gmail.com","user_id":"470e97e4-b3ab-425f-b4c9-b0e0c9631d0d","user_phone":""}}', '2026-01-25 04:51:44.762511+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ce5661b-3719-4e08-93c1-07c0eb1c57c0', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test12@gmail.com","user_id":"38e601d1-5044-4596-a846-4c660f96a2a9","user_phone":""}}', '2026-01-25 04:51:44.845484+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c3a1c287-a07b-4aa9-9214-a1855a48ed52', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test15@gmail.com","user_id":"2e6ca620-1745-4ef9-b44f-1cd94eb67f16","user_phone":""}}', '2026-01-25 04:51:44.84631+00', ''),
	('00000000-0000-0000-0000-000000000000', '15d04c66-091a-44a5-91ec-24cbbea258fb', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test10@gmai.com","user_id":"36b2b550-95f9-4ad9-a28e-d1ef25636d8f","user_phone":""}}', '2026-01-25 04:51:44.850841+00', ''),
	('00000000-0000-0000-0000-000000000000', '244b8908-326e-489e-af9d-a56778333a34', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test16@gmail.com","user_id":"b350db6b-d4b4-43c5-b2ae-1a19a29572cc","user_phone":""}}', '2026-01-25 04:51:44.853149+00', ''),
	('00000000-0000-0000-0000-000000000000', '62a90812-cb23-44b3-80f0-62cde69cca06', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test11@gmail.com","user_id":"43e69bee-9459-4215-b307-5faf3f05a7b6","user_phone":""}}', '2026-01-25 04:51:44.85444+00', ''),
	('00000000-0000-0000-0000-000000000000', '694b5b22-32ac-466a-8444-4f028ee886bd', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test2@hr-dx.jp","user_id":"ad340298-0b20-45ca-a533-24b38d5bcda8","user_phone":""}}', '2026-01-25 04:51:44.857042+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e78e93e0-5ae9-405b-b19b-d7f6e18af0c8', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test20@gmail.com","user_id":"d78b49bc-6edf-47e2-9147-c2f68ace4908","user_phone":""}}', '2026-01-25 04:51:44.91538+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c57bc5ca-398f-4d8f-b112-4b77ff2ae334', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test21@gmail.com","user_id":"419854cf-f8e8-41f3-a946-31caf538f2f9","user_phone":""}}', '2026-01-25 04:51:44.917011+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd76ecf00-b45e-41b5-83b8-01c1829a51b7', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test3@hr-dx.jp","user_id":"76d85788-8b67-4ad2-a577-7f2e29008c65","user_phone":""}}', '2026-01-25 04:51:44.918669+00', ''),
	('00000000-0000-0000-0000-000000000000', '83005f75-cbb0-4b81-857a-fce56ebe99b6', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test9@hr-dx.jp","user_id":"b6c68ff2-fbea-4b1f-a5b9-a07c7b27c59e","user_phone":""}}', '2026-01-25 04:51:58.902979+00', ''),
	('00000000-0000-0000-0000-000000000000', '74b046df-8ad1-42f6-aaa5-acc91883dd22', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test4@hr-dx.jp","user_id":"476bf4f5-dd95-4896-ba2e-d84ffdeb42e7","user_phone":""}}', '2026-01-25 04:51:58.903929+00', ''),
	('00000000-0000-0000-0000-000000000000', '6591d490-2e44-4486-befc-39f21f27a586', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test70@gmail.com","user_id":"086d1433-b685-4563-84c0-1636ce087f84","user_phone":""}}', '2026-01-25 04:51:58.908136+00', ''),
	('00000000-0000-0000-0000-000000000000', '518ddc29-a6c2-4845-b989-a7c90edac46b', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test5@hr-dx.jp","user_id":"bb9bdc31-dc25-4cdb-a871-7e2927d51a1b","user_phone":""}}', '2026-01-25 04:51:58.910861+00', ''),
	('00000000-0000-0000-0000-000000000000', '8146f5ea-5349-4940-8d1b-e500ecec02e6', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test8@gmail.com","user_id":"03c164c0-7f35-4291-8bf0-0ddbb641790a","user_phone":""}}', '2026-01-25 04:51:58.911749+00', ''),
	('00000000-0000-0000-0000-000000000000', '78af191b-baf4-4972-be32-89c43b5fe643', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test7@hr-dx.jp","user_id":"5be2b213-163a-4c43-8b6c-84d48638145e","user_phone":""}}', '2026-01-25 04:51:58.915082+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fd9a9a04-2b65-46c7-835c-c6858f672fd9', '{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"sample@gmail.com","user_id":"b9704aff-e993-4e5f-831c-58f31c736490"}}', '2026-01-25 05:05:38.736358+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f28f47fe-e164-476c-bac3-9659ba607943', '{"action":"user_signedup","actor_id":"b9704aff-e993-4e5f-831c-58f31c736490","actor_username":"sample@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-01-25 05:05:58.855935+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c24594c7-fadd-4594-9419-906606ac4830', '{"action":"user_updated_password","actor_id":"b9704aff-e993-4e5f-831c-58f31c736490","actor_username":"sample@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 05:06:14.569857+00', ''),
	('00000000-0000-0000-0000-000000000000', '48f2bcf7-8557-43d0-b128-2900b83d077f', '{"action":"user_modified","actor_id":"b9704aff-e993-4e5f-831c-58f31c736490","actor_username":"sample@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 05:06:14.570832+00', ''),
	('00000000-0000-0000-0000-000000000000', 'df2b8cb4-0949-4006-8163-02c7e047f28c', '{"action":"logout","actor_id":"47e5fc59-9cb8-4a42-b6ba-dd06e2a06200","actor_username":"wada007@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-01-25 05:09:12.431537+00', ''),
	('00000000-0000-0000-0000-000000000000', '52cb697d-9882-4213-9868-c2a883371d70', '{"action":"login","actor_id":"b9704aff-e993-4e5f-831c-58f31c736490","actor_username":"sample@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-01-25 05:09:42.822152+00', ''),
	('00000000-0000-0000-0000-000000000000', '755fcbd9-8ec9-45ca-8d28-dac0d3acaa65', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test@gmail.com","user_id":"8d99aecc-baeb-4944-ba5a-f39cdd2322b9","user_phone":""}}', '2026-01-25 05:30:31.406455+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c3b2b994-9612-4a26-a055-dd6982a99ff9', '{"action":"user_recovery_requested","actor_id":"8d99aecc-baeb-4944-ba5a-f39cdd2322b9","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-01-25 05:30:31.507619+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") VALUES
	('dcb30ee1-7ea4-492c-9162-5715a8421c34', '6da4454a-7e90-463e-bfcc-23e8ad5a5b72', 'fb8092e7-dc1e-4fb1-b119-b58d8fe1ce3b', 's256', 'CyCRoleg4oByZES8uEj3bLqQ5lTTbS6Fs4SJNYJrc8A', 'recovery', '', '', '2026-01-24 14:01:31.328856+00', '2026-01-24 14:01:41.720919+00', 'recovery', '2026-01-24 14:01:41.72079+00'),
	('938863c1-6cdc-40d5-ac8c-2107824aa6dc', '086d1433-b685-4563-84c0-1636ce087f84', 'f749f755-90a6-4d98-b63e-1b27e39153a0', 's256', 'NkZbWCRgNDNkdoW8N7uwttCikHE4_3ucPEoC2NBesHI', 'recovery', '', '', '2026-01-24 14:23:34.409432+00', '2026-01-24 14:23:45.462522+00', 'recovery', '2026-01-24 14:23:45.462501+00'),
	('a5e407f2-1cb0-4b82-afe8-068d53436b6b', '4a619815-3346-4795-8f3d-13a8273cf755', '3aefe224-1348-4f35-8c75-5e0ced1e0a79', 's256', 'GVbqrvYX7tM2UNzGmF2VsnspiSToYrsV-SNw7rlt98Q', 'recovery', '', '', '2026-01-24 18:16:32.442262+00', '2026-01-24 18:16:32.442262+00', 'recovery', NULL),
	('b60184fb-4661-4dde-9bde-a13819520db4', 'a07f03a3-df3d-4317-b9b0-384045b72d0c', 'e95dc94c-0043-4b33-97e4-b3a3f75184ba', 's256', 'VMoejRWypki1eVUNW3p5OIwtipMMSBE0mNMtbV29LQQ', 'recovery', '', '', '2026-01-25 03:31:56.071646+00', '2026-01-25 03:31:56.071646+00', 'recovery', NULL),
	('cfa03736-9298-4de1-84b6-780b3b21fa25', '470e97e4-b3ab-425f-b4c9-b0e0c9631d0d', 'b4217f9f-3e81-4d40-b54d-84132efb9490', 's256', '7qP34AS2qtwyCYyONVvTjFTMlLwQl7iIzsv6mbelNVw', 'recovery', '', '', '2026-01-25 03:33:24.586738+00', '2026-01-25 03:33:24.586738+00', 'recovery', NULL),
	('bae003d0-069f-42f3-97ff-c100e5dc5d67', '8d99aecc-baeb-4944-ba5a-f39cdd2322b9', '12ffe60e-3e8e-487e-9fda-826c4f95d8db', 's256', 'k0PCwiqQAi4DHUEPU_031PVc7eJJjdzS9T2ymKb39gU', 'recovery', '', '', '2026-01-25 05:30:31.466993+00', '2026-01-25 05:30:31.466993+00', 'recovery', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '47e5fc59-9cb8-4a42-b6ba-dd06e2a06200', 'authenticated', 'authenticated', 'wada007@gmail.com', '$2a$10$QoRTnN7pQsihmgtwYAOuLuEnfcxwgj36IkRZ3b0a/6v6yvPOQQS6C', '2026-01-22 11:44:31.143768+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-01-25 03:16:05.779244+00', '{"role": "superuser", "provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-01-22 11:44:31.134153+00', '2026-01-25 04:16:28.968506+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b9704aff-e993-4e5f-831c-58f31c736490', 'authenticated', 'authenticated', 'sample@gmail.com', '$2a$10$7BNNyFKXhaEt3RAX9Hwj3eSbJ1EcipxoMUQOE/0aPchRVKQpC97pC', '2026-01-25 05:05:58.857086+00', '2026-01-25 05:05:38.73817+00', '', NULL, '', NULL, '', '', NULL, '2026-01-25 05:09:42.823909+00', '{"provider": "email", "providers": ["email"]}', '{"tenant_id": "6df3c36e-6e04-4ef1-867e-8accf8c596b2", "email_verified": true}', NULL, '2026-01-25 05:05:38.729829+00', '2026-01-25 05:09:42.828533+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '8d99aecc-baeb-4944-ba5a-f39cdd2322b9', 'authenticated', 'authenticated', 'test@gmail.com', '$2a$10$rbphhSe1Gork6QI3jlY7LuV3cefqOCVg3Oahc6cgwNaMfFkb5TbKG', '2026-01-25 05:30:31.408004+00', NULL, '', NULL, 'pkce_c02ad43d89c26a5dc051df3fe58cd3bcf72f386dc19d6a1a31878e79', '2026-01-25 05:30:31.508949+00', '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"tenant_id": "6df3c36e-6e04-4ef1-867e-8accf8c596b2", "email_verified": true}', NULL, '2026-01-25 05:30:31.402975+00', '2026-01-25 05:30:31.513749+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('47e5fc59-9cb8-4a42-b6ba-dd06e2a06200', '47e5fc59-9cb8-4a42-b6ba-dd06e2a06200', '{"sub": "47e5fc59-9cb8-4a42-b6ba-dd06e2a06200", "email": "wada007@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-01-22 11:44:31.138875+00', '2026-01-22 11:44:31.138908+00', '2026-01-22 11:44:31.138908+00', 'b0c560c3-af34-4c17-81c8-c31d770436ed'),
	('8d99aecc-baeb-4944-ba5a-f39cdd2322b9', '8d99aecc-baeb-4944-ba5a-f39cdd2322b9', '{"sub": "8d99aecc-baeb-4944-ba5a-f39cdd2322b9", "email": "test@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-01-25 05:30:31.405004+00', '2026-01-25 05:30:31.405033+00', '2026-01-25 05:30:31.405033+00', 'b2d9fcd8-02bd-400a-8ed2-978caf442fad'),
	('b9704aff-e993-4e5f-831c-58f31c736490', 'b9704aff-e993-4e5f-831c-58f31c736490', '{"sub": "b9704aff-e993-4e5f-831c-58f31c736490", "email": "sample@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2026-01-25 05:05:38.735079+00', '2026-01-25 05:05:38.73511+00', '2026-01-25 05:05:38.73511+00', 'b270b7b7-59a4-491d-8e43-6965f765b9bd');


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
	('edf25d83-a787-4611-8d16-e627fc21241a', 'b9704aff-e993-4e5f-831c-58f31c736490', '2026-01-25 05:05:58.861176+00', '2026-01-25 05:05:58.861176+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('7bf5f09b-54f9-46f9-b9ef-2b1389dfc79e', 'b9704aff-e993-4e5f-831c-58f31c736490', '2026-01-25 05:09:42.824011+00', '2026-01-25 05:09:42.824011+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('edf25d83-a787-4611-8d16-e627fc21241a', '2026-01-25 05:05:58.866049+00', '2026-01-25 05:05:58.866049+00', 'otp', '8ad7e2f1-005e-498b-917a-8006b0cb4112'),
	('7bf5f09b-54f9-46f9-b9ef-2b1389dfc79e', '2026-01-25 05:09:42.829302+00', '2026-01-25 05:09:42.829302+00', 'password', 'e7cfe3e8-3de8-4a40-9506-00eb10fccb04');


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
	('593351ff-7fdc-48b6-80c2-abb548122848', '8d99aecc-baeb-4944-ba5a-f39cdd2322b9', 'recovery_token', 'pkce_c02ad43d89c26a5dc051df3fe58cd3bcf72f386dc19d6a1a31878e79', 'test@gmail.com', '2026-01-25 05:30:31.516867', '2026-01-25 05:30:31.516867');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 41, 'n5ow6cokd7sc', 'b9704aff-e993-4e5f-831c-58f31c736490', false, '2026-01-25 05:05:58.862276+00', '2026-01-25 05:05:58.862276+00', NULL, 'edf25d83-a787-4611-8d16-e627fc21241a'),
	('00000000-0000-0000-0000-000000000000', 42, 'mxiiuvej6woi', 'b9704aff-e993-4e5f-831c-58f31c736490', false, '2026-01-25 05:09:42.826856+00', '2026-01-25 05:09:42.826856+00', NULL, '7bf5f09b-54f9-46f9-b9ef-2b1389dfc79e');


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
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenants" ("id", "name", "contact_date", "paid_amount", "employee_count", "paied_date", "created_at") VALUES
	('b0da40a6-e66a-4026-a7e6-fd8517fcc32e', 'システム管理用テナント', '2026-01-22', 0, 1, NULL, '2026-01-22 11:51:37.537119+00'),
	('6df3c36e-6e04-4ef1-867e-8accf8c596b2', 'サンプル株式会社', '2026-01-25', NULL, 1, NULL, '2026-01-25 05:05:38.687065+00');


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."divisions" ("id", "tenant_id", "name", "parent_id", "layer", "code") VALUES
	('0027ad77-eedf-4183-b523-fae56cbef9c7', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '全社（サンプル株式会社）', NULL, 1, '000'),
	('d8a315fd-bb96-4ec0-bec9-04efe1ac347f', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '関東本社（サンプル株式会社）', '0027ad77-eedf-4183-b523-fae56cbef9c7', 2, '010'),
	('5457c203-e5e2-495f-a483-624850acb6cd', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '関西本社（サンプル株式会社）', '0027ad77-eedf-4183-b523-fae56cbef9c7', 2, '020'),
	('14266094-7a4b-44bf-9f1a-7bb1b577393e', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '営業本部（サンプル株式会社）', 'd8a315fd-bb96-4ec0-bec9-04efe1ac347f', 3, '010'),
	('e5b43252-abc7-41d6-81a6-11c2e63ae504', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '営業部（関西）', '5457c203-e5e2-495f-a483-624850acb6cd', 3, '010'),
	('fb14bb01-9aff-4e20-8640-5344769d8d99', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '管理本部（サンプル株式会社関東）', 'd8a315fd-bb96-4ec0-bec9-04efe1ac347f', 3, '020'),
	('cccc27a5-4054-4fb7-beaa-600f456d88d3', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '人事部', 'fb14bb01-9aff-4e20-8640-5344769d8d99', 4, '010'),
	('62a28cb3-06fc-425a-8570-909888ffca04', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '総務部', 'fb14bb01-9aff-4e20-8640-5344769d8d99', 4, '020'),
	('d87409ce-1f34-4d64-91d9-8f2add88e356', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '営業第１課', '14266094-7a4b-44bf-9f1a-7bb1b577393e', 5, '010'),
	('5453873b-6478-4478-b421-91570450b1ac', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', '営業第２課', '14266094-7a4b-44bf-9f1a-7bb1b577393e', 4, '020');


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employees" ("id", "tenant_id", "division_id", "name", "app_role", "is_contacted_person", "contacted_date") VALUES
	('47e5fc59-9cb8-4a42-b6ba-dd06e2a06200', 'b0da40a6-e66a-4026-a7e6-fd8517fcc32e', NULL, '管理者 wada007', 'developer', false, NULL),
	('b9704aff-e993-4e5f-831c-58f31c736490', '6df3c36e-6e04-4ef1-867e-8accf8c596b2', 'cccc27a5-4054-4fb7-beaa-600f456d88d3', 'sample（人事マネージャー）', 'hr_manager', false, NULL);


--
-- Data for Name: service_category; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tenant_service; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 42, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict OaEqRY979zdz5Gqb1SulVWch19iN6fHTqUINqYQmaB9hqlniW644TqG8cYiuXD0

RESET ALL;

-- 1. Create Service Categories
INSERT INTO public.service_category (id, name, description, sort_order)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HR Management', 'Human Resources tools', 1),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Health', 'Health and Safety tools', 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Services
INSERT INTO public.service (id, name, service_category_id, category, description, release_status, target_audience, title)
VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Employee DB', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HR', 'Employee Database Management', 'released', 'all_users', 'Employee Database'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pulse Survey', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Health', 'Monthly Pulse Survey', 'released', 'all_users', 'Pulse Survey')
ON CONFLICT (id) DO NOTHING;

-- 3. Restore App Roles
INSERT INTO public.app_role (app_role, name) VALUES 
('employee', '一般従業員'),
('hr_manager', '人事担当者'),
('hr', '人事'),
('boss', '承認者'),
('company_doctor', '産業医'),
('company_nurse', '産業看護師'),
('hsc', '衛生管理者'),
('saas_adm', 'SaaS管理者'),
('developer', '開発者'),
('test', 'テストユーザー')
ON CONFLICT (app_role) DO NOTHING;
