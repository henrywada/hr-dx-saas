SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict vbNhQx97z6JTdsIbJRhpW2gBpYpWytvZaRa0MldkCcGLdXzmYwh2IBOUQkF5KDY

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
	('00000000-0000-0000-0000-000000000000', '9fd15386-38d9-4a1a-a376-1f08fc443b7b', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"wada007@gmail.com","user_id":"e97488f9-02be-4b0b-9dc9-ddb0c2902999","user_phone":""}}', '2026-02-13 12:40:48.264402+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', 'authenticated', 'authenticated', 'test@gmail.com', '$2a$10$sAkYlMoeGlURpY2pIdfv7O86ZcvGx9rbY9T/qqwjtxZSMVp7Q/yoy', '2026-02-13 11:42:20.967633+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:20.955151+00', '2026-02-13 11:42:20.968575+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '467befb4-ee25-433c-be40-886ba3871d97', 'authenticated', 'authenticated', 'test1@gmail.com', '$2a$10$.NxzNS06FMrRVNc2w.mRJ.RvdjOITaTGKTh76dFpJUac9IPpibuCi', '2026-02-13 11:42:52.828135+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 11:42:52.822127+00', '2026-02-13 11:42:52.829177+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', 'authenticated', 'authenticated', 'wada007@gmail.com', '$2a$10$bAJPz4ybTg6NIzOHnkv0t.4.qb6KLBhkTo0eww0b5smAF6fSM98He', '2026-02-13 12:40:48.266023+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-13 12:40:48.260315+00', '2026-02-13 12:40:48.266769+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


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



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



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



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



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
	('10000000-0000-0000-0000-000000000001', 'employee', '従業員'),
	('10000000-0000-0000-0000-000000000002', 'hr_manager', '人事マネージャー');


--
-- Data for Name: service_category; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."service_category" ("id", "sort_order", "name", "description", "release_status") VALUES
	('20000000-0000-0000-0000-000000000001', 1, '基本', '基本サービス', 'released');


--
-- Data for Name: service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."service" ("id", "service_category_id", "name", "category", "title", "description", "sort_order", "route_path", "app_role_group_id", "app_role_group_uuid", "target_audience", "release_status") VALUES
	('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'hr-agent', 'hr', 'HR Agent', 'HR支援', 1, '/hr-agent', NULL, NULL, 'all_users', 'released'),
	('82ec9e67-a151-4cf6-8092-d71cdf9fd265', NULL, 'SHOULD_FAIL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: app_role_service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--



--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."tenants" ("id", "name", "contact_date", "paid_amount", "employee_count", "paid_date", "created_at") VALUES
	('11111111-1111-1111-1111-111111111111', 'Tenant A', NULL, NULL, NULL, NULL, '2026-02-13 10:41:30.020372+00'),
	('22222222-2222-2222-2222-222222222222', 'Tenant B', NULL, NULL, NULL, NULL, '2026-02-13 10:41:30.020372+00');


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--



--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."employees" ("id", "tenant_id", "division_id", "active_status", "name", "is_manager", "app_role_id", "employee_no", "job_title", "sex", "start_date", "is_contacted_person", "contacted_date", "user_id") VALUES
	('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 'active', 'A太郎', true, '10000000-0000-0000-0000-000000000002', 'A-001', 'HR', 'M', '2024-01-01', true, '2024-01-02', '610ac6ac-395b-436a-b7f3-8a6d83cb073c'),
	('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 'active', 'B花子', false, '10000000-0000-0000-0000-000000000001', 'B-001', 'Sales', 'F', '2024-01-01', false, NULL, '467befb4-ee25-433c-be40-886ba3871d97');


--
-- Data for Name: tenant_service; Type: TABLE DATA; Schema: public; Owner: supabase_admin
--

INSERT INTO "public"."tenant_service" ("id", "tenant_id", "service_id", "start_date", "status") VALUES
	('c594d583-39ed-4906-9c92-2c6d5412d8fd', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
	('cd76fe3a-1014-4c73-9990-2ca7408a373c', '22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
	('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
	('40000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active');


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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict vbNhQx97z6JTdsIbJRhpW2gBpYpWytvZaRa0MldkCcGLdXzmYwh2IBOUQkF5KDY

RESET ALL;
