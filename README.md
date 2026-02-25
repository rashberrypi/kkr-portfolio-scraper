docker-compose up -d (This runs the containers in the background so they don't lock up your terminal.)
docker logs kkr_mongo (check health)\



docker-compose up --build -d
--build: Forces Docker to re-compile your TypeScript code into JavaScript.

-d: Runs everything in the background ("detached" mode).