# FileFlow POC - Complete AWS Infrastructure & CI/CD Deployment Guide

**Version:** 1.0  
**Last Updated:** March 2026  
**Purpose:** Step-by-step guide to deploy FileFlow application on AWS with production-grade infrastructure and CI/CD pipeline

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [AWS Account Setup](#3-aws-account-setup)
4. [Network Infrastructure Setup](#4-network-infrastructure-setup)
5. [Database & Cache Setup](#5-database--cache-setup)
6. [Storage & Queue Setup](#6-storage--queue-setup)
7. [Container Registry Setup](#7-container-registry-setup)
8. [Load Balancer Setup](#8-load-balancer-setup)
9. [ECS Cluster & Services Setup](#9-ecs-cluster--services-setup)
10. [Frontend Hosting Setup](#10-frontend-hosting-setup)
11. [CI/CD Pipeline Setup](#11-cicd-pipeline-setup)
12. [Monitoring & Logging Setup](#12-monitoring--logging-setup)
13. [Blue/Green Deployment Setup](#13-bluegreen-deployment-setup)
14. [Security Best Practices](#14-security-best-practices)
15. [Testing the Deployment](#15-testing-the-deployment)
16. [Rollback Procedures](#16-rollback-procedures)
17. [Cost Optimization](#17-cost-optimization)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Overview

### 1.1 Architecture Summary

This guide will help you deploy a full-stack application with:

**Frontend:**
- React SPA hosted on S3
- Distributed globally via CloudFront CDN
- HTTPS enabled with ACM certificates

**Backend:**
- NestJS API running on ECS Fargate
- Application Load Balancer for traffic distribution
- Auto-scaling based on CPU/memory metrics
- Blue/Green deployments via CodeDeploy

**Worker:**
- Asynchronous processing service on ECS Fargate
- Consumes messages from SQS queue
- Updates processing status in RDS

**Data Layer:**
- RDS PostgreSQL for relational data
- ElastiCache Redis for caching
- S3 for file uploads
- SQS for async job queue

**CI/CD:**
- GitHub Actions for automation
- ECR for Docker image storage
- CodeDeploy for zero-downtime deployments
- CloudWatch for monitoring and logging

### 1.2 Architecture Diagram

```
                         ┌──────────────┐
                         │   Route 53   │
                         │     (DNS)    │
                         └──────┬───────┘
                                │
                  ┌─────────────┴────────────┐
                  │                          │
         ┌────────▼────────┐        ┌───────▼────────┐
         │  CloudFront CDN │        │   Application  │
         │  (Frontend)     │        │ Load Balancer  │
         └────────┬────────┘        └───────┬────────┘
                  │                          │
         ┌────────▼────────┐        ┌───────▼────────┐
         │   S3 Bucket     │        │   ECS Fargate  │
         │ (Static Assets) │        │  (API Service) │
         └─────────────────┘        └───────┬────────┘
                                             │
                  ┌──────────────────────────┼────────────────┐
                  │                          │                │
         ┌────────▼────────┐        ┌───────▼────────┐  ┌───▼────┐
         │   ECS Fargate   │        │   RDS Postgres │  │  Redis │
         │ (Worker Service)│        │   (Database)   │  │ (Cache)│
         └────────┬────────┘        └────────────────┘  └────────┘
                  │
         ┌────────▼────────┐
         │   SQS Queue     │
         │ (Async Jobs)    │
         └─────────────────┘
                  │
         ┌────────▼────────┐
         │   S3 Bucket     │
         │ (File Uploads)  │
         └─────────────────┘
```

### 1.3 Why This Architecture?

| Before (Single Server) | After (AWS Scaled) | Benefit |
|------------------------|-------------------|---------|
| Single EC2 instance | ECS Fargate cluster | Horizontal scaling |
| Deployment downtime | Blue/Green deployment | Zero-downtime releases |
| Files on server disk | S3 storage | Stateless, scalable |
| Blocking operations | SQS + Worker | Async processing |
| No caching | Redis cache | Faster response times |
| Manual deployment | CI/CD automation | Faster, safer releases |
| Limited monitoring | CloudWatch metrics | Full observability |

---

## 2. Prerequisites

### 2.1 Required Tools

Install the following tools on your local machine:

```bash
# AWS CLI (v2 recommended)
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify installation
aws --version  # Should show aws-cli/2.x.x

# Docker (for building images)
# Download from: https://www.docker.com/products/docker-desktop

# Verify Docker
docker --version  # Should show Docker version 20.x or higher

# Node.js and Yarn (for local development)
node --version  # Should be v18.x or v20.x
yarn --version  # Should be 4.x

# Git (for version control)
git --version

# jq (JSON processor for AWS CLI outputs)
brew install jq  # macOS
# or
sudo apt-get install jq  # Ubuntu/Debian
```

### 2.2 AWS Account Requirements

- Active AWS account with billing enabled
- IAM user with administrative access (for setup)
- Access keys configured locally
- Credit card on file (some services may incur charges)

### 2.3 GitHub Account

- GitHub repository for your code
- Personal Access Token with repo and workflow permissions

### 2.4 Domain Name (Optional)

- Registered domain (via Route 53 or external registrar)
- DNS management access

### 2.5 Estimated Costs

**Monthly AWS costs for this architecture (approximate):**

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 2 API tasks (0.25 vCPU, 0.5GB) | ~$15 |
| ECS Fargate | 1 Worker task (0.25 vCPU, 0.5GB) | ~$7 |
| RDS PostgreSQL | db.t3.micro | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| Application Load Balancer | 1 ALB | ~$20 |
| S3 | < 100GB storage + requests | ~$5 |
| CloudFront | < 1TB transfer | ~$10 |
| NAT Gateway | 1 NAT Gateway | ~$35 |
| SQS | < 1M requests | Free tier |
| CloudWatch | Basic monitoring | ~$5 |
| **TOTAL** | | **~$124/month** |

**Cost optimization tips:**
- Use t3/t4g instances where possible
- Delete NAT Gateway in dev (use VPC endpoints instead)
- Enable S3 lifecycle policies
- Use CloudWatch log retention policies
- Shut down dev environments when not in use

---

## 3. AWS Account Setup

### 3.1 Create IAM User for Deployment

Instead of using root account, create a dedicated IAM user:

**Step 1: Access IAM Console**
```bash
# Open AWS Console
# Navigate to: IAM → Users → Add users
```

**Step 2: Create User**
```
User name: fileflow-deployer
Access type: ☑ Programmatic access
             ☐ AWS Management Console access (optional)
```

**Step 3: Attach Policies**

Attach these managed policies (for initial setup):
- `AdministratorAccess` (for setup phase)

For production, use least-privilege policies:
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonS3FullAccess`
- `AmazonRDSFullAccess`
- `ElastiCacheFullAccess`
- `AmazonSQSFullAccess`
- `CloudFrontFullAccess`
- `IAMFullAccess` (for role creation)

**Step 4: Save Credentials**
```bash
# Download credentials CSV
# IMPORTANT: Save these securely - they're shown only once!

# Configure AWS CLI
aws configure

# Enter when prompted:
AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name: us-east-1
Default output format: json
```

**Step 5: Verify Configuration**
```bash
# Test AWS CLI access
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/fileflow-deployer"
}
```

### 3.2 Set Environment Variables

Create a file `~/.aws-fileflow-env` with your configuration:

```bash
# AWS Configuration
export AWS_ACCOUNT_ID="123456789012"
export AWS_REGION="us-east-1"
export PROJECT_NAME="fileflow"
export ENVIRONMENT="production"  # or "staging", "dev"

# GitHub Configuration (for CI/CD later)
export GITHUB_REPO="yourusername/fileflow-poc"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"

# Application Configuration
export DOMAIN_NAME="fileflow.example.com"  # Optional

# Load these variables:
source ~/.aws-fileflow-env
```

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
echo "source ~/.aws-fileflow-env" >> ~/.zshrc
```

### 3.3 Enable Required AWS Services

Some services need to be explicitly enabled:

```bash
# Enable ECS
aws ecs list-clusters --region $AWS_REGION

# Enable ECR
aws ecr describe-repositories --region $AWS_REGION

# If any service returns an error about not being enabled,
# enable it through the AWS Console
```

---

## 4. Network Infrastructure Setup

### 4.1 Create VPC

**Why:** Isolate your resources in a private network with public and private subnets.

**Step 1: Create VPC**
```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --region $AWS_REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames \
  --region $AWS_REGION

# Enable DNS support
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-support \
  --region $AWS_REGION
```

**Step 2: Create Internet Gateway**
```bash
# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw}]" \
  --region $AWS_REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "Internet Gateway ID: $IGW_ID"

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $AWS_REGION
```

**Step 3: Create Subnets**

We'll create 2 public and 2 private subnets across 2 availability zones:

```bash
# Get availability zones
AZ1=$(aws ec2 describe-availability-zones \
  --region $AWS_REGION \
  --query 'AvailabilityZones[0].ZoneName' \
  --output text)

AZ2=$(aws ec2 describe-availability-zones \
  --region $AWS_REGION \
  --query 'AvailabilityZones[1].ZoneName' \
  --output text)

echo "Using AZs: $AZ1, $AZ2"

# Create Public Subnet 1
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone $AZ1 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1},{Key=Type,Value=public}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

# Create Public Subnet 2
PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone $AZ2 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-2},{Key=Type,Value=public}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

# Create Private Subnet 1
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone $AZ1 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1},{Key=Type,Value=private}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

# Create Private Subnet 2
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone $AZ2 \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-2},{Key=Type,Value=private}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_1 \
  --map-public-ip-on-launch \
  --region $AWS_REGION

aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_2 \
  --map-public-ip-on-launch \
  --region $AWS_REGION

echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
```

**Step 4: Create NAT Gateways** (for private subnets to access internet)

```bash
# Allocate Elastic IP for NAT Gateway
EIP_ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat-eip}]" \
  --region $AWS_REGION \
  --query 'AllocationId' \
  --output text)

echo "Elastic IP Allocation ID: $EIP_ALLOC_ID"

# Create NAT Gateway in Public Subnet 1
NAT_GW_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1 \
  --allocation-id $EIP_ALLOC_ID \
  --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat-gw}]" \
  --region $AWS_REGION \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "NAT Gateway ID: $NAT_GW_ID"

# Wait for NAT Gateway to be available (takes ~3-5 minutes)
echo "Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available \
  --nat-gateway-ids $NAT_GW_ID \
  --region $AWS_REGION

echo "NAT Gateway is ready!"
```

**Step 5: Create Route Tables**

```bash
# Create Public Route Table
PUBLIC_RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Create route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

# Associate public subnets with public route table
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1 \
  --route-table-id $PUBLIC_RT_ID \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2 \
  --route-table-id $PUBLIC_RT_ID \
  --region $AWS_REGION

# Create Private Route Table
PRIVATE_RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Create route to NAT Gateway
aws ec2 create-route \
  --route-table-id $PRIVATE_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID \
  --region $AWS_REGION

# Associate private subnets with private route table
aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_1 \
  --route-table-id $PRIVATE_RT_ID \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_2 \
  --route-table-id $PRIVATE_RT_ID \
  --region $AWS_REGION

echo "Route tables configured!"
```

**Step 6: Save Network Configuration**

```bash
# Save IDs to file for later use
cat > ~/fileflow-network-config.sh << EOF
export VPC_ID="$VPC_ID"
export IGW_ID="$IGW_ID"
export PUBLIC_SUBNET_1="$PUBLIC_SUBNET_1"
export PUBLIC_SUBNET_2="$PUBLIC_SUBNET_2"
export PRIVATE_SUBNET_1="$PRIVATE_SUBNET_1"
export PRIVATE_SUBNET_2="$PRIVATE_SUBNET_2"
export NAT_GW_ID="$NAT_GW_ID"
export PUBLIC_RT_ID="$PUBLIC_RT_ID"
export PRIVATE_RT_ID="$PRIVATE_RT_ID"
EOF

# Load network config
source ~/fileflow-network-config.sh
```

### 4.2 Create Security Groups

**Step 1: ALB Security Group**
```bash
# Create ALB Security Group (allows HTTP/HTTPS from internet)
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name "${PROJECT_NAME}-alb-sg" \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-alb-sg}]" \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

echo "ALB Security Group: $ALB_SG_ID"

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION
```

**Step 2: ECS Tasks Security Group**
```bash
# Create ECS Security Group (allows traffic from ALB)
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name "${PROJECT_NAME}-ecs-sg" \
  --description "Security group for ECS tasks" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-ecs-sg}]" \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

echo "ECS Security Group: $ECS_SG_ID"

# Allow traffic from ALB on port 3000 (NestJS default)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION

# Allow traffic from within ECS security group (for service discovery)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol -1 \
  --source-group $ECS_SG_ID \
  --region $AWS_REGION
```

**Step 3: RDS Security Group**
```bash
# Create RDS Security Group (allows traffic from ECS)
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "${PROJECT_NAME}-rds-sg" \
  --description "Security group for RDS database" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-rds-sg}]" \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

echo "RDS Security Group: $RDS_SG_ID"

# Allow PostgreSQL from ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID \
  --region $AWS_REGION
```

**Step 4: Redis Security Group**
```bash
# Create Redis Security Group (allows traffic from ECS)
REDIS_SG_ID=$(aws ec2 create-security-group \
  --group-name "${PROJECT_NAME}-redis-sg" \
  --description "Security group for Redis cache" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-redis-sg}]" \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

echo "Redis Security Group: $REDIS_SG_ID"

# Allow Redis from ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $ECS_SG_ID \
  --region $AWS_REGION
```

**Step 5: Save Security Group IDs**
```bash
cat >> ~/fileflow-network-config.sh << EOF
export ALB_SG_ID="$ALB_SG_ID"
export ECS_SG_ID="$ECS_SG_ID"
export RDS_SG_ID="$RDS_SG_ID"
export REDIS_SG_ID="$REDIS_SG_ID"
EOF
```

---

## 5. Database & Cache Setup

### 5.1 Create RDS PostgreSQL Instance

**Step 1: Create DB Subnet Group**
```bash
# Create DB subnet group (required for Multi-AZ)
aws rds create-db-subnet-group \
  --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
  --db-subnet-group-description "Subnet group for FileFlow database" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Name,Value=${PROJECT_NAME}-db-subnet-group" \
  --region $AWS_REGION

echo "DB Subnet Group created"
```

**Step 2: Generate Database Password**
```bash
# Generate secure random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated DB Password (SAVE THIS SECURELY): $DB_PASSWORD"

# Save to AWS Secrets Manager (recommended)
aws secretsmanager create-secret \
  --name "${PROJECT_NAME}/${ENVIRONMENT}/db-password" \
  --description "PostgreSQL database password" \
  --secret-string "{\"password\":\"$DB_PASSWORD\"}" \
  --region $AWS_REGION

echo "Password saved to AWS Secrets Manager"
```

**Step 3: Create RDS Instance**
```bash
# Create PostgreSQL database
DB_INSTANCE_IDENTIFIER="${PROJECT_NAME}-postgres"

aws rds create-db-instance \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "15.4" \
  --master-username fileflowadmin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
  --vpc-security-group-ids $RDS_SG_ID \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --auto-minor-version-upgrade \
  --publicly-accessible false \
  --storage-encrypted \
  --copy-tags-to-snapshot \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]' \
  --tags "Key=Name,Value=${PROJECT_NAME}-postgres" "Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

echo "Creating RDS instance (this takes 10-15 minutes)..."

# Wait for database to be available
aws rds wait db-instance-available \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION

echo "RDS instance is ready!"
```

**Step 4: Get Database Endpoint**
```bash
# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"

# Construct connection string
DB_URL="postgresql://fileflowadmin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/postgres"
echo "Database URL: $DB_URL"

# Save to Secrets Manager
aws secretsmanager create-secret \
  --name "${PROJECT_NAME}/${ENVIRONMENT}/database-url" \
  --description "PostgreSQL connection string" \
  --secret-string "{\"url\":\"$DB_URL\"}" \
  --region $AWS_REGION
```

### 5.2 Create ElastiCache Redis Cluster

**Step 1: Create Redis Subnet Group**
```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name "${PROJECT_NAME}-redis-subnet-group" \
  --cache-subnet-group-description "Subnet group for FileFlow Redis cache" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Name,Value=${PROJECT_NAME}-redis-subnet-group" \
  --region $AWS_REGION

echo "Redis Subnet Group created"
```

**Step 2: Create Redis Cluster**
```bash
# Create Redis cluster
REDIS_CLUSTER_ID="${PROJECT_NAME}-redis"

aws elasticache create-cache-cluster \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version "7.0" \
  --num-cache-nodes 1 \
  --cache-subnet-group-name "${PROJECT_NAME}-redis-subnet-group" \
  --security-group-ids $REDIS_SG_ID \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --snapshot-retention-limit 5 \
  --snapshot-window "03:00-04:00" \
  --auto-minor-version-upgrade \
  --tags "Key=Name,Value=${PROJECT_NAME}-redis" "Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

echo "Creating Redis cluster (this takes 5-10 minutes)..."

# Wait for cache cluster to be available
aws elasticache wait cache-cluster-available \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --region $AWS_REGION

echo "Redis cluster is ready!"
```

**Step 3: Get Redis Endpoint**
```bash
# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

REDIS_PORT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' \
  --output text)

echo "Redis Endpoint: $REDIS_ENDPOINT:$REDIS_PORT"

# Save Redis configuration
REDIS_URL="redis://${REDIS_ENDPOINT}:${REDIS_PORT}"

aws secretsmanager create-secret \
  --name "${PROJECT_NAME}/${ENVIRONMENT}/redis-url" \
  --description "Redis connection string" \
  --secret-string "{\"url\":\"$REDIS_URL\"}" \
  --region $AWS_REGION
```

**Step 4: Save Database & Cache Configuration**
```bash
cat > ~/fileflow-data-config.sh << EOF
export DB_INSTANCE_IDENTIFIER="$DB_INSTANCE_IDENTIFIER"
export DB_ENDPOINT="$DB_ENDPOINT"
export DB_PASSWORD="$DB_PASSWORD"
export DB_URL="$DB_URL"
export REDIS_CLUSTER_ID="$REDIS_CLUSTER_ID"
export REDIS_ENDPOINT="$REDIS_ENDPOINT"
export REDIS_PORT="$REDIS_PORT"
export REDIS_URL="$REDIS_URL"
EOF
```

---

## 6. Storage & Queue Setup

### 6.1 Create S3 Buckets

**Step 1: Create Frontend Hosting Bucket**
```bash
# Generate unique bucket name (S3 bucket names must be globally unique)
FRONTEND_BUCKET="${PROJECT_NAME}-frontend-${AWS_ACCOUNT_ID}"

# Create S3 bucket for frontend
aws s3 mb s3://$FRONTEND_BUCKET \
  --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $FRONTEND_BUCKET \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Block public access initially (CloudFront will access it)
aws s3api put-public-access-block \
  --bucket $FRONTEND_BUCKET \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region $AWS_REGION

echo "Frontend bucket created: $FRONTEND_BUCKET"
```

**Step 2: Create Uploads Bucket**
```bash
# Create S3 bucket for user uploads
UPLOADS_BUCKET="${PROJECT_NAME}-uploads-${AWS_ACCOUNT_ID}"

aws s3 mb s3://$UPLOADS_BUCKET \
  --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $UPLOADS_BUCKET \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Block all public access (uploads are private)
aws s3api put-public-access-block \
  --bucket $UPLOADS_BUCKET \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $AWS_REGION

# Enable encryption at rest
aws s3api put-bucket-encryption \
  --bucket $UPLOADS_BUCKET \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --region $AWS_REGION

# Configure CORS for uploads (allows browser direct upload)
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-version-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket $UPLOADS_BUCKET \
  --cors-configuration file:///tmp/cors-config.json \
  --region $AWS_REGION

echo "Uploads bucket created: $UPLOADS_BUCKET"
```

**Step 3: Configure Lifecycle Policies**
```bash
# Add lifecycle policy to delete old upload versions after 30 days
cat > /tmp/lifecycle-policy.json << EOF
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "Id": "DeleteIncompleteUploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $UPLOADS_BUCKET \
  --lifecycle-configuration file:///tmp/lifecycle-policy.json \
  --region $AWS_REGION

echo "Lifecycle policies configured"
```

### 6.2 Create SQS Queue

**Step 1: Create Main Processing Queue**
```bash
# Create SQS queue for async processing
QUEUE_NAME="${PROJECT_NAME}-processing-queue"

QUEUE_URL=$(aws sqs create-queue \
  --queue-name $QUEUE_NAME \
  --attributes '{
    "DelaySeconds": "0",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "VisibilityTimeout": "300"
  }' \
  --tags "Name=${QUEUE_NAME},Environment=${ENVIRONMENT}" \
  --region $AWS_REGION \
  --query 'QueueUrl' \
  --output text)

echo "Queue created: $QUEUE_URL"

# Get Queue ARN
QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names QueueArn \
  --region $AWS_REGION \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Queue ARN: $QUEUE_ARN"
```

**Step 2: Create Dead Letter Queue** (for failed messages)
```bash
# Create DLQ
DLQ_NAME="${PROJECT_NAME}-processing-dlq"

DLQ_URL=$(aws sqs create-queue \
  --queue-name $DLQ_NAME \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }' \
  --tags "Name=${DLQ_NAME},Environment=${ENVIRONMENT}" \
  --region $AWS_REGION \
  --query 'QueueUrl' \
  --output text)

echo "DLQ created: $DLQ_URL"

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --region $AWS_REGION \
  --query 'Attributes.QueueArn' \
  --output text)

# Configure main queue to use DLQ
aws sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --region $AWS_REGION

echo "DLQ configured with 3 retry attempts"
```

**Step 3: Create CloudWatch Alarms for Queue**
```bash
# Alarm for high queue depth
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-high-queue-depth" \
  --alarm-description "Alert when queue depth exceeds 100 messages" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=$QUEUE_NAME \
  --region $AWS_REGION

# Alarm for DLQ messages
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-dlq-messages" \
  --alarm-description "Alert when messages appear in DLQ" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=QueueName,Value=$DLQ_NAME \
  --region $AWS_REGION

echo "CloudWatch alarms configured"
```

**Step 4: Save Storage & Queue Configuration**
```bash
cat > ~/fileflow-storage-config.sh << EOF
export FRONTEND_BUCKET="$FRONTEND_BUCKET"
export UPLOADS_BUCKET="$UPLOADS_BUCKET"
export QUEUE_NAME="$QUEUE_NAME"
export QUEUE_URL="$QUEUE_URL"
export QUEUE_ARN="$QUEUE_ARN"
export DLQ_NAME="$DLQ_NAME"
export DLQ_URL="$DLQ_URL"
export DLQ_ARN="$DLQ_ARN"
EOF
```

---

## 7. Container Registry Setup

### 7.1 Create ECR Repositories

**Step 1: Create Backend API Repository**
```bash
# Create ECR repository for backend
BACKEND_REPO_NAME="${PROJECT_NAME}-backend"

aws ecr create-repository \
  --repository-name $BACKEND_REPO_NAME \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --tags "Key=Name,Value=${BACKEND_REPO_NAME},Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

# Get repository URI
BACKEND_REPO_URI=$(aws ecr describe-repositories \
  --repository-names $BACKEND_REPO_NAME \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "Backend ECR Repository: $BACKEND_REPO_URI"
```

**Step 2: Create Worker Repository**
```bash
# Create ECR repository for worker
WORKER_REPO_NAME="${PROJECT_NAME}-worker"

aws ecr create-repository \
  --repository-name $WORKER_REPO_NAME \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --tags "Key=Name,Value=${WORKER_REPO_NAME},Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

# Get repository URI
WORKER_REPO_URI=$(aws ecr describe-repositories \
  --repository-names $WORKER_REPO_NAME \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "Worker ECR Repository: $WORKER_REPO_URI"
```

**Step 3: Configure Lifecycle Policies** (keep only recent images)
```bash
# Create lifecycle policy to retain only last 10 images
cat > /tmp/ecr-lifecycle-policy.json << 'EOF'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF

# Apply to backend repository
aws ecr put-lifecycle-policy \
  --repository-name $BACKEND_REPO_NAME \
  --lifecycle-policy-text file:///tmp/ecr-lifecycle-policy.json \
  --region $AWS_REGION

# Apply to worker repository
aws ecr put-lifecycle-policy \
  --repository-name $WORKER_REPO_NAME \
  --lifecycle-policy-text file:///tmp/ecr-lifecycle-policy.json \
  --region $AWS_REGION

echo "Lifecycle policies applied to both repositories"
```

### 7.2 Build and Push Initial Images

**Step 1: Authenticate Docker with ECR**
```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "Docker authenticated with ECR"
```

**Step 2: Build and Push Backend Image**
```bash
# Navigate to your project directory
cd /Users/hari/Documents/E/fullstack-aws-deployment-poc

# Build backend Docker image
docker build -t $BACKEND_REPO_NAME:latest ./backend

# Tag image for ECR
docker tag $BACKEND_REPO_NAME:latest $BACKEND_REPO_URI:latest
docker tag $BACKEND_REPO_NAME:latest $BACKEND_REPO_URI:v1.0.0

# Push to ECR
docker push $BACKEND_REPO_URI:latest
docker push $BACKEND_REPO_URI:v1.0.0

echo "Backend image pushed to ECR"
```

**Step 3: Build and Push Worker Image**
```bash
# Build worker Docker image
docker build -t $WORKER_REPO_NAME:latest ./worker

# Tag image for ECR
docker tag $WORKER_REPO_NAME:latest $WORKER_REPO_URI:latest
docker tag $WORKER_REPO_NAME:latest $WORKER_REPO_URI:v1.0.0

# Push to ECR
docker push $WORKER_REPO_URI:latest
docker push $WORKER_REPO_URI:v1.0.0

echo "Worker image pushed to ECR"
```

**Step 4: Verify Images**
```bash
# List backend images
aws ecr list-images \
  --repository-name $BACKEND_REPO_NAME \
  --region $AWS_REGION

# List worker images
aws ecr list-images \
  --repository-name $WORKER_REPO_NAME \
  --region $AWS_REGION
```

**Step 5: Save ECR Configuration**
```bash
cat > ~/fileflow-ecr-config.sh << EOF
export BACKEND_REPO_NAME="$BACKEND_REPO_NAME"
export BACKEND_REPO_URI="$BACKEND_REPO_URI"
export WORKER_REPO_NAME="$WORKER_REPO_NAME"
export WORKER_REPO_URI="$WORKER_REPO_URI"
EOF
```

---

## 8. Load Balancer Setup

### 8.1 Create Application Load Balancer

**Why:** ALB distributes traffic across multiple ECS tasks and provides health checks for zero-downtime deployments.

**Step 1: Create Target Group**
```bash
# Create target group for backend API
TG_NAME="${PROJECT_NAME}-backend-tg"

TG_ARN=$(aws elbv2 create-target-group \
  --name $TG_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --deregistration-delay-connection-termination-seconds 30 \
  --tags "Key=Name,Value=${TG_NAME}" \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group ARN: $TG_ARN"
```

**Step 2: Create Application Load Balancer**
```bash
# Create ALB
ALB_NAME="${PROJECT_NAME}-alb"

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --tags "Key=Name,Value=${ALB_NAME}" \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"
echo "Your API will be accessible at: http://$ALB_DNS"
```

**Step 3: Create Listener**
```bash
# Create HTTP listener (for now, will add HTTPS later if you have SSL cert)
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "Listener ARN: $LISTENER_ARN"
```

**Step 4: (Optional) Add HTTPS Listener with ACM Certificate**

If you have a domain and want HTTPS:

```bash
# First, request a certificate in ACM
CERT_ARN=$(aws acm request-certificate \
  --domain-name "api.${DOMAIN_NAME}" \
  --subject-alternative-names "*.${DOMAIN_NAME}" \
  --validation-method DNS \
  --region $AWS_REGION \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
echo "Go to ACM console and complete DNS validation"
echo "After validation is complete, run the following:"

# Create HTTPS listener (run after cert is validated)
cat << 'HEREDOC'
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION
HEREDOC
```

**Step 5: Enable Access Logs** (optional but recommended)
```bash
# Create S3 bucket for ALB logs
ALB_LOGS_BUCKET="${PROJECT_NAME}-alb-logs-${AWS_ACCOUNT_ID}"

aws s3 mb s3://$ALB_LOGS_BUCKET --region $AWS_REGION

# Get ELB service account ID for your region
# For us-east-1, it's 127311923021
# Full list: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html

ELB_ACCOUNT_ID="127311923021"  # us-east-1

# Create bucket policy to allow ALB to write logs
cat > /tmp/alb-logs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${ELB_ACCOUNT_ID}:root"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${ALB_LOGS_BUCKET}/AWSLogs/${AWS_ACCOUNT_ID}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket $ALB_LOGS_BUCKET \
  --policy file:///tmp/alb-logs-policy.json

# Enable access logs on ALB
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes \
    Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=$ALB_LOGS_BUCKET \
    Key=access_logs.s3.prefix,Value=${PROJECT_NAME}-alb \
  --region $AWS_REGION

echo "ALB access logs enabled"
```

**Step 6: Save ALB Configuration**
```bash
cat > ~/fileflow-alb-config.sh << EOF
export ALB_NAME="$ALB_NAME"
export ALB_ARN="$ALB_ARN"
export ALB_DNS="$ALB_DNS"
export TG_NAME="$TG_NAME"
export TG_ARN="$TG_ARN"
export LISTENER_ARN="$LISTENER_ARN"
EOF
```

---

## 9. ECS Cluster & Services Setup

### 9.1 Create IAM Roles for ECS

**Step 1: Create ECS Task Execution Role**

This role allows ECS to pull images from ECR and write logs to CloudWatch.

```bash
# Create trust policy
cat > /tmp/ecs-task-execution-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
TASK_EXECUTION_ROLE_NAME="${PROJECT_NAME}-ecs-task-execution-role"

aws iam create-role \
  --role-name $TASK_EXECUTION_ROLE_NAME \
  --assume-role-policy-document file:///tmp/ecs-task-execution-trust-policy.json \
  --tags "Key=Name,Value=${TASK_EXECUTION_ROLE_NAME}" \
  --region $AWS_REGION

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name $TASK_EXECUTION_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region $AWS_REGION

# Add policy for Secrets Manager access (to retrieve DB password, etc.)
cat > /tmp/secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $TASK_EXECUTION_ROLE_NAME \
  --policy-name SecretsManagerAccess \
  --policy-document file:///tmp/secrets-policy.json

# Get role ARN
TASK_EXECUTION_ROLE_ARN=$(aws iam get-role \
  --role-name $TASK_EXECUTION_ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo "Task Execution Role ARN: $TASK_EXECUTION_ROLE_ARN"
```

**Step 2: Create ECS Task Role**

This role allows your application code to access AWS services (S3, SQS, etc.)

```bash
# Create task role
TASK_ROLE_NAME="${PROJECT_NAME}-ecs-task-role"

aws iam create-role \
  --role-name $TASK_ROLE_NAME \
  --assume-role-policy-document file:///tmp/ecs-task-execution-trust-policy.json \
  --tags "Key=Name,Value=${TASK_ROLE_NAME}" \
  --region $AWS_REGION

# Create policy for application permissions
cat > /tmp/task-role-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${UPLOADS_BUCKET}",
        "arn:aws:s3:::${UPLOADS_BUCKET}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "${QUEUE_ARN}",
        "${DLQ_ARN}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $TASK_ROLE_NAME \
  --policy-name ApplicationPermissions \
  --policy-document file:///tmp/task-role-policy.json

# Get role ARN
TASK_ROLE_ARN=$(aws iam get-role \
  --role-name $TASK_ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo "Task Role ARN: $TASK_ROLE_ARN"
```

### 9.2 Create ECS Cluster

```bash
# Create ECS cluster
CLUSTER_NAME="${PROJECT_NAME}-cluster"

aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=4 \
  --settings name=containerInsights,value=enabled \
  --tags "Key=Name,Value=${CLUSTER_NAME},Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

echo "ECS Cluster created: $CLUSTER_NAME"
```

### 9.3 Create CloudWatch Log Groups

```bash
# Create log group for backend
BACKEND_LOG_GROUP="/ecs/${PROJECT_NAME}-backend"

aws logs create-log-group \
  --log-group-name $BACKEND_LOG_GROUP \
  --region $AWS_REGION

# Set retention policy (30 days)
aws logs put-retention-policy \
  --log-group-name $BACKEND_LOG_GROUP \
  --retention-in-days 30 \
  --region $AWS_REGION

# Create log group for worker
WORKER_LOG_GROUP="/ecs/${PROJECT_NAME}-worker"

aws logs create-log-group \
  --log-group-name $WORKER_LOG_GROUP \
  --region $AWS_REGION

aws logs put-retention-policy \
  --log-group-name $WORKER_LOG_GROUP \
  --retention-in-days 30 \
  --region $AWS_REGION

echo "Log groups created"
```

### 9.4 Create Task Definitions

**Step 1: Backend Task Definition**

```bash
# Create backend task definition JSON
cat > /tmp/backend-task-def.json << EOF
{
  "family": "${PROJECT_NAME}-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${TASK_EXECUTION_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${BACKEND_REPO_URI}:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "AWS_REGION",
          "value": "${AWS_REGION}"
        },
        {
          "name": "S3_BUCKET_NAME",
          "value": "${UPLOADS_BUCKET}"
        },
        {
          "name": "SQS_QUEUE_URL",
          "value": "${QUEUE_URL}"
        },
        {
          "name": "REDIS_URL",
          "value": "${REDIS_URL}"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${PROJECT_NAME}/${ENVIRONMENT}/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${BACKEND_LOG_GROUP}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
BACKEND_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/backend-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Backend Task Definition: $BACKEND_TASK_DEF_ARN"
```

**Step 2: Worker Task Definition**

```bash
# Create worker task definition JSON
cat > /tmp/worker-task-def.json << EOF
{
  "family": "${PROJECT_NAME}-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${TASK_EXECUTION_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "${WORKER_REPO_URI}:latest",
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "${AWS_REGION}"
        },
        {
          "name": "S3_BUCKET_NAME",
          "value": "${UPLOADS_BUCKET}"
        },
        {
          "name": "SQS_QUEUE_URL",
          "value": "${QUEUE_URL}"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${PROJECT_NAME}/${ENVIRONMENT}/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${WORKER_LOG_GROUP}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Register task definition
WORKER_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/worker-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Worker Task Definition: $WORKER_TASK_DEF_ARN"
```

### 9.5 Create ECS Services

**Step 1: Create Backend Service**

```bash
# Create backend service with ALB integration
BACKEND_SERVICE_NAME="${PROJECT_NAME}-backend-service"

aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $BACKEND_SERVICE_NAME \
  --task-definition ${PROJECT_NAME}-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=backend,containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --enable-execute-command \
  --tags "Key=Name,Value=${BACKEND_SERVICE_NAME},Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

echo "Backend service created: $BACKEND_SERVICE_NAME"
```

**Step 2: Create Worker Service**

```bash
# Create worker service
WORKER_SERVICE_NAME="${PROJECT_NAME}-worker-service"

aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $WORKER_SERVICE_NAME \
  --task-definition ${PROJECT_NAME}-worker \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=DISABLED}" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --enable-execute-command \
  --tags "Key=Name,Value=${WORKER_SERVICE_NAME},Key=Environment,Value=${ENVIRONMENT}" \
  --region $AWS_REGION

echo "Worker service created: $WORKER_SERVICE_NAME"
```

**Step 3: Configure Auto Scaling for Backend**

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/${CLUSTER_NAME}/${BACKEND_SERVICE_NAME} \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region $AWS_REGION

# Create scaling policy for CPU
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/${CLUSTER_NAME}/${BACKEND_SERVICE_NAME} \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name ${PROJECT_NAME}-backend-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region $AWS_REGION

# Create scaling policy for memory
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/${CLUSTER_NAME}/${BACKEND_SERVICE_NAME} \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name ${PROJECT_NAME}-backend-memory-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 80.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region $AWS_REGION

echo "Auto-scaling configured for backend service"
```

**Step 4: Wait for Services to Stabilize**

```bash
# Wait for backend service to become stable
echo "Waiting for backend service to become stable (this may take 5-10 minutes)..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME \
  --region $AWS_REGION

# Wait for worker service to become stable
echo "Waiting for worker service to become stable..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $WORKER_SERVICE_NAME \
  --region $AWS_REGION

echo "All services are stable and running!"
```

**Step 5: Test Backend API**

```bash
# Test the backend through ALB
echo "Testing backend API at: http://$ALB_DNS/health"
curl http://$ALB_DNS/health

# Expected output: {"status":"ok"}
```

**Step 6: Save ECS Configuration**
```bash
cat > ~/fileflow-ecs-config.sh << EOF
export CLUSTER_NAME="$CLUSTER_NAME"
export TASK_EXECUTION_ROLE_ARN="$TASK_EXECUTION_ROLE_ARN"
export TASK_ROLE_ARN="$TASK_ROLE_ARN"
export BACKEND_SERVICE_NAME="$BACKEND_SERVICE_NAME"
export WORKER_SERVICE_NAME="$WORKER_SERVICE_NAME"
export BACKEND_LOG_GROUP="$BACKEND_LOG_GROUP"
export WORKER_LOG_GROUP="$WORKER_LOG_GROUP"
EOF
```

---

## 10. Frontend Hosting Setup

### 10.1 Build Frontend for Production

```bash
# Navigate to frontend directory
cd /Users/hari/Documents/E/fullstack-aws-deployment-poc/frontend

# Update API endpoint in environment configuration
cat > .env.production << EOF
VITE_API_URL=http://${ALB_DNS}
EOF

# Build frontend
yarn build

# Verify build output
ls -lh dist/

echo "Frontend build complete"
```

### 10.2 Upload Frontend to S3

```bash
# Upload build to S3
aws s3 sync ./dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "max-age=31536000,public,immutable" \
  --exclude "index.html" \
  --region $AWS_REGION

# Upload index.html separately with no-cache
aws s3 cp ./dist/index.html s3://$FRONTEND_BUCKET/index.html \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html" \
  --region $AWS_REGION

echo "Frontend uploaded to S3"
```

### 10.3 Configure S3 for Static Website Hosting

```bash
# Enable static website hosting
aws s3 website s3://$FRONTEND_BUCKET/ \
  --index-document index.html \
  --error-document index.html \
  --region $AWS_REGION

echo "Static website hosting enabled"
```

### 10.4 Create CloudFront Distribution

**Step 1: Create Origin Access Identity** (for S3 bucket access)

```bash
# Create OAI
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    "CallerReference=$(date +%s),Comment=OAI for ${PROJECT_NAME} frontend" \
  --query 'CloudFrontOriginAccessIdentity.Id' \
  --output text)

echo "Origin Access Identity ID: $OAI_ID"

# Get OAI canonical user ID for bucket policy
OAI_CANONICAL_USER=$(aws cloudfront get-cloud-front-origin-access-identity \
  --id $OAI_ID \
  --query 'CloudFrontOriginAccessIdentity.S3CanonicalUserId' \
  --output text)
```

**Step 2: Update S3 Bucket Policy**

```bash
# Create bucket policy to allow CloudFront OAI
cat > /tmp/frontend-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "CanonicalUser": "${OAI_CANONICAL_USER}"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${FRONTEND_BUCKET}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket $FRONTEND_BUCKET \
  --policy file:///tmp/frontend-bucket-policy.json

echo "S3 bucket policy updated"
```

**Step 3: Create CloudFront Distribution**

```bash
# Create distribution configuration
cat > /tmp/cloudfront-config.json << EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "${PROJECT_NAME} frontend distribution",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${FRONTEND_BUCKET}",
        "DomainName": "${FRONTEND_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/${OAI_ID}"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${FRONTEND_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
EOF

# Create CloudFront distribution
CF_DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

echo "CloudFront Distribution ID: $CF_DIST_ID"

# Get CloudFront domain name
CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $CF_DIST_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "CloudFront Domain: $CF_DOMAIN"
echo "Your frontend will be accessible at: https://$CF_DOMAIN"
echo "(CloudFront distribution takes 15-20 minutes to fully deploy)"
```

**Step 4: Wait for CloudFront Distribution**

```bash
# Wait for distribution to be deployed (takes ~15-20 minutes)
echo "Waiting for CloudFront distribution to deploy..."
aws cloudfront wait distribution-deployed \
  --id $CF_DIST_ID

echo "CloudFront distribution is now live!"
echo "Frontend URL: https://$CF_DOMAIN"
```

**Step 5: (Optional) Add Custom Domain with Route 53**

If you have a domain:

```bash
# First, request SSL certificate for your domain
FRONTEND_CERT_ARN=$(aws acm request-certificate \
  --domain-name "${DOMAIN_NAME}" \
  --subject-alternative-names "www.${DOMAIN_NAME}" \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $FRONTEND_CERT_ARN"
echo "Complete DNS validation in ACM console"
echo "After validation, update CloudFront distribution with custom domain and cert"
```

**Step 6: Save CloudFront Configuration**

```bash
cat > ~/fileflow-cloudfront-config.sh << EOF
export OAI_ID="$OAI_ID"
export CF_DIST_ID="$CF_DIST_ID"
export CF_DOMAIN="$CF_DOMAIN"
EOF
```

---

## 11. CI/CD Pipeline Setup

### 11.1 Prepare GitHub Repository

**Step 1: Initialize Git Repository** (if not already done)

```bash
cd /Users/hari/Documents/E/fullstack-aws-deployment-poc

# Initialize git if needed
git init

# Add remote
git remote add origin https://github.com/yourusername/fileflow-poc.git

# Create .gitignore (if not exists)
# (You already have this file configured)

# Commit and push
git add .
git commit -m "Initial commit: FileFlow POC"
git push -u origin main
```

### 11.2 Configure GitHub Secrets

Add these secrets to your GitHub repository:

Go to: `Settings → Secrets and variables → Actions → New repository secret`

Add the following secrets:

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS authentication |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | AWS authentication |
| `AWS_ACCOUNT_ID` | `123456789012` | Your AWS account ID |
| `AWS_REGION` | `us-east-1` | AWS region |
| `ECR_BACKEND_REPO` | Backend repo name | ECR repository |
| `ECR_WORKER_REPO` | Worker repo name | ECR repository |
| `ECS_CLUSTER` | Cluster name | ECS cluster |
| `ECS_BACKEND_SERVICE` | Backend service name | ECS service |
| `ECS_WORKER_SERVICE` | Worker service name | ECS service |
| `S3_FRONTEND_BUCKET` | Frontend bucket name | S3 bucket |
| `CLOUDFRONT_DIST_ID` | CloudFront ID | CloudFront distribution |

```bash
# Quick reference for your values:
echo "AWS_ACCOUNT_ID: $AWS_ACCOUNT_ID"
echo "AWS_REGION: $AWS_REGION"
echo "ECR_BACKEND_REPO: $BACKEND_REPO_NAME"
echo "ECR_WORKER_REPO: $WORKER_REPO_NAME"
echo "ECS_CLUSTER: $CLUSTER_NAME"
echo "ECS_BACKEND_SERVICE: $BACKEND_SERVICE_NAME"
echo "ECS_WORKER_SERVICE: $WORKER_SERVICE_NAME"
echo "S3_FRONTEND_BUCKET: $FRONTEND_BUCKET"
echo "CLOUDFRONT_DIST_ID: $CF_DIST_ID"
```

### 11.3 Create GitHub Actions Workflows

Create directory for workflows:

```bash
mkdir -p .github/workflows
```

**Workflow 1: Backend CI/CD**

Create `.github/workflows/backend-deploy.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REPOSITORY: ${{ secrets.ECR_BACKEND_REPO }}
  ECS_SERVICE: ${{ secrets.ECS_BACKEND_SERVICE }}
  ECS_CLUSTER: ${{ secrets.ECS_CLUSTER }}
  ECS_TASK_DEFINITION: fileflow-backend
  CONTAINER_NAME: backend

jobs:
  deploy:
    name: Deploy Backend to ECS
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $ECS_TASK_DEFINITION \
            --query taskDefinition > task-definition.json

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Deployment Summary
        run: |
          echo "✅ Backend deployed successfully!"
          echo "🏷️  Image: ${{ steps.build-image.outputs.image }}"
          echo "🔧 Service: ${{ env.ECS_SERVICE }}"
          echo "📦 Cluster: ${{ env.ECS_CLUSTER }}"
```

**Workflow 2: Worker CI/CD**

Create `.github/workflows/worker-deploy.yml`:

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
      - '.github/workflows/worker-deploy.yml'
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REPOSITORY: ${{ secrets.ECR_WORKER_REPO }}
  ECS_SERVICE: ${{ secrets.ECS_WORKER_SERVICE }}
  ECS_CLUSTER: ${{ secrets.ECS_CLUSTER }}
  ECS_TASK_DEFINITION: fileflow-worker
  CONTAINER_NAME: worker

jobs:
  deploy:
    name: Deploy Worker to ECS
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd worker
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $ECS_TASK_DEFINITION \
            --query taskDefinition > task-definition.json

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Deployment Summary
        run: |
          echo "✅ Worker deployed successfully!"
          echo "🏷️  Image: ${{ steps.build-image.outputs.image }}"
          echo "🔧 Service: ${{ env.ECS_SERVICE }}"
          echo "📦 Cluster: ${{ env.ECS_CLUSTER }}"
```

**Workflow 3: Frontend CI/CD**

Create `.github/workflows/frontend-deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-deploy.yml'
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  S3_BUCKET: ${{ secrets.S3_FRONTEND_BUCKET }}
  CLOUDFRONT_DIST_ID: ${{ secrets.CLOUDFRONT_DIST_ID }}

jobs:
  deploy:
    name: Deploy Frontend to S3/CloudFront
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: |
          cd frontend
          yarn install --immutable

      - name: Build frontend
        run: |
          cd frontend
          yarn build
        env:
          VITE_API_URL: http://${{ secrets.ALB_DNS }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: |
          cd frontend
          aws s3 sync ./dist/ s3://$S3_BUCKET/ \
            --delete \
            --cache-control "max-age=31536000,public,immutable" \
            --exclude "index.html"
          
          aws s3 cp ./dist/index.html s3://$S3_BUCKET/index.html \
            --cache-control "no-cache,no-store,must-revalidate" \
            --content-type "text/html"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DIST_ID \
            --paths "/*"

      - name: Deployment Summary
        run: |
          echo "✅ Frontend deployed successfully!"
          echo "📦 S3 Bucket: $S3_BUCKET"
          echo "🌐 CloudFront: $CLOUDFRONT_DIST_ID"
          echo "⚡ Cache invalidated"
```

**Step 4: Commit and Push Workflows**

```bash
git add .github/workflows/
git commit -m "Add CI/CD workflows for backend, worker, and frontend"
git push origin main
```

### 11.4 Test CI/CD Pipeline

**Step 1: Make a Test Change**

```bash
# Make a small change to backend
echo "// CI/CD test" >> backend/src/main.ts

git add backend/src/main.ts
git commit -m "test: trigger backend CI/CD"
git push origin main
```

**Step 2: Monitor GitHub Actions**

- Go to your GitHub repository
- Click "Actions" tab
- Watch the "Deploy Backend" workflow run
- Verify deployment succeeds

**Step 3: Verify Deployment**

```bash
# Check ECS service
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].deployments'

# Test API
curl http://$ALB_DNS/health
```

---

**(Document continues with remaining sections...)**

Would you like me to continue with:
- 12. Monitoring & Logging Setup
- 13. Blue/Green Deployment Setup  
- 14. Security Best Practices
- 15-18. Testing, Rollback, Cost Optimization, and Troubleshooting sections?


## 12. Monitoring & Logging Setup

### 12.1 CloudWatch Dashboards

**Step 1: Create Custom Dashboard**

```bash
# Create dashboard configuration
cat > /tmp/dashboard-config.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ECS", "CPUUtilization", { "stat": "Average", "label": "Backend CPU" } ],
          [ "...", { "stat": "Average", "label": "Worker CPU" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${AWS_REGION}",
        "title": "ECS CPU Utilization",
        "yAxis": {
          "left": {
            "min": 0,
            "max": 100
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ApplicationELB", "TargetResponseTime", { "stat": "Average" } ],
          [ ".", "RequestCount", { "stat": "Sum", "yAxis": "right" } ],
          [ ".", "HTTPCode_Target_5XX_Count", { "stat": "Sum", "yAxis": "right" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${AWS_REGION}",
        "title": "ALB Metrics",
        "yAxis": {
          "left": {
            "label": "Response Time (ms)"
          },
          "right": {
            "label": "Count"
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/SQS", "ApproximateNumberOfMessagesVisible", { "stat": "Average", "label": "Messages in Queue" } ],
          [ ".", "NumberOfMessagesSent", { "stat": "Sum", "label": "Messages Sent" } ],
          [ ".", "NumberOfMessagesDeleted", { "stat": "Sum", "label": "Messages Processed" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${AWS_REGION}",
        "title": "SQS Queue Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '${BACKEND_LOG_GROUP}'\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 20",
        "region": "${AWS_REGION}",
        "title": "Recent Backend Logs"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "${PROJECT_NAME}-dashboard" \
  --dashboard-body file:///tmp/dashboard-config.json \
  --region $AWS_REGION

echo "CloudWatch Dashboard created: ${PROJECT_NAME}-dashboard"
echo "View at: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${PROJECT_NAME}-dashboard"
```

### 12.2 Set Up CloudWatch Alarms

**Step 1: ALB Target Health Alarm**

```bash
# Alarm when unhealthy targets detected
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-unhealthy-targets" \
  --alarm-description "Alert when ALB has unhealthy targets" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d':' -f6 | cut -d'/' -f2-) \
  --region $AWS_REGION
```

**Step 2: API 5XX Error Alarm**

```bash
# Alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-high-5xx-errors" \
  --alarm-description "Alert when 5XX error rate is high" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d':' -f6 | cut -d'/' -f2-) \
  --region $AWS_REGION
```

**Step 3: ECS Task Failure Alarm**

```bash
# Alarm when ECS tasks fail to start
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-ecs-task-failures" \
  --alarm-description "Alert when ECS tasks are failing" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic SampleCount \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --dimensions Name=ServiceName,Value=$BACKEND_SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
  --treat-missing-data notBreaching \
  --region $AWS_REGION
```

**Step 4: RDS CPU and Storage Alarms**

```bash
# RDS CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-rds-high-cpu" \
  --alarm-description "Alert when RDS CPU is high" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=$DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION

# RDS storage alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "${PROJECT_NAME}-rds-low-storage" \
  --alarm-description "Alert when RDS storage is low" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2147483648 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=$DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION
```

### 12.3 Set Up Log Insights Queries

**Useful CloudWatch Logs Insights queries:**

```bash
# Query 1: Find errors in backend logs
fields @timestamp, @message
| filter @message like /ERROR|error|Error/
| sort @timestamp desc
| limit 50

# Query 2: API response times
fields @timestamp, @message
| filter @message like /Request processed/
| parse @message /duration: (?<duration>\d+)ms/
| stats avg(duration), max(duration), min(duration) by bin(5m)

# Query 3: Most frequent errors
fields @message
| filter @message like /ERROR/
| stats count() as error_count by @message
| sort error_count desc
| limit 10

# Query 4: Worker processing metrics
fields @timestamp, @message
| filter @message like /Successfully processed|Failed to process/
| parse @message /(Successfully processed|Failed to process) record: (?<recordId>[a-f0-9-]+)/
| stats count() by recordId
| sort count desc
```

### 12.4 Enable X-Ray Tracing (Optional)

For distributed tracing across services:

```bash
# Update task definitions to include X-Ray sidecar
# Add to containerDefinitions array:
{
  "name": "xray-daemon",
  "image": "amazon/aws-xray-daemon",
  "cpu": 32,
  "memoryReservation": 256,
  "portMappings": [
    {
      "containerPort": 2000,
      "protocol": "udp"
    }
  ]
}

# Update task role to include X-Ray permissions
cat > /tmp/xray-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $TASK_ROLE_NAME \
  --policy-name XRayAccess \
  --policy-document file:///tmp/xray-policy.json
```

---

## 13. Blue/Green Deployment Setup

### 13.1 Create CodeDeploy Application

**Step 1: Create IAM Role for CodeDeploy**

```bash
# Create trust policy
cat > /tmp/codedeploy-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
CODEDEPLOY_ROLE_NAME="${PROJECT_NAME}-codedeploy-role"

aws iam create-role \
  --role-name $CODEDEPLOY_ROLE_NAME \
  --assume-role-policy-document file:///tmp/codedeploy-trust-policy.json \
  --region $AWS_REGION

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name $CODEDEPLOY_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS \
  --region $AWS_REGION

# Get role ARN
CODEDEPLOY_ROLE_ARN=$(aws iam get-role \
  --role-name $CODEDEPLOY_ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo "CodeDeploy Role ARN: $CODEDEPLOY_ROLE_ARN"
```

**Step 2: Create CodeDeploy Application**

```bash
# Create application
CODEDEPLOY_APP_NAME="${PROJECT_NAME}-deploy"

aws deploy create-application \
  --application-name $CODEDEPLOY_APP_NAME \
  --compute-platform ECS \
  --region $AWS_REGION

echo "CodeDeploy Application created: $CODEDEPLOY_APP_NAME"
```

**Step 3: Create Target Group for Blue/Green**

We need a second target group for blue/green deployment:

```bash
# Create second target group (for green deployment)
TG_GREEN_NAME="${PROJECT_NAME}-backend-tg-green"

TG_GREEN_ARN=$(aws elbv2 create-target-group \
  --name $TG_GREEN_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --tags "Key=Name,Value=${TG_GREEN_NAME}" \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Green Target Group ARN: $TG_GREEN_ARN"
```

**Step 4: Create Deployment Group**

```bash
# Create deployment group with blue/green configuration
DEPLOYMENT_GROUP_NAME="${PROJECT_NAME}-backend-dg"

aws deploy create-deployment-group \
  --application-name $CODEDEPLOY_APP_NAME \
  --deployment-group-name $DEPLOYMENT_GROUP_NAME \
  --service-role-arn $CODEDEPLOY_ROLE_ARN \
  --deployment-config-name CodeDeployDefault.ECSAllAtOnce \
  --ecs-services clusterName=$CLUSTER_NAME,serviceName=$BACKEND_SERVICE_NAME \
  --load-balancer-info "targetGroupPairInfoList=[{targetGroups=[{name=${TG_NAME}},{name=${TG_GREEN_NAME}}],prodTrafficRoute={listenerArns=[${LISTENER_ARN}]}}]" \
  --blue-green-deployment-configuration '{
    "terminateBlueInstancesOnDeploymentSuccess": {
      "action": "TERMINATE",
      "terminationWaitTimeInMinutes": 5
    },
    "deploymentReadyOption": {
      "actionOnTimeout": "CONTINUE_DEPLOYMENT"
    }
  }' \
  --auto-rollback-configuration '{
    "enabled": true,
    "events": ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }' \
  --region $AWS_REGION

echo "Deployment Group created: $DEPLOYMENT_GROUP_NAME"
```

### 13.2 Create AppSpec File

Create `appspec.yaml` in the repository root:

```yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "<TASK_DEFINITION>"
        LoadBalancerInfo:
          ContainerName: "backend"
          ContainerPort: 3000
        PlatformVersion: "LATEST"
        NetworkConfiguration:
          AwsvpcConfiguration:
            Subnets:
              - "PRIVATE_SUBNET_1"
              - "PRIVATE_SUBNET_2"
            SecurityGroups:
              - "ECS_SG_ID"
            AssignPublicIp: "DISABLED"
Hooks:
  - BeforeInstall: "LambdaFunctionToValidateBeforeInstall"
  - AfterInstall: "LambdaFunctionToValidateAfterTraffic"
  - AfterAllowTestTraffic: "LambdaFunctionToValidateAfterTestTrafficStarts"
  - BeforeAllowTraffic: "LambdaFunctionToValidateBeforeTrafficShift"
  - AfterAllowTraffic: "LambdaFunctionToValidateAfterTrafficShift"
```

### 13.3 Update GitHub Workflow for Blue/Green

Update `.github/workflows/backend-deploy.yml` to use CodeDeploy:

```yaml
- name: Create CodeDeploy Deployment
  run: |
    # Register new task definition
    TASK_DEF_ARN=$(aws ecs register-task-definition \
      --cli-input-json file://task-definition.json \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text)
    
    # Create appspec.json for CodeDeploy
    cat > appspec.json << EOF
    {
      "version": 0.0,
      "Resources": [{
        "TargetService": {
          "Type": "AWS::ECS::Service",
          "Properties": {
            "TaskDefinition": "${TASK_DEF_ARN}",
            "LoadBalancerInfo": {
              "ContainerName": "backend",
              "ContainerPort": 3000
            }
          }
        }
      }]
    }
    EOF
    
    # Create deployment
    aws deploy create-deployment \
      --application-name ${{ env.CODEDEPLOY_APP_NAME }} \
      --deployment-group-name ${{ env.DEPLOYMENT_GROUP_NAME }} \
      --revision '{"revisionType": "AppSpecContent", "appSpecContent": {"content": "'"$(cat appspec.json)"'"}}' \
      --region ${{ env.AWS_REGION }}
```

### 13.4 Test Blue/Green Deployment

```bash
# Trigger a deployment
git add .
git commit -m "test: blue/green deployment"
git push origin main

# Monitor deployment in CodeDeploy console or CLI
aws deploy get-deployment \
  --deployment-id <deployment-id> \
  --region $AWS_REGION

# Watch deployment status
aws deploy list-deployments \
  --application-name $CODEDEPLOY_APP_NAME \
  --deployment-group-name $DEPLOYMENT_GROUP_NAME \
  --include-only-statuses InProgress \
  --region $AWS_REGION
```

---

## 14. Security Best Practices

### 14.1 Enable AWS GuardDuty

```bash
# Enable GuardDuty for threat detection
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES \
  --region $AWS_REGION

echo "GuardDuty enabled for security monitoring"
```

### 14.2 Enable AWS Config

```bash
# Create S3 bucket for Config
CONFIG_BUCKET="${PROJECT_NAME}-config-${AWS_ACCOUNT_ID}"

aws s3 mb s3://$CONFIG_BUCKET --region $AWS_REGION

# Enable AWS Config (simplified - use console for full setup)
echo "Enable AWS Config through the AWS Console for compliance monitoring"
```

### 14.3 Implement Secrets Rotation

```bash
# Enable automatic rotation for database password
aws secretsmanager rotate-secret \
  --secret-id "${PROJECT_NAME}/${ENVIRONMENT}/db-password" \
  --rotation-lambda-arn <lambda-arn-for-rotation> \
  --rotation-rules AutomaticallyAfterDays=30 \
  --region $AWS_REGION
```

### 14.4 Enable VPC Flow Logs

```bash
# Create log group for VPC flow logs
VPC_FLOW_LOG_GROUP="/aws/vpc/${PROJECT_NAME}"

aws logs create-log-group \
  --log-group-name $VPC_FLOW_LOG_GROUP \
  --region $AWS_REGION

# Create IAM role for VPC Flow Logs
cat > /tmp/vpc-flow-logs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "vpc-flow-logs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

VPC_FLOW_LOGS_ROLE_NAME="${PROJECT_NAME}-vpc-flow-logs-role"

aws iam create-role \
  --role-name $VPC_FLOW_LOGS_ROLE_NAME \
  --assume-role-policy-document file:///tmp/vpc-flow-logs-trust-policy.json

# Attach policy
cat > /tmp/vpc-flow-logs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $VPC_FLOW_LOGS_ROLE_NAME \
  --policy-name VPCFlowLogsPolicy \
  --policy-document file:///tmp/vpc-flow-logs-policy.json

VPC_FLOW_LOGS_ROLE_ARN=$(aws iam get-role \
  --role-name $VPC_FLOW_LOGS_ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-destination "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:${VPC_FLOW_LOG_GROUP}" \
  --deliver-logs-permission-arn $VPC_FLOW_LOGS_ROLE_ARN \
  --region $AWS_REGION

echo "VPC Flow Logs enabled"
```

### 14.5 Security Checklist

- ✅ All S3 buckets have encryption enabled
- ✅ RDS database uses encryption at rest
- ✅ Secrets stored in AWS Secrets Manager
- ✅ IAM roles follow least-privilege principle
- ✅ Security groups restrict access appropriately
- ✅ VPC Flow Logs enabled for network monitoring
- ✅ CloudWatch alarms configured for security events
- ✅ GuardDuty enabled for threat detection
- ✅ All traffic uses HTTPS (with ACM certificates)
- ✅ ECS tasks run in private subnets
- ✅ Database not publicly accessible
- ✅ Regular security patching via container image updates

---

## 15. Testing the Deployment

### 15.1 Health Check Tests

```bash
# Test ALB health
curl -I http://$ALB_DNS/health

# Expected: HTTP/1.1 200 OK

# Test backend API
curl http://$ALB_DNS/health
# Expected: {"status":"ok"}

# Test frontend
curl -I https://$CF_DOMAIN
# Expected: HTTP/2 200
```

### 15.2 Load Testing

Use `apache-bench` or `artillery` for load testing:

```bash
# Install artillery
npm install -g artillery

# Create load test scenario
cat > load-test.yml << EOF
config:
  target: "http://${ALB_DNS}"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/health"
  - name: "Dashboard"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.token"
              as: "token"
      - get:
          url: "/dashboard/summary"
          headers:
            Authorization: "Bearer {{ token }}"
EOF

# Run load test
artillery run load-test.yml
```

### 15.3 Failover Testing

```bash
# Stop one ECS task to test auto-recovery
TASK_ID=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $BACKEND_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

aws ecs stop-task \
  --cluster $CLUSTER_NAME \
  --task $TASK_ID \
  --reason "Testing auto-recovery" \
  --region $AWS_REGION

# Watch service recover
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].events[0:5]'
```

---

## 16. Rollback Procedures

### 16.1 Rollback ECS Deployment

**Option 1: Update service to previous task definition**

```bash
# List recent task definitions
aws ecs list-task-definitions \
  --family-prefix ${PROJECT_NAME}-backend \
  --sort DESC \
  --max-items 5 \
  --region $AWS_REGION

# Rollback to previous version
PREVIOUS_TASK_DEF="arn:aws:ecs:${AWS_REGION}:${AWS_ACCOUNT_ID}:task-definition/${PROJECT_NAME}-backend:X"

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $BACKEND_SERVICE_NAME \
  --task-definition $PREVIOUS_TASK_DEF \
  --force-new-deployment \
  --region $AWS_REGION

echo "Rolling back to: $PREVIOUS_TASK_DEF"
```

**Option 2: Rollback CodeDeploy deployment**

```bash
# Stop current deployment and rollback
DEPLOYMENT_ID="d-XXXXXXXXX"

aws deploy stop-deployment \
  --deployment-id $DEPLOYMENT_ID \
  --auto-rollback-enabled \
  --region $AWS_REGION
```

### 16.2 Rollback Frontend Deployment

```bash
# List S3 bucket versions
aws s3api list-object-versions \
  --bucket $FRONTEND_BUCKET \
  --prefix index.html \
  --region $AWS_REGION

# Restore previous version
VERSION_ID="previous-version-id"

aws s3api copy-object \
  --bucket $FRONTEND_BUCKET \
  --copy-source $FRONTEND_BUCKET/index.html?versionId=$VERSION_ID \
  --key index.html \
  --region $AWS_REGION

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*" \
  --region $AWS_REGION
```

### 16.3 Database Rollback

```bash
# Restore RDS from snapshot
SNAPSHOT_ID="rds:${DB_INSTANCE_IDENTIFIER}-2024-03-12"

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ${DB_INSTANCE_IDENTIFIER}-restored \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --db-instance-class db.t3.micro \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
  --publicly-accessible false \
  --region $AWS_REGION

echo "Restoring database from snapshot (takes 10-15 minutes)"
```

---

## 17. Cost Optimization

### 17.1 Use Fargate Spot for Non-Critical Workloads

```bash
# Update worker service to use Fargate Spot
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $WORKER_SERVICE_NAME \
  --capacity-provider-strategy \
    capacityProvider=FARGATE_SPOT,weight=100 \
  --region $AWS_REGION

echo "Worker service now using Fargate Spot (70% cost savings)"
```

### 17.2 Implement Auto-Scaling Schedule

```bash
# Scale down during off-hours
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/${CLUSTER_NAME}/${BACKEND_SERVICE_NAME} \
  --scalable-dimension ecs:service:DesiredCount \
  --scheduled-action-name scale-down-evening \
  --schedule "cron(0 22 * * ? *)" \
  --scalable-target-action MinCapacity=1,MaxCapacity=2 \
  --region $AWS_REGION

# Scale up during business hours
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/${CLUSTER_NAME}/${BACKEND_SERVICE_NAME} \
  --scalable-dimension ecs:service:DesiredCount \
  --scheduled-action-name scale-up-morning \
  --schedule "cron(0 8 * * ? *)" \
  --scalable-target-action MinCapacity=2,MaxCapacity=10 \
  --region $AWS_REGION
```

### 17.3 S3 Lifecycle Policies

Already configured in section 6.3, but you can extend:

```bash
# Add intelligent tiering for uploads bucket
cat > /tmp/s3-intelligent-tiering.json << EOF
{
  "Rules": [
    {
      "Id": "IntelligentTiering",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $UPLOADS_BUCKET \
  --lifecycle-configuration file:///tmp/s3-intelligent-tiering.json
```

### 17.4 Enable Cost Explorer and Budgets

```bash
# Create budget alert
aws budgets create-budget \
  --account-id $AWS_ACCOUNT_ID \
  --budget '{
    "BudgetName": "'"${PROJECT_NAME}-monthly-budget"'",
    "BudgetLimit": {
      "Amount": "150",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "your-email@example.com"
        }
      ]
    }
  ]'

echo "Budget created: You'll be alerted at 80% of $150/month"
```

---

## 18. Troubleshooting

### 18.1 ECS Task Won't Start

**Symptoms:** Tasks keep failing to start

**Common Causes & Solutions:**

```bash
# 1. Check task stopped reason
aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $BACKEND_SERVICE_NAME --query 'taskArns[0]' --output text) \
  --region $AWS_REGION \
  --query 'tasks[0].stoppedReason'

# 2. Check CloudWatch Logs
aws logs tail $BACKEND_LOG_GROUP --follow

# 3. Check IAM role permissions
aws iam simulate-principal-policy \
  --policy-source-arn $TASK_EXECUTION_ROLE_ARN \
  --action-names ecr:GetAuthorizationToken ecr:BatchGetImage \
  --region $AWS_REGION

# 4. Verify security group allows outbound traffic
aws ec2 describe-security-groups \
  --group-ids $ECS_SG_ID \
  --region $AWS_REGION

# 5. Check if image exists in ECR
aws ecr describe-images \
  --repository-name $BACKEND_REPO_NAME \
  --region $AWS_REGION
```

### 18.2 ALB Health Checks Failing

**Symptoms:** Targets showing as unhealthy in ALB

**Solutions:**

```bash
# 1. Check health check configuration
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION

# 2. Test health endpoint from within VPC
# Use ECS Exec to access a running task
aws ecs execute-command \
  --cluster $CLUSTER_NAME \
  --task <task-id> \
  --container backend \
  --interactive \
  --command "/bin/sh"

# Inside container:
curl localhost:3000/health

# 3. Check security group rules
# Ensure ALB security group can reach ECS tasks on port 3000
```

### 18.3 Database Connection Issues

**Symptoms:** Application can't connect to RDS

**Solutions:**

```bash
# 1. Verify database is running
aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION \
  --query 'DBInstances[0].DBInstanceStatus'

# 2. Check security group rules
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=$RDS_SG_ID" \
  --region $AWS_REGION

# 3. Test connection from ECS task
aws ecs execute-command \
  --cluster $CLUSTER_NAME \
  --task <task-id> \
  --container backend \
  --interactive \
  --command "/bin/sh"

# Inside container:
nc -zv $DB_ENDPOINT 5432

# 4. Verify connection string in Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id "${PROJECT_NAME}/${ENVIRONMENT}/database-url" \
  --region $AWS_REGION
```

### 18.4 Frontend Not Loading

**Symptoms:** CloudFront returns errors or blank page

**Solutions:**

```bash
# 1. Check CloudFront distribution status
aws cloudfront get-distribution \
  --id $CF_DIST_ID \
  --query 'Distribution.Status'

# 2. Verify S3 bucket has files
aws s3 ls s3://$FRONTEND_BUCKET/

# 3. Check S3 bucket policy
aws s3api get-bucket-policy \
  --bucket $FRONTEND_BUCKET

# 4. Test S3 bucket directly (should fail if OAI is working)
curl http://$FRONTEND_BUCKET.s3.amazonaws.com/index.html

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"

# 6. Check browser console for API URL issues
# Verify VITE_API_URL is correctly set in .env.production
```

### 18.5 Worker Not Processing Messages

**Symptoms:** Messages stuck in SQS queue

**Solutions:**

```bash
# 1. Check queue metrics
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names All \
  --region $AWS_REGION

# 2. Check worker logs
aws logs tail $WORKER_LOG_GROUP --follow

# 3. Verify worker is running
aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $WORKER_SERVICE_NAME \
  --region $AWS_REGION

# 4. Check IAM permissions for SQS
aws iam simulate-principal-policy \
  --policy-source-arn $TASK_ROLE_ARN \
  --action-names sqs:ReceiveMessage sqs:DeleteMessage \
  --resource-arns $QUEUE_ARN \
  --region $AWS_REGION

# 5. Manually send test message
aws sqs send-message \
  --queue-url $QUEUE_URL \
  --message-body '{"recordId":"test-123","fileKey":"test.pdf"}' \
  --region $AWS_REGION
```

### 18.6 High Costs

**Solutions:**

```bash
# 1. Identify top services by cost
aws ce get-cost-and-usage \
  --time-period Start=2024-03-01,End=2024-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# 2. Check NAT Gateway data transfer (often expensive)
# Consider VPC endpoints instead

# 3. Review ECS task counts
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME $WORKER_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[].[serviceName,runningCount,desiredCount]'

# 4. Check CloudFront data transfer
aws cloudfront get-distribution \
  --id $CF_DIST_ID \
  --query 'Distribution.DistributionConfig.PriceClass'

# 5. Review unused resources
# - Elastic IPs not attached to instances
# - Idle load balancers
# - Old EBS snapshots
# - Unused ECR images
```

---

## Appendix: Quick Reference

### All Configuration Files Location

```bash
# Source all configuration
source ~/.aws-fileflow-env
source ~/fileflow-network-config.sh
source ~/fileflow-data-config.sh
source ~/fileflow-storage-config.sh
source ~/fileflow-ecr-config.sh
source ~/fileflow-alb-config.sh
source ~/fileflow-ecs-config.sh
source ~/fileflow-cloudfront-config.sh
```

### Useful Commands Cheat Sheet

```bash
# View all running ECS tasks
aws ecs list-tasks --cluster $CLUSTER_NAME --region $AWS_REGION

# Tail backend logs
aws logs tail $BACKEND_LOG_GROUP --follow --region $AWS_REGION

# Check ALB targets health
aws elbv2 describe-target-health --target-group-arn $TG_ARN --region $AWS_REGION

# List recent deployments
aws deploy list-deployments --application-name $CODEDEPLOY_APP_NAME --region $AWS_REGION

# Get current costs
aws ce get-cost-and-usage --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost

# SSH into ECS task (with ECS Exec enabled)
aws ecs execute-command --cluster $CLUSTER_NAME --task <task-id> --container backend --interactive --command "/bin/sh"

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

# Force new ECS deployment
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE_NAME --force-new-deployment --region $AWS_REGION
```

### Architecture Decision Records

**Why Fargate over EC2?**
- No server management
- Automatic scaling
- Pay only for what you use
- Easier to maintain

**Why ALB over NLB?**
- HTTP/HTTPS routing
- Path-based routing
- Integration with CodeDeploy
- Content-based routing

**Why CloudFront over S3 alone?**
- Global CDN
- HTTPS support
- Better performance
- DDoS protection

**Why PostgreSQL over MySQL?**
- Better JSON support
- Advanced features
- Strong consistency
- Better for complex queries

---

## Conclusion

You've now deployed a production-ready, scalable application on AWS with:

✅ **Zero-downtime deployments** via Blue/Green strategy  
✅ **Horizontal scaling** with ECS Fargate  
✅ **Global distribution** via CloudFront  
✅ **Automated CI/CD** with GitHub Actions  
✅ **Full observability** with CloudWatch  
✅ **High availability** across multiple AZs  
✅ **Security best practices** with IAM, Security Groups, and encryption  

### Next Steps

1. **Add custom domain** with Route 53 and ACM certificates
2. **Implement rate limiting** in the API
3. **Add WAF rules** to CloudFront for security
4. **Set up disaster recovery** with cross-region replication
5. **Implement caching strategies** with ElastiCache
6. **Add monitoring dashboards** in CloudWatch
7. **Configure alerts** for your team via SNS
8. **Document runbooks** for common operations

### Support & Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CodeDeploy Documentation](https://docs.aws.amazon.com/codedeploy/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Maintained by:** FileFlow Team

