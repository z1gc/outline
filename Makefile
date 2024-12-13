up:
	podman-compose up -d redis postgres
	yarn install-local-ssl
	yarn install --pure-lockfile
	yarn dev:watch

down:
	podman-compose down -v

build:
	podman build --pull .

test:
	podman-compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test

watch:
	podman-compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test:watch

.PHONY: up down build destroy test watch # let's go to reserve rules names
