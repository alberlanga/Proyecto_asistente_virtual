--
-- PostgreSQL database dump
--

\restrict 7kpT2YepsSnjqSxPxzp4qHeNxD61ZIwO1q4BmqlTIdevog3hO5RYO2mBmCL0Jmf

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Agent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Agent" (
    id text NOT NULL,
    "userId" text,
    "phoneNumberId" text,
    assistant_id text,
    "agentName" text DEFAULT 'Recepcionista Virtual'::text,
    gender text DEFAULT 'female'::text,
    company text,
    "firstMessage" text,
    "servicesInfo" text,
    "additionalInfo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "incidentEmail" text,
    "incidentEnabled" boolean DEFAULT false NOT NULL,
    "incidentFields" text,
    "invoiceEmail" text,
    "invoiceEnabled" boolean DEFAULT false NOT NULL,
    "invoiceFields" text,
    "transferEmail" text,
    "transferEnabled" boolean DEFAULT false NOT NULL,
    "transferFields" text,
    contacts text,
    "servicesEmail" text,
    "servicesEnabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Agent" OWNER TO postgres;

--
-- Name: Call; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Call" (
    id text NOT NULL,
    "agentId" text NOT NULL,
    caller_phone text,
    status text DEFAULT 'completed'::text NOT NULL,
    cost double precision DEFAULT 0,
    call_type text,
    summary text,
    duration integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Call" OWNER TO postgres;

--
-- Name: PhoneNumber; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PhoneNumber" (
    id text NOT NULL,
    number text NOT NULL,
    "sipDomain" text,
    "sipUser" text,
    "sipPassword" text,
    "vapiPhoneNumberId" text,
    "vapiCredentialId" text,
    "userId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PhoneNumber" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "maxAssistants" integer DEFAULT 1 NOT NULL,
    "maxPhoneNumbers" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Data for Name: Agent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Agent" (id, "userId", "phoneNumberId", assistant_id, "agentName", gender, company, "firstMessage", "servicesInfo", "additionalInfo", "createdAt", "updatedAt", "incidentEmail", "incidentEnabled", "incidentFields", "invoiceEmail", "invoiceEnabled", "invoiceFields", "transferEmail", "transferEnabled", "transferFields", contacts, "servicesEmail", "servicesEnabled") FROM stdin;
37cf61c8-cab4-4d26-8cfa-8b9a51be5910	1c595e98-a756-4c26-a8af-cd44e19c64da	\N	4a82e724-de9c-47d4-9f82-f1de971f2472	Sofia	female	Somos.plus	Gracias por llamar a somos.plus, te atienda Sofia ¿ en que puedo ayudarte?	Ofrecemos servicios de mantenimiento industrial, instalación de equipos, soporte técnico 24h, y todo tipo de reparaciones de maquinaria.		2026-03-20 09:55:39.045	2026-03-20 12:39:00.596	alberlanga@somos.plus	t	["nombre","telefono","descripcion"]		f	["nombre","nif","periodo","telefono"]	\N	f	\N	[]	\N	t
699fbb40-924d-42eb-a776-7e00c3444643	1c595e98-a756-4c26-a8af-cd44e19c64da	f124e38a-fedb-4259-9a56-c97279935c37	f73ad12c-b59b-4961-b769-36bce5705653	tobby	male	zomoguapo	Hola zoy tobby, guau, ¿ en que te puedo ayudar?	ofrecemos paseos a perros 24 horas		2026-03-20 12:25:07.094	2026-03-20 12:39:07.542	alberlanga@somos.plus	t	["nombre","telefono","descripcion"]		f	["nombre","nif","periodo","telefono"]	\N	f	\N	[]	alberlanga@somos.plus	t
\.


