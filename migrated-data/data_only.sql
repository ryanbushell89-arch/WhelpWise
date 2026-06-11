--
-- PostgreSQL database dump
--

\restrict Yr2DO1hNjCga2GOpgcSp5nHe0LbwcdwF9pBdrGLRhJ5lQbwkodBQHHqenVZBocW

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: breeds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.breeds (id, name, "group") FROM stdin;
3	German Shepherd	Herding
5	Bulldog	Non-Sporting
6	Poodle	Non-Sporting
10	Dachshund	Hound
11	Pembroke Welsh Corgi	Herding
13	Doberman Pinscher	Working
16	Affenpinscher	Toys
17	Australian Silky Terrier	Toys
18	Bichon Frise	Toys
19	Biewer Terrier	Toys
20	Bolognese	Toys
21	Brussels Griffon	Toys
22	Cavalier King Charles Spaniel	Toys
23	Chihuahua (Long Coat)	Toys
24	Chihuahua (Smooth Coat)	Toys
25	Chinese Crested	Toys
26	Coton de Tulear	Toys
27	English Toy Terrier	Toys
28	Griffon Bruxellois	Toys
29	Havanese	Toys
30	Italian Greyhound	Toys
31	Japanese Chin	Toys
32	King Charles Spaniel	Toys
33	Lowchen	Toys
34	Maltese	Toys
35	Miniature Pinscher	Toys
36	Papillon	Toys
37	Pekingese	Toys
38	Phalene	Toys
39	Pomeranian	Toys
40	Pug	Toys
41	Shih Tzu	Toys
42	Toy Fox Terrier	Toys
43	Toy Manchester Terrier	Toys
44	Yorkshire Terrier	Toys
45	Airedale Terrier	Terriers
46	American Hairless Terrier	Terriers
47	American Staffordshire Terrier	Terriers
48	Australian Terrier	Terriers
49	Bedlington Terrier	Terriers
50	Border Terrier	Terriers
51	Bull Terrier	Terriers
52	Bull Terrier (Miniature)	Terriers
53	Cairn Terrier	Terriers
54	Cesky Terrier	Terriers
55	Dandie Dinmont Terrier	Terriers
56	Fox Terrier (Smooth)	Terriers
57	Fox Terrier (Wire)	Terriers
58	Glen of Imaal Terrier	Terriers
59	Irish Terrier	Terriers
60	Jack Russell Terrier	Terriers
61	Kerry Blue Terrier	Terriers
62	Lakeland Terrier	Terriers
63	Manchester Terrier	Terriers
64	Norfolk Terrier	Terriers
65	Norwich Terrier	Terriers
66	Parson Russell Terrier	Terriers
67	Rat Terrier	Terriers
68	Russell Terrier	Terriers
69	Scottish Terrier	Terriers
70	Sealyham Terrier	Terriers
71	Skye Terrier	Terriers
72	Soft Coated Wheaten Terrier	Terriers
73	Staffordshire Bull Terrier	Terriers
74	Welsh Terrier	Terriers
75	West Highland White Terrier	Terriers
76	American Cocker Spaniel	Gundogs
77	American Water Spaniel	Gundogs
78	Barbet	Gundogs
79	Boykin Spaniel	Gundogs
80	Bracco Italiano	Gundogs
81	Braque du Bourbonnais	Gundogs
82	Braque Francais Pyrenean	Gundogs
83	Brittany	Gundogs
84	Chesapeake Bay Retriever	Gundogs
85	Clumber Spaniel	Gundogs
86	Cocker Spaniel	Gundogs
87	Curly Coated Retriever	Gundogs
88	English Setter	Gundogs
89	English Springer Spaniel	Gundogs
90	Field Spaniel	Gundogs
91	Flat Coated Retriever	Gundogs
92	German Longhaired Pointer	Gundogs
9	German Shorthaired Pointer	Gundogs
94	German Wirehaired Pointer	Gundogs
2	Golden Retriever	Gundogs
96	Gordon Setter	Gundogs
97	Hungarian Vizsla	Gundogs
98	Hungarian Wire Haired Vizsla	Gundogs
99	Irish Red and White Setter	Gundogs
100	Irish Setter	Gundogs
101	Irish Water Spaniel	Gundogs
102	Italian Spinone	Gundogs
103	Kooikerhondje	Gundogs
1	Labrador Retriever	Gundogs
105	Lagotto Romagnolo	Gundogs
106	Large Munsterlander	Gundogs
107	Nova Scotia Duck Tolling Retriever	Gundogs
108	Perdigueiro Portugues	Gundogs
109	Pointer	Gundogs
110	Pointing Griffon	Gundogs
111	Pudelpointer	Gundogs
112	Small Munsterlander	Gundogs
113	Spanish Water Dog	Gundogs
114	Spinone Italiano	Gundogs
115	Sussex Spaniel	Gundogs
15	Weimaraner	Gundogs
117	Welsh Springer Spaniel	Gundogs
118	Wirehaired Pointing Griffon	Gundogs
119	Wirehaired Vizsla	Gundogs
120	Afghan Hound	Hounds
121	American English Coonhound	Hounds
122	American Foxhound	Hounds
123	Azawakh	Hounds
124	Basenji	Hounds
125	Basset Fauve de Bretagne	Hounds
126	Basset Griffon Vendeen (Grand)	Hounds
127	Basset Griffon Vendeen (Petit)	Hounds
128	Basset Hound	Hounds
129	Bavarian Mountain Hound	Hounds
7	Beagle	Hounds
131	Black and Tan Coonhound	Hounds
132	Bloodhound	Hounds
133	Bluetick Coonhound	Hounds
134	Borzoi	Hounds
135	Cirneco dell'Etna	Hounds
136	Dachshund (Miniature Long Haired)	Hounds
137	Dachshund (Miniature Smooth Haired)	Hounds
138	Dachshund (Miniature Wire Haired)	Hounds
139	Dachshund (Standard Long Haired)	Hounds
140	Dachshund (Standard Smooth Haired)	Hounds
141	Dachshund (Standard Wire Haired)	Hounds
142	Deerhound	Hounds
143	English Foxhound	Hounds
144	Finnish Spitz	Hounds
145	Grand Basset Griffon Vendeen	Hounds
146	Greyhound	Hounds
147	Hamiltonstovare	Hounds
148	Harrier	Hounds
149	Ibizan Hound	Hounds
150	Irish Wolfhound	Hounds
151	Norrbottenspets	Hounds
152	Norwegian Elkhound	Hounds
153	Otterhound	Hounds
154	Pharaoh Hound	Hounds
155	Plott Hound	Hounds
156	Portuguese Podengo	Hounds
157	Redbone Coonhound	Hounds
158	Rhodesian Ridgeback	Hounds
159	Saluki	Hounds
160	Sloughi	Hounds
161	Transylvanian Hound	Hounds
162	Treeing Walker Coonhound	Hounds
163	Whippet	Hounds
164	Australian Cattle Dog	Working Dogs
165	Australian Kelpie	Working Dogs
166	Australian Shepherd	Working Dogs
167	Australian Stumpy Tail Cattle Dog	Working Dogs
168	Barbado da Terceira	Working Dogs
169	Bearded Collie	Working Dogs
170	Belgian Shepherd (Groenendael)	Working Dogs
171	Belgian Shepherd (Laekenois)	Working Dogs
172	Belgian Shepherd (Malinois)	Working Dogs
173	Belgian Shepherd (Tervueren)	Working Dogs
174	Bergamasco Sheepdog	Working Dogs
14	Border Collie	Working Dogs
176	Bouvier des Flandres	Working Dogs
177	Briard	Working Dogs
178	Canaan Dog	Working Dogs
179	Collie (Rough)	Working Dogs
180	Collie (Smooth)	Working Dogs
181	Croatian Sheepdog	Working Dogs
182	Dutch Shepherd	Working Dogs
183	Finnish Lapphund	Working Dogs
184	German Shepherd Dog	Working Dogs
185	Icelandic Sheepdog	Working Dogs
186	Kishu Ken	Working Dogs
187	Lancashire Heeler	Working Dogs
188	Maremma Sheepdog	Working Dogs
189	Miniature American Shepherd	Working Dogs
190	Norwegian Buhund	Working Dogs
191	Norwegian Lundehund	Working Dogs
192	Old English Sheepdog	Working Dogs
193	Polish Lowland Sheepdog	Working Dogs
194	Pumi	Working Dogs
195	Pyrenean Sheepdog	Working Dogs
196	Shetland Sheepdog	Working Dogs
197	Shikoku	Working Dogs
198	Swedish Lapphund	Working Dogs
199	Swedish Vallhund	Working Dogs
200	Welsh Corgi (Cardigan)	Working Dogs
201	Welsh Corgi (Pembroke)	Working Dogs
202	Yakutian Laika	Working Dogs
203	Akita	Utility
204	Alaskan Malamute	Utility
205	Anatolian Shepherd Dog	Utility
206	Appenzeller Sennenhund	Utility
207	Bernese Mountain Dog	Utility
208	Black Russian Terrier	Utility
209	Boerboel	Utility
210	Boxer	Utility
211	Bullmastiff	Utility
212	Cane Corso	Utility
213	Caucasian Shepherd Dog	Utility
214	Dobermann	Utility
215	Dogo Argentino	Utility
216	Dogue de Bordeaux	Utility
217	Entlebucher Mountain Dog	Utility
218	Eurasier	Utility
219	Giant Schnauzer	Utility
220	Great Dane	Utility
221	Greater Swiss Mountain Dog	Utility
222	Greenland Dog	Utility
223	Hovawart	Utility
224	Karelian Bear Dog	Utility
225	Komondor	Utility
226	Leonberger	Utility
227	Mastiff	Utility
228	Neapolitan Mastiff	Utility
229	Newfoundland	Utility
230	Portuguese Water Dog	Utility
8	Rottweiler	Utility
232	Saint Bernard	Utility
233	Samoyed	Utility
12	Siberian Husky	Utility
235	Spanish Mastiff	Utility
236	Standard Schnauzer	Utility
237	Tibetan Mastiff	Utility
238	American Eskimo Dog	Non-Sporting
239	Boston Terrier	Non-Sporting
240	British Bulldog	Non-Sporting
241	Chow Chow	Non-Sporting
242	Dalmatian	Non-Sporting
4	French Bulldog	Non-Sporting
244	German Spitz (Klein)	Non-Sporting
245	German Spitz (Mittel)	Non-Sporting
246	Keeshond	Non-Sporting
247	Lhasa Apso	Non-Sporting
248	Mexican Hairless (Intermediate)	Non-Sporting
249	Mexican Hairless (Miniature)	Non-Sporting
250	Mexican Hairless (Standard)	Non-Sporting
251	Miniature Schnauzer	Non-Sporting
252	Peruvian Hairless Dog (Large)	Non-Sporting
253	Peruvian Hairless Dog (Medium)	Non-Sporting
254	Peruvian Hairless Dog (Small)	Non-Sporting
255	Poodle (Miniature)	Non-Sporting
256	Poodle (Standard)	Non-Sporting
257	Poodle (Toy)	Non-Sporting
258	Russkaya Tsvetnaya Bolonka	Non-Sporting
259	Schipperke	Non-Sporting
260	Shar Pei	Non-Sporting
261	Shiba Inu	Non-Sporting
262	Tibetan Spaniel	Non-Sporting
263	Tibetan Terrier	Non-Sporting
264	Xoloitzcuintli	Non-Sporting
\.


--
-- Data for Name: breed_health_tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.breed_health_tests (id, breed_id, test_name, required, description) FROM stdin;
1	1	Hip Score	true	OFA or BVA hip evaluation
2	1	Elbow Score	true	OFA or BVA elbow evaluation
3	1	PRA DNA	true	Progressive Retinal Atrophy DNA test
4	1	EIC DNA	false	Exercise Induced Collapse DNA test
5	1	CNM DNA	false	Centronuclear Myopathy DNA test
6	2	Hip Score	true	OFA or BVA hip evaluation
7	2	Elbow Score	true	OFA or BVA elbow evaluation
8	2	Heart Evaluation	true	Cardiac evaluation by cardiologist
9	2	Eye Evaluation	true	CAER eye exam
10	2	PRA DNA	false	Progressive Retinal Atrophy DNA test
\.


--
-- Data for Name: dogs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dogs (id, registered_name, call_name, breed_id, sex, dob, colour, microchip, registration_number, sire_id, dam_id, visibility, photo_url, status, created_at, updated_at, is_external, user_id) FROM stdin;
1	Goldenridge Storm's Apollo	Apollo	2	male	2021-03-15	Golden	985112345678901	GR-2021-0341	\N	\N	stud	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 03:30:45.474129+00	false	\N
3	Riverfield Autumn Harvest	Autumn	2	female	2022-01-10	Dark Golden	985112345678903	GR-2022-0089	\N	\N	private	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 03:30:45.474129+00	false	\N
4	Sunnyside Luna Eclipse	Luna	2	female	2020-09-05	Golden	985112345678904	GR-2020-0256	\N	\N	private	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 03:30:45.474129+00	false	\N
5	Ridgecrest Max Thunder	Max	1	male	2022-06-18	Black	985112345678905	LR-2022-0412	\N	\N	stud	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 03:30:45.474129+00	false	\N
6	Lakeside Bella Moonrise	Bella	1	female	2021-11-30	Yellow	985112345678906	LR-2021-0534	\N	\N	private	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 03:30:45.474129+00	false	\N
7	Test Sire	Test Sire	\N	male	\N	\N	\N	SR-001	\N	\N	private	\N	active	2026-06-08 07:17:12.930622+00	2026-06-08 07:17:12.969+00	true	\N
8	Test Dam	Test Dam	\N	female	\N	\N	\N	DM-001	\N	\N	private	\N	active	2026-06-08 07:17:12.964421+00	2026-06-08 07:17:12.976+00	true	\N
9	CH Goldenridge Atlas	CH Goldenridge Atlas	\N	male	\N	\N	\N	GR-2015-0044	11	\N	private	\N	active	2026-06-08 07:17:23.342168+00	2026-06-08 07:17:23.354+00	true	\N
10	Sunridge Lady Grace	Sunridge Lady Grace	\N	female	\N	\N	\N	GR-2016-0021	\N	\N	private	\N	active	2026-06-08 07:17:23.346386+00	2026-06-08 07:17:23.357+00	true	\N
11	CH Goldstrike Captain Bold	CH Goldstrike Captain Bold	\N	male	\N	\N	\N	GR-2011-0009	\N	\N	private	\N	active	2026-06-08 07:17:23.351293+00	2026-06-08 07:17:23.361+00	true	\N
2	Goldenridge Perfect Storm	Storm	2	male	2019-07-22	Light Golden	985112345678902	GR-2019-0187	9	10	public	\N	active	2026-06-08 03:30:45.474129+00	2026-06-08 07:17:23.364+00	false	\N
\.


