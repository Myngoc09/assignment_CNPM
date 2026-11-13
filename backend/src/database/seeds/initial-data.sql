--
-- PostgreSQL database dump
--

\restrict naAKjSO9CKi4FAYgceM8aa9fIJHeZIXNOOrtWXqxk7LqK6L0jyczmd8ugtNa4P4

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

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
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: brewlite
--

INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('e04fc0aa-b0af-4d04-b0c2-8f72f9c5fd0f', 'Ly nhựa 350ml', 'cai', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('2fbe70cf-7e50-4067-a924-b96345f2e23f', 'Ly nhựa 650ml', 'cai', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('ba09e0c3-78f7-4b4d-ad1a-bc9211698991', 'Bột mì', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('c8607e6a-822b-42e6-a5b7-5602f433ed7e', 'Bơ lạt không muối', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('1c99b280-5901-4cb3-b60a-a5de29138298', 'Men nở khô', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('26e4ffd3-432a-401c-a5fc-2dec5f1daf61', 'Nước cốt chanh', 'ml', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('f0aee109-42a8-43ea-9614-478c7ec7a1f6', 'Trứng gà', 'qua', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('b9d9396d-9c70-4a41-97ed-a1b037b73c1b', 'Sữa tươi không đường', 'ml', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('8cf213c2-2410-4f06-b91d-c572dbcf1c11', 'Bột matcha Uji', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('e92f4081-82b5-40e5-9f5f-0592cfda0f6c', 'Đường syrup', 'ml', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('fabbeaca-3835-4b7c-b23d-28fb81a75d2a', 'Túi trà', 'tui', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('f163abe7-9009-4ad2-802a-8a800db484b4', 'Đào ngâm', 'mieng', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('fe9fd880-4496-4b4d-93a8-843e000e4bcd', 'Sả đập dập', 'cay', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('26146515-b0cc-41be-84a5-b18545ff7dfb', 'Đường', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('611b4aa7-4dcc-48fd-8451-cc3d1b92f920', 'Cam', 'qua', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('b7aa6041-a9ac-4074-a165-b579e1c0f07a', 'Bột cà phê nguyên chất', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('2c522832-cc58-490d-b925-3cd4242c6f7e', 'Sữa đặc', 'ml', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('3919089c-aeb6-4204-a243-2dc4c8b07ddc', 'Whipping cream thực vật', 'ml', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('1e3737e3-6315-45b2-bf45-e986a05e1939', 'Muối', 'g', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('03788023-4e3d-4a4e-9240-dae3cc102df5', 'Ly nhựa 500ml', 'cai', 1000, 0, 1);
INSERT INTO public.ingredients (id, name, unit, stock, "reservedStock", version) VALUES ('9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'Ống hút', 'cai', 1000, 0, 1);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: brewlite
--

INSERT INTO public.products (id, name, category, rating, price, "imageUrl", stock, version) VALUES ('3', 'Bánh Croissant Bơ Tươi', 'Bánh Ngọt', 4.8, 38000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', 100, 1);
INSERT INTO public.products (id, name, category, rating, price, "imageUrl", stock, version) VALUES ('4', 'Matcha Latte Uji', 'Trà', 4.8, 55000, 'https://images.unsplash.com/photo-1534778101976-62847782c213', 100, 1);
INSERT INTO public.products (id, name, category, rating, price, "imageUrl", stock, version) VALUES ('2', 'Trà Đào Cam Sả', 'Trà', 4.8, 50000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc', 100, 1);
INSERT INTO public.products (id, name, category, rating, price, "imageUrl", stock, version) VALUES ('1', 'Cà Phê Muối brewlite', 'Cà Phê', 4.8, 45000, 'https://images.unsplash.com/photo-1541167760496-1628856ab772', 100, 1);


--
-- Data for Name: product_recipes; Type: TABLE DATA; Schema: public; Owner: brewlite
--

INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('37e1fa37-a6fd-4928-a3fd-8684d4e842c0', '1', 'b7aa6041-a9ac-4074-a165-b579e1c0f07a', 'L', 20);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('82b4bde5-1dd7-4044-8ad4-9039a897b87e', '1', 'b7aa6041-a9ac-4074-a165-b579e1c0f07a', 'M', 15);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('b34107c7-4f75-4eab-b98f-d4f312b75d56', '1', 'b7aa6041-a9ac-4074-a165-b579e1c0f07a', 'S', 12);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('1aeaba5c-3579-49cd-8b67-2bd3aa1cf588', '1', '2c522832-cc58-490d-b925-3cd4242c6f7e', 'L', 32);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('b8adee45-4838-4354-bc08-d16bda7013c5', '1', '2c522832-cc58-490d-b925-3cd4242c6f7e', 'M', 25);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a550744d-c361-4f48-8f62-2a45f976078d', '1', '2c522832-cc58-490d-b925-3cd4242c6f7e', 'S', 20);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('da9cc663-05fd-4112-998e-18436443a86b', '1', '3919089c-aeb6-4204-a243-2dc4c8b07ddc', 'L', 50);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('15e65e84-1126-4c68-a522-0f0137a1f9c0', '1', '3919089c-aeb6-4204-a243-2dc4c8b07ddc', 'M', 40);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('db37bc40-0d04-47cd-885a-aadf49f36578', '1', '3919089c-aeb6-4204-a243-2dc4c8b07ddc', 'S', 32);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('85fa1fbb-1355-4a72-bf07-12670fe996ee', '3', '1e3737e3-6315-45b2-bf45-e986a05e1939', 'ONE_SIZE', 10);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('545858c3-9ee9-4952-9ca5-672b7ad2aa39', '1', '1e3737e3-6315-45b2-bf45-e986a05e1939', 'L', 2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('fa5dfc1e-fd65-467e-ac7f-358b1a532720', '1', '1e3737e3-6315-45b2-bf45-e986a05e1939', 'M', 1.5);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('ed6163f3-0484-42a9-a3c5-94fca742ffa7', '1', '1e3737e3-6315-45b2-bf45-e986a05e1939', 'S', 1.2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('f418b340-8a9c-4099-9f2c-9b8aa0391198', '4', 'e04fc0aa-b0af-4d04-b0c2-8f72f9c5fd0f', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('09b47f16-c9bd-49a6-ae0a-6095ed0c1877', '2', 'e04fc0aa-b0af-4d04-b0c2-8f72f9c5fd0f', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('38fd31d3-71f1-475b-be56-63df02cd270a', '1', 'e04fc0aa-b0af-4d04-b0c2-8f72f9c5fd0f', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('d289a841-c470-4657-8284-902ceda1ec87', '4', '03788023-4e3d-4a4e-9240-dae3cc102df5', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('83c3f80c-c768-4ea5-927f-09f7b3c08409', '2', '03788023-4e3d-4a4e-9240-dae3cc102df5', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('05e2030d-6b9d-4c49-891e-8584b53b1da5', '1', '03788023-4e3d-4a4e-9240-dae3cc102df5', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('7ab215d7-3e7f-4ab0-b14a-53a1af04e40d', '4', '2fbe70cf-7e50-4067-a924-b96345f2e23f', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('b889b906-0858-4b6c-bd3f-cba3c5ab5b1d', '2', '2fbe70cf-7e50-4067-a924-b96345f2e23f', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('ac1d85c1-7fcc-48c1-899b-6fe6f984a1a9', '1', '2fbe70cf-7e50-4067-a924-b96345f2e23f', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('3fc5bb7a-3769-4cc7-9379-65a12826c910', '4', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('92496b21-dd94-407d-b6ae-380ce1583308', '4', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('d66680f2-9707-4e7c-a6b7-40a8d1157afc', '4', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('71a3bb28-d530-4a8e-bf53-bd7d97c394a3', '2', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('3acae867-d250-4f1b-872b-c7ed851b0b1b', '2', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('c1fa4a3a-8efd-4591-beb9-5db21b3537c2', '2', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a54f0e27-ecfc-42ab-bec7-63ce39b199ef', '1', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('779a7973-772f-468e-ac2d-b22edda448a5', '1', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'M', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('687cae42-339c-451d-b0cb-db7008ec413c', '1', '9d91d4f1-efce-4be8-8c2a-da4d2d602eda', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('8846cd48-5c73-4a83-bcb7-b2bc45ccf731', '2', 'fabbeaca-3835-4b7c-b23d-28fb81a75d2a', 'L', 2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('4d1ec807-abda-49a7-80b2-5a3a7aa62313', '2', 'fabbeaca-3835-4b7c-b23d-28fb81a75d2a', 'M', 2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a3213f35-8511-46c8-ae26-5ec7c31c44b0', '2', 'fabbeaca-3835-4b7c-b23d-28fb81a75d2a', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('21070f35-d679-43be-8db8-2ecbd7e8e4a3', '2', 'f163abe7-9009-4ad2-802a-8a800db484b4', 'L', 4);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('4add1913-cc73-4033-b0ee-26919bf86e83', '2', 'f163abe7-9009-4ad2-802a-8a800db484b4', 'M', 3);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('c64f5cd9-d019-4557-9375-ad8d622cf987', '2', 'f163abe7-9009-4ad2-802a-8a800db484b4', 'S', 2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('d7a5b3f1-7b65-4c51-a184-b3d21b32b81e', '2', '611b4aa7-4dcc-48fd-8451-cc3d1b92f920', 'L', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('765094a2-3732-4310-a57d-1c0ce1eea302', '2', '611b4aa7-4dcc-48fd-8451-cc3d1b92f920', 'M', 0.5);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('b168e72b-adac-41fb-a77a-dcf474ff8225', '2', '611b4aa7-4dcc-48fd-8451-cc3d1b92f920', 'S', 0.5);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('5e8dfb45-039c-4cde-8807-058adf4ecf63', '2', 'fe9fd880-4496-4b4d-93a8-843e000e4bcd', 'L', 3);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a208c38e-315a-4ac8-bd1b-2d1284d6d3e3', '2', 'fe9fd880-4496-4b4d-93a8-843e000e4bcd', 'M', 2);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('d07afe6e-7e65-4c80-842b-57c69bf0fbe4', '2', 'fe9fd880-4496-4b4d-93a8-843e000e4bcd', 'S', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('78e84c51-b972-43d8-8d95-014e4d42046e', '3', '26146515-b0cc-41be-84a5-b18545ff7dfb', 'ONE_SIZE', 50);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('c19919e7-24a3-4947-8c2f-99ba6e0ae988', '2', '26146515-b0cc-41be-84a5-b18545ff7dfb', 'L', 20);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('323abff9-b873-4f31-ab78-702d3797f806', '2', '26146515-b0cc-41be-84a5-b18545ff7dfb', 'M', 15);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('0fb013a4-7830-4834-8828-825add7a1759', '2', '26146515-b0cc-41be-84a5-b18545ff7dfb', 'S', 12);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('2dfd7471-1a3c-4312-b6ef-45988ec2e901', '3', 'ba09e0c3-78f7-4b4d-ad1a-bc9211698991', 'ONE_SIZE', 680);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('c3afb592-3eba-4cf6-8fe2-7bd23fc99f78', '3', 'c8607e6a-822b-42e6-a5b7-5602f433ed7e', 'ONE_SIZE', 450);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('e4c201c0-ef8f-4226-b90c-b25804fe8075', '4', 'b9d9396d-9c70-4a41-97ed-a1b037b73c1b', 'L', 260);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a374bf65-794d-45fc-8a1b-a5684b83f612', '4', 'b9d9396d-9c70-4a41-97ed-a1b037b73c1b', 'M', 200);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('3bfcfb89-d270-43c3-a3af-2fdbb80297c8', '4', 'b9d9396d-9c70-4a41-97ed-a1b037b73c1b', 'S', 160);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('0e6fd0ec-5222-4412-a3fc-726c45c88d84', '3', 'b9d9396d-9c70-4a41-97ed-a1b037b73c1b', 'ONE_SIZE', 500);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('7b0b73ce-651e-4632-8110-21c01892c7a4', '3', '1c99b280-5901-4cb3-b60a-a5de29138298', 'ONE_SIZE', 10);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a9eeae29-89b8-47a6-948c-30c3b6c9ea4e', '3', '26e4ffd3-432a-401c-a5fc-2dec5f1daf61', 'ONE_SIZE', 20);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('a00d0c02-1354-466f-9468-c1f8b4064556', '3', 'f0aee109-42a8-43ea-9614-478c7ec7a1f6', 'ONE_SIZE', 1);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('5a87bde4-a749-419a-84c3-5f9ee7c54dc1', '4', '8cf213c2-2410-4f06-b91d-c572dbcf1c11', 'L', 6.5);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('18dba80b-5362-4954-aeab-36ab71d1676a', '4', '8cf213c2-2410-4f06-b91d-c572dbcf1c11', 'M', 5);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('73e3860b-edc0-40a0-908c-299e4079fff6', '4', '8cf213c2-2410-4f06-b91d-c572dbcf1c11', 'S', 4);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('374c5891-b72d-4f68-9c5f-fcf7c6cb294d', '4', 'e92f4081-82b5-40e5-9f5f-0592cfda0f6c', 'L', 20);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('7abbe2ea-7091-4fcf-a482-dbc22abc444f', '4', 'e92f4081-82b5-40e5-9f5f-0592cfda0f6c', 'M', 15);
INSERT INTO public.product_recipes (id, "productId", "ingredientId", size, quantity) VALUES ('748e5e0a-f1f8-44fb-8087-01fc64976ad5', '4', 'e92f4081-82b5-40e5-9f5f-0592cfda0f6c', 'S', 12);


--
-- PostgreSQL database dump complete
--

\unrestrict naAKjSO9CKi4FAYgceM8aa9fIJHeZIXNOOrtWXqxk7LqK6L0jyczmd8ugtNa4P4