--
-- Data for Name: Call; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Call" (id, "agentId", caller_phone, status, cost, call_type, summary, duration, "createdAt", "updatedAt") FROM stdin;
d0194519-5af6-4d89-8d6c-e21fb1b08649	37cf61c8-cab4-4d26-8cfa-8b9a51be5910	+623194123	failed	0	\N	Alejandro López contacted customer service because his machine would not start, seemingly due to a dead battery. The agent, Sofía, collected his name and phone number (610 069 999) and confirmed that a team member would contact him shortly to resolve the issue. The call concluded with the customer satisfied that his incident was registered.	\N	2026-03-20 11:26:37.039	2026-03-20 11:26:37.039
5e899f43-b03a-4df1-b154-96e7a7f9388c	37cf61c8-cab4-4d26-8cfa-8b9a51be5910	+623194123	failed	0.1321	incidencia	El motivo de la llamada fue que el usuario, Alejandro López, reportó que su máquina no arranca, aparentemente por falta de batería. La incidencia fue registrada por el asistente virtual, quien le informó que un miembro del equipo se pondrá en contacto con él lo antes posible para resolver el problema.	86	2026-03-20 11:37:12.745	2026-03-20 11:37:12.745
a040cc9f-ffed-4c9b-92aa-e5295ceec19b	37cf61c8-cab4-4d26-8cfa-8b9a51be5910	+623194123	failed	0.1553	lead	El usuario llamó para informarse sobre los servicios ofrecidos, mostrando interés en la instalación de maquinaria. Para resolver su consulta, se le solicitaron sus datos de contacto y se le informó que un miembro del equipo se comunicaría con él para brindarle más detalles.	108	2026-03-20 11:47:23.932	2026-03-20 11:47:23.932
e88090cf-5b2d-4af5-9b82-ba86d6789312	37cf61c8-cab4-4d26-8cfa-8b9a51be5910	670262954	failed	0.1827	incidencia	El usuario llamó porque su máquina no funciona o no enciende. La IA recopiló su nombre (Pepe) y número de contacto, registrando la incidencia. Se le informó que un miembro del equipo se comunicará con él para resolver el problema.	111	2026-03-20 12:06:37.158	2026-03-20 12:06:37.158
39ae0e57-ae51-46c7-bd44-8c69d921ae7c	699fbb40-924d-42eb-a776-7e00c3444643	+623194123	failed	0.0054	otro	El motivo de la llamada no se pudo determinar a partir de la transcripción proporcionada. La llamada finalizó porque el cliente la terminó.	5	2026-03-20 12:39:48.805	2026-03-20 12:39:48.805
160f1b19-f56d-4002-8efe-8d48820cfe5a	699fbb40-924d-42eb-a776-7e00c3444643	+623194123	failed	0.0047	otro	El motivo de la llamada no pudo ser determinado, ya que el cliente finalizó la comunicación inmediatamente después del saludo inicial del agente. Por lo tanto, la consulta no fue expresada ni resuelta.	4	2026-03-20 12:40:02.144	2026-03-20 12:40:02.144
\.


--
-- Data for Name: PhoneNumber; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PhoneNumber" (id, number, "sipDomain", "sipUser", "sipPassword", "vapiPhoneNumberId", "vapiCredentialId", "userId", "isActive", "createdAt", "updatedAt") FROM stdin;
f124e38a-fedb-4259-9a56-c97279935c37	+34911596038	ix6.neotel2000.com	4779-405	fJex2kwIZx4MBdEHKAvvW	314baf17-3f1b-43a2-a261-4e3a46531db6	0c7ea2f9-0c56-4f9e-90c6-016126b7ead2	1c595e98-a756-4c26-a8af-cd44e19c64da	t	2026-03-20 09:42:54.523	2026-03-20 09:55:48.737
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, role, "maxAssistants", "maxPhoneNumbers", "createdAt", "updatedAt") FROM stdin;
6f27a4af-25a5-405d-ad82-439aad6d310c	admin@somos.plus	$2b$10$iwf.AsqwQTInvYlXDLdkS.ValhDwrGLSc7UTNXw/1MA7AO.NaRjai	ADMIN	999	999	2026-03-17 14:25:56.807	2026-03-17 14:25:56.807
1c595e98-a756-4c26-a8af-cd44e19c64da	clupianez@somos.plus	$2b$10$8cXmQijfNLF7rn3KwY/tUeUJh3GvoGhEwEjyokvyqdXbhCqrAIXRy	USER	2	2	2026-03-17 14:37:46.254	2026-03-20 12:15:25.408
\.


--
-- Name: Agent Agent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_pkey" PRIMARY KEY (id);


--
-- Name: Call Call_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_pkey" PRIMARY KEY (id);


--
-- Name: PhoneNumber PhoneNumber_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PhoneNumber"
    ADD CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: PhoneNumber_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PhoneNumber_number_key" ON public."PhoneNumber" USING btree (number);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Agent Agent_phoneNumberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES public."PhoneNumber"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Agent Agent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Call Call_agentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhoneNumber PhoneNumber_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PhoneNumber"
    ADD CONSTRAINT "PhoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 7kpT2YepsSnjqSxPxzp4qHeNxD61ZIwO1q4BmqlTIdevog3hO5RYO2mBmCL0Jmf

