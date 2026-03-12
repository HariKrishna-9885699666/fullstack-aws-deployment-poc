#!/bin/bash
set -e

echo "🚀 Starting FileFlow POC Local Environment..."

# 1. Start Docker Containers
echo "📦 Starting Docker containers..."
docker-compose up -d

# 2. Wait for Postgres
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec fileflow-postgres pg_isready -U fileflow_user -d fileflow; do
  sleep 2
done

# 3. Wait for LocalStack
echo "⏳ Waiting for LocalStack to be ready..."
until curl -s localhost:4566/_localstack/health | grep -q "\"s3\": \"running\""; do
  sleep 2
done
until curl -s localhost:4566/_localstack/health | grep -q "\"sqs\": \"running\""; do
  sleep 2
done

# 4. Setup LocalStack Resources
echo "🛠️ Creating S3 buckets and SQS queues in LocalStack..."
bash ./scripts/localstack-setup.sh

echo "✅ Local Infrastructure is READY!"
echo "Database: postgres://fileflow_user:fileflow_pass@localhost:5432/fileflow"
echo "Redis: redis://localhost:6379"
echo "LocalStack: http://localhost:4566"
echo ""
echo "You can now run:"
echo "  yarn workspace backend dev"
echo "  yarn workspace frontend dev"
