.PHONY: up down

up:
	brew services start postgresql@14
	cd backend && php artisan serve --host=0.0.0.0 --port=8000 &
	cd frontend && npx expo start --ios

down:
	brew services stop postgresql@14
	pkill -f "artisan serve"
