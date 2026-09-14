dev:
	docker compose --profile dev up -d

# Develop stage only
start:
	docker compose --profile dev start
	
stop:
	docker compose --profile dev stop
	
down:
	docker compose --profile "*" down --volumes --remove-orphans --rmi all && rm -rf app/node_modules app/.quasar

restart:
	docker compose --profile dev restart

logs:
	docker compose --profile dev logs