--
-- Data for Name: breedings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.breedings (id, sire_id, dam_id, date, method, tie_duration, notes, created_at, updated_at, ultrasound_date, ultrasound_completed, ultrasound_notes, xray_date, xray_completed, xray_puppy_count, xray_notes, user_id) FROM stdin;
1	1	3	2024-11-15	natural	25	Progesterone confirmed ovulation. Good tie.	2026-06-08 03:31:42.831163+00	2026-06-08 07:48:54.077+00	\N	true	\N	\N	true	\N	\N	\N
\.


--
-- Data for Name: buyers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.buyers (id, first_name, last_name, email, phone, address, deposit_amount, deposit_paid, balance_amount, balance_paid, contract_signed, notes, created_at, updated_at, user_id) FROM stdin;
1	Sarah	Thompson	sarah.thompson@email.com	+1-555-0123	\N	500	true	2500	false	true	\N	2026-06-08 03:32:15.153253+00	2026-06-08 03:32:15.153253+00	\N
2	James	Patterson	james.p@email.com	+1-555-0456	\N	500	false	2500	false	false	\N	2026-06-08 03:32:15.153253+00	2026-06-08 03:32:15.153253+00	\N
\.


--
-- Data for Name: litters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.litters (id, sire_id, dam_id, breeding_id, dob, total_born, live_males, live_females, stillborn, notes, status, created_at, updated_at, photo_url, user_id) FROM stdin;
1	1	3	1	2025-01-17	8	4	4	0	Excellent litter, all pups nursing well	whelped	2026-06-08 03:31:51.382657+00	2026-06-08 03:31:51.382657+00	\N	\N
2	1	6	\N	2026-06-08	\N	\N	\N	\N	\N	whelped	2026-06-08 04:30:29.236837+00	2026-06-08 07:47:51.997+00	\N	\N
\.


--
-- Data for Name: puppies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppies (id, litter_id, buyer_id, collar_colour, sex, colour, markings, birth_weight, birth_time, placenta_present, alive, notes, collection_date, created_at, updated_at, name, call_name, registered_name, photo_url) FROM stdin;
2	1	\N	Blue	male	Golden	\N	398	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
3	1	\N	Green	male	Dark Golden	\N	410	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
4	1	\N	Orange	male	Light Golden	\N	385	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
5	1	\N	Pink	female	Golden	\N	372	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
6	1	\N	Purple	female	Light Golden	\N	388	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
7	1	\N	Yellow	female	Dark Golden	\N	401	\N	\N	true	\N	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
8	1	\N	White	female	Golden	\N	356	\N	\N	true	Smallest pup - monitor closely	\N	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
1	1	1	Red	male	Golden	\N	425	\N	\N	true	Biggest pup	2025-03-01	2026-06-08 03:32:02.220707+00	2026-06-08 03:32:02.220707+00	\N	\N	\N	\N
11	2	\N	Red	male	\N	\N	200	17:43	\N	true	\N	\N	2026-06-08 07:43:36.237676+00	2026-06-08 07:43:36.237676+00	#1	\N	\N	\N
12	2	\N	Blue	female	\N	\N	300	17:45	\N	true	\N	\N	2026-06-08 07:45:42.833649+00	2026-06-08 07:45:42.833649+00	#2	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, stripe_customer_id, stripe_subscription_id, trial_started_at, created_at, stripe_stud_sub_id, role) FROM stdin;
user_3Eqk4sYI5o55vjL8i5XX4r9PYm8	\N	\N	\N	2026-06-08 10:08:20.995602+00	2026-06-08 10:08:20.995602+00	\N	breeder
\.


