version: '3.8'

services:
# API Gateway Service
api-gateway:
build:
context: ./services/api-gateway
target: base
volumes:
- ./services/api-gateway/src:/usr/src/app/src
ports:
- "4000:3000"
env_file: .env
networks:
- shubh_samadhan_net
depends_on:
- redis

# Authentication Service
auth-service:
build:
context: ./services/auth-service
target: base
volumes:
- ./services/auth-service/src:/usr/src/app/src
env_file: .env
depends_on:
- db
- redis
networks:
- shubh_samadhan_net

# Ticketing Service
ticketing-service:
build:
context: ./services/ticketing-service
target: base
volumes:
- ./services/ticketing-service/src:/usr/src/app/src
env_file: .env
depends_on:
- db
- redis
networks:
- shubh_samadhan_net

# Engagement Service
engagement-service:
build:
context: ./services/engagement-service
target: base
volumes:
- ./services/engagement-service/src:/usr/src/app/src
env_file: .env
depends_on:
- db
- redis
networks:
- shubh_samadhan_net

# Notification Service
notification-service:
build:
context: ./services/notification-service
target: base
volumes:
- ./services/notification-service/src:/usr/src/app/src
env_file: .env
depends_on:
- redis
- mongo
networks:
- shubh_samadhan_net

# Automation Service
automation-service:
build:
context: ./services/automation-service
target: base
volumes:
- ./services/automation-service/src:/usr/src/app/src
env_file: .env
depends_on:
- redis
- mongo
networks:
- shubh_samadhan_net

# Backing Services
db:
image: postgres:14-alpine
restart: always
volumes:
- postgres_data:/var/lib/postgresql/data
environment:
- POSTGRES_USER=${POSTGRES_USER}
- POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
- POSTGRES_DB=${POSTGRES_DB}
ports:
- "5432:5432"
networks:
- shubh_samadhan_net

redis:
image: redis:7-alpine
restart: always
networks:
- shubh_samadhan_net

mongo:
image: mongo:6.0
restart: always
volumes:
- mongo_data:/data/db
networks:
- shubh_samadhan_net

volumes:
postgres_data:
mongo_data:

networks:
shubh_samadhan_net:
driver: bridge