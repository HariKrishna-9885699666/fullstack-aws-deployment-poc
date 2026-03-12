#!/bin/bash
echo "Initializing LocalStack setup..."

# Wait for LocalStack to be ready
until awslocal s3 ls; do
  echo "Waiting for LocalStack S3..."
  sleep 2
done

# Create S3 Bucket
echo "Creating S3 bucket 'fileflow-uploads-local'..."
awslocal s3 mb s3://fileflow-uploads-local

# Configure CORS for Presigned Uploads
echo "Configuring CORS for S3 bucket..."
awslocal s3api put-bucket-cors --bucket fileflow-uploads-local --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'

# Create SQS Queue
echo "Creating SQS Queue 'fileflow-processing-queue'..."
awslocal sqs create-queue --queue-name fileflow-processing-queue

echo "LocalStack setup complete!"
sqs_url=$(awslocal sqs get-queue-url --queue-name fileflow-processing-queue --query 'QueueUrl' --output text)
echo "SQS URL: $sqs_url"
