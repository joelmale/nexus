FROM postgres:16-alpine

# Copy the schema file to the entrypoint directory
COPY ../server/schema.sql /docker-entrypoint-initdb.d/
