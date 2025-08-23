# Shubh Samadhan Services - Setup Instructions

This document provides instructions on how to set up and run the Shubh Samadhan Services project. This project is a microservices-based platform managed as a monorepo using `npm` workspaces.

## Prerequisites

- Node.js and npm installed
- Docker and Docker Compose installed

## Setup Instructions

1.  **Clone the Repository:**

    ```sh
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install Dependencies:**

    ```sh
    npm install
    ```

    or

    ```sh
    npm run install:all
    ```

3.  **Set up Environment Variables:**
    - Create a `.env` file in the root directory.
    - Define the necessary environment variables (e.g., database credentials, Redis connection details). Refer to the `.Dockerfile` and service-specific documentation for required variables. Example:

      ```
      DATABASE_URL=your_database_url
      REDIS_HOST=your_redis_host
      REDIS_PORT=your_redis_port
      ```

4.  **Run the Application (Development):**

    ```sh
    npm run dev
    ```

    This command uses Docker Compose to start all the services defined in the root `docker-compose.yml` file. It mounts the `src` directories of the services as volumes, so changes to the code will be reflected in the running containers.

5.  **Build the Application:**

    ```sh
    npm run build
    ```

    This command builds all the packages in the monorepo, creating `dist` directories with the compiled JavaScript code.

6.  **Run the Application (Production):**

    To run in production, you'd typically build the Docker images and deploy them to a container orchestration platform like Kubernetes or Docker Swarm. The basic steps are:

    ```sh
    docker-compose build
    docker-compose up -d
    ```

    **Note:** This assumes you have configured your `.env` file with production-appropriate values.

7.  **Run Tests:**

    ```sh
    npm test
    ```

    This command runs the tests for all packages in the monorepo.

8.  **Run Linters:**

    ```sh
    npm run lint
    ```

    This command runs the linters for all packages in the monorepo.

9.  **Clean the Project:**

    ```sh
    npm run clean
    ```

    This command cleans the project by removing the `dist` directories, `node_modules`, and `package-lock.json`.

## Project Structure

The project is structured as a monorepo with the following main directories:

- `libs`: Contains shared libraries used across multiple services.
  - `auth`: Authentication and authorization related code.
  - `database`: Database related utilities and connections.
  - `dto-schemas`: Shared data transfer objects (DTOs) and validation schemas.
  - `event-bus`: Utilities for a Redis-based pub/sub event bus.
  - `logger`: Shared logging utilities.
- `services`: Contains the individual microservices.
  - `api-gateway`: The API gateway service.
  - `auth-service`: The authentication service.
  - `automation-service`: A service for automation tasks.
  - `engagement-service`: A service for managing user engagement.
  - `notification-service`: A service for sending notifications.
  - `ticketing-service`: A service for managing tickets or issues.

## Key Files

- `package.json` (root): Defines the project's metadata, dependencies, and scripts.
- `tsconfig.base.json`: Base TypeScript configuration shared by all packages.
- `docker-compose.yml`: Defines the services, networks, and volumes for the entire application.
- `.env`: Stores environment variables.

## Important Considerations

- **Docker Compose:** This project relies heavily on Docker Compose for local development.
- **Environment Variables:** Pay close attention to the environment variables required by each service.
- **Shared Libraries:** The shared libraries in the `libs` directory are designed to be reusable across multiple services. Use the path aliases defined in `tsconfig.base.json` to import these libraries.
- **CI/CD:** The `.github/workflows/ci.yml` file defines a CI/CD pipeline that automatically builds, tests, and deploys the
