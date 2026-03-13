#!/bin/bash
echo "Initializing LocalStack setup..."

# Wait for LocalStack to be ready
until awslocal s3 ls 2>/dev/null; do
  echo "Waiting for LocalStack S3..."
  sleep 2
done

# Create S3 Bucket (delete if exists to ensure clean state)
echo "Creating S3 bucket 'fileflow-uploads-local'..."
awslocal s3 rb s3://fileflow-uploads-local --force 2>/dev/null || true
awslocal s3 mb s3://fileflow-uploads-local

# Configure CORS for Presigned Uploads - More permissive for development
echo "Configuring CORS for S3 bucket..."
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
      "ExposeHeaders": ["ETag", "x-amz-meta-custom-header", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

awslocal s3api put-bucket-cors --bucket fileflow-uploads-local --cors-configuration file:///tmp/cors-config.json

# Verify CORS is set
echo "Verifying CORS configuration..."
awslocal s3api get-bucket-cors --bucket fileflow-uploads-local

# Set bucket policy to allow public read (for development only)
echo "Setting bucket policy..."
cat > /tmp/bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::fileflow-uploads-local/*"
    }
  ]
}
EOF

awslocal s3api put-bucket-policy --bucket fileflow-uploads-local --policy file:///tmp/bucket-policy.json

# Create SQS Queue
echo "Creating SQS Queue 'fileflow-processing-queue'..."
awslocal sqs create-queue --queue-name fileflow-processing-queue 2>/dev/null || echo "Queue already exists"

echo "✅ LocalStack setup complete!"
sqs_url=$(awslocal sqs get-queue-url --queue-name fileflow-processing-queue --query 'QueueUrl' --output text)
echo "📋 SQS URL: $sqs_url"
echo "📦 S3 Bucket: fileflow-uploads-local"
echo "🌐 S3 Endpoint: http://localhost:4566"
