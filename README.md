# Art For You — React + Java Spring Boot migration (Phase 1)

Based on the uploaded Art For You ZIP. The original app uses Express + SQLite. This starter introduces React/Vite and Java 17 + Spring Boot + Spring Data JPA + MySQL. Original image assets and `seed-data.json` are retained.

## Run frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Run backend
Install Java 17+, Maven and MySQL. Create database `artforyou`, then configure `DB_USERNAME` and `DB_PASSWORD` if needed.
```bash
cd backend
mvn spring-boot:run
```
API: `http://localhost:8080/api/products` and `http://localhost:8080/api/collections`

## Migration status
- [x] React/Vite frontend scaffold and first storefront screen
- [x] Spring Boot application, MySQL/JPA configuration, collection/product entities and repositories
- [x] Catalogue read APIs (`GET /api/collections`, `GET /api/products`)
- [ ] Import original `seed-data.json` into MySQL
- [ ] Migrate order creation, order tracking and contact APIs
- [ ] Migrate admin authentication, product CRUD, image uploads and order management
- [ ] Port remaining original pages and preserve exact UI/behaviour

This is a Phase 1 foundation, not yet a complete replacement for the original website. Admin/login and order APIs are not migrated yet.