--
-- Data for Name: chat_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_conversations (id, puppy_id, breeder_user_id, owner_user_id, unread_breeder, unread_owner, last_message_at, created_at) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, conversation_id, sender_user_id, sender_role, encrypted_content, iv, read_at, sent_at) FROM stdin;
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contracts (id, type, status, puppy_id, stud_listing_id, waiting_list_id, buyer_name, buyer_email, buyer_phone, buyer_address, bitch_owner_name, bitch_owner_email, bitch_owner_phone, bitch_owner_address, bitch_name, bitch_reg_number, bitch_breed, sale_price, deposit_amount, balance_due, balance_due_date, stud_fee, stud_fee_payment_terms, special_conditions, return_policy, health_guarantee, template_url, signed_contract_url, notes, contract_date, created_at, updated_at) FROM stdin;
1	puppy_sale_limited	draft	12	\N	1	Bob	Ryanbushell89@gmail.com	444	Sw	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-08	2026-06-08 11:37:36.805401+00	2026-06-08 11:37:36.805401+00
\.


--
-- Data for Name: family_pets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.family_pets (id, name, species, breed, sex, dob, colour, microchip, vet_name, vet_phone, notes, photo_url, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: health_test_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.health_test_results (id, dog_id, test_name, result, date, laboratory, certificate_url, notes, created_at) FROM stdin;
1	1	Hip Score	Excellent	2022-10-15	OFA	\N	OFA Hip Score: Excellent	2026-06-08 03:31:38.0857+00
2	1	Elbow Score	Normal	2022-10-15	OFA	\N	OFA Elbow Score: Normal	2026-06-08 03:31:38.0857+00
3	1	Eye Evaluation	Clear	2023-02-20	CAER	\N	Annual eye check - clear	2026-06-08 03:31:38.0857+00
4	1	Heart Evaluation	Normal	2023-02-20	CAER Cardiologist	\N	No murmur detected	2026-06-08 03:31:38.0857+00
5	3	Hip Score	Good	2023-06-01	OFA	\N	\N	2026-06-08 03:31:38.0857+00
6	3	Elbow Score	Normal	2023-06-01	OFA	\N	\N	2026-06-08 03:31:38.0857+00
7	5	Hip Score	Good	2023-07-10	OFA	\N	\N	2026-06-08 03:31:38.0857+00
8	5	Elbow Score	Normal	2023-07-10	OFA	\N	\N	2026-06-08 03:31:38.0857+00
9	5	PRA DNA	Clear	2023-07-10	Embark	\N	\N	2026-06-08 03:31:38.0857+00
10	6	MDR1	Clear	\N	\N	\N	\N	2026-06-08 04:29:53.701189+00
\.


--
-- Data for Name: heat_cycles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.heat_cycles (id, dog_id, start_date, end_date, notes, created_at) FROM stdin;
1	3	2024-11-01	2024-11-21	Normal cycle length. Bred on day 12 and 14.	2026-06-08 03:32:28.419347+00
2	4	2025-01-05	\N	Currently in heat. Monitoring progesterone.	2026-06-08 03:32:28.419347+00
\.


--
-- Data for Name: pet_vaccinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pet_vaccinations (id, pet_id, vaccine, date_given, next_due_date, vet, notes, created_at) FROM stdin;
\.


--
-- Data for Name: pet_vet_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pet_vet_visits (id, pet_id, date, reason, vet, notes, cost, created_at) FROM stdin;
\.


--
-- Data for Name: progesterone_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progesterone_readings (id, dog_id, date, value, units, laboratory, ovulation_predicted, recommendation, created_at) FROM stdin;
1	4	2025-01-07	1.2	ng/mL	VCA Labs	false	Continue monitoring	2026-06-08 03:32:32.984438+00
2	4	2025-01-09	2.8	ng/mL	VCA Labs	true	LH surge detected — ovulation imminent. Breed in 2-3 days.	2026-06-08 03:32:32.984438+00
3	4	2025-01-11	8.5	ng/mL	VCA Labs	true	Optimal breeding window. AI or natural mating recommended today.	2026-06-08 03:32:32.984438+00
\.


--
-- Data for Name: puppy_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppy_documents (id, puppy_id, doc_type, name, file_url, created_at) FROM stdin;
\.


--
-- Data for Name: puppy_owner_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppy_owner_accounts (id, user_id, puppy_id, buyer_id, breeder_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: puppy_owner_invites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppy_owner_invites (id, token, puppy_id, buyer_id, breeder_user_id, email, status, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: puppy_vaccinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppy_vaccinations (id, puppy_id, date, vaccine_name, batch_lot, vet, next_due_date, notes, created_at) FROM stdin;
\.


--
-- Data for Name: puppy_worming; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puppy_worming (id, puppy_id, date, product, dose, notes, created_at) FROM stdin;
\.


--
-- Data for Name: stud_listings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stud_listings (id, dog_id, stud_fee, currency, country, location, description, health_tested, active, expires_at, created_at, updated_at, user_id) FROM stdin;
1	1	1500	USD	United States	California	Champion bloodlines. OFA Excellent hips, clear eyes. Available for approved females only.	true	true	\N	2026-06-08 03:32:23.784522+00	2026-06-08 03:32:23.784522+00	\N
2	5	1200	USD	United States	Texas	Health tested Labrador stud. Excellent temperament. Proven sire.	true	true	\N	2026-06-08 03:32:23.784522+00	2026-06-08 03:32:23.784522+00	\N
\.


--
-- Data for Name: waiting_list; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.waiting_list (id, name, email, phone, address, breed_preference, sex_preference, colour_preference, litter_preference, timeframe, deposit_paid, deposit_amount, priority, notes, status, puppy_id, created_at, updated_at) FROM stdin;
1	Bob	Ryanbushell89@gmail.com	444	Sw	We	male	\N	\N	\N	false	\N	\N	\N	assigned	12	2026-06-08 08:44:52.676414+00	2026-06-08 11:37:00.824+00
\.


--
-- Data for Name: weight_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weight_entries (id, puppy_id, date, weight_grams, notes, alert_triggered, override_reason, created_at) FROM stdin;
1	1	2025-01-17	425	\N	false	\N	2026-06-08 03:32:10.688088+00
2	1	2025-01-18	448	\N	false	\N	2026-06-08 03:32:10.688088+00
3	1	2025-01-19	471	\N	false	\N	2026-06-08 03:32:10.688088+00
4	1	2025-01-20	495	\N	false	\N	2026-06-08 03:32:10.688088+00
5	1	2025-01-21	519	\N	false	\N	2026-06-08 03:32:10.688088+00
6	1	2025-01-22	543	\N	false	\N	2026-06-08 03:32:10.688088+00
7	1	2025-01-23	568	\N	false	\N	2026-06-08 03:32:10.688088+00
8	2	2025-01-17	398	\N	false	\N	2026-06-08 03:32:10.688088+00
9	2	2025-01-18	418	\N	false	\N	2026-06-08 03:32:10.688088+00
10	2	2025-01-19	440	\N	false	\N	2026-06-08 03:32:10.688088+00
11	2	2025-01-20	462	\N	false	\N	2026-06-08 03:32:10.688088+00
12	2	2025-01-21	445	\N	true	\N	2026-06-08 03:32:10.688088+00
13	2	2025-01-22	471	\N	false	\N	2026-06-08 03:32:10.688088+00
16	11	2026-06-08	300	\N	false	\N	2026-06-08 07:46:02.2322+00
17	11	2026-06-09	400	\N	false	\N	2026-06-08 07:46:12.778677+00
\.


--
-- Data for Name: whelping_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whelping_documents (id, litter_id, name, file_url, created_at) FROM stdin;
\.


--
-- Data for Name: whelping_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whelping_records (id, litter_id, start_time, end_time, complications, notes, created_at) FROM stdin;
1	2	17:47	17:47	\N	\N	2026-06-08 07:47:51.991616+00
\.


--
-- Name: breed_health_tests_breed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.breed_health_tests_breed_id_seq', 1, false);


--
-- Name: breed_health_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.breed_health_tests_id_seq', 10, true);


--
-- Name: breedings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.breedings_id_seq', 1, true);


--
-- Name: breeds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.breeds_id_seq', 264, true);


--
-- Name: buyers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.buyers_id_seq', 2, true);


--
-- Name: chat_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chat_conversations_id_seq', 1, false);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 1, false);


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contracts_id_seq', 1, true);


--
-- Name: dogs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dogs_id_seq', 11, true);


--
-- Name: family_pets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.family_pets_id_seq', 1, true);


--
-- Name: health_test_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.health_test_results_id_seq', 10, true);


--
-- Name: heat_cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.heat_cycles_id_seq', 2, true);


--
-- Name: litters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.litters_id_seq', 2, true);


--
-- Name: pet_vaccinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pet_vaccinations_id_seq', 1, false);


--
-- Name: pet_vet_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pet_vet_visits_id_seq', 1, false);


--
-- Name: progesterone_readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.progesterone_readings_id_seq', 3, true);


--
-- Name: puppies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppies_id_seq', 12, true);


--
-- Name: puppy_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppy_documents_id_seq', 1, false);


--
-- Name: puppy_owner_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppy_owner_accounts_id_seq', 1, false);


--
-- Name: puppy_owner_invites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppy_owner_invites_id_seq', 1, false);


--
-- Name: puppy_vaccinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppy_vaccinations_id_seq', 1, false);


--
-- Name: puppy_worming_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puppy_worming_id_seq', 1, false);


--
-- Name: stud_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stud_listings_id_seq', 2, true);


--
-- Name: waiting_list_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.waiting_list_id_seq', 1, true);


--
-- Name: weight_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weight_entries_id_seq', 17, true);


--
-- Name: whelping_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whelping_documents_id_seq', 1, false);


--
-- Name: whelping_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whelping_records_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Yr2DO1hNjCga2GOpgcSp5nHe0LbwcdwF9pBdrGLRhJ5lQbwkodBQHHqenVZBocW

