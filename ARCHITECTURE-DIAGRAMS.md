# FileFlow POC - AWS Serverless Architecture Diagram

## High-Level Serverless Architecture (AWS Free Tier)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          Internet / Users                               │
│                                                                         │
└────────────────┬────────────────────────────────┬───────────────────────┘
                 │                                 │
                 │ HTTPS                           │ HTTPS
                 ▼                                 ▼
    ┌────────────────────────┐        ┌───────────────────────────┐
     │   Amazon CloudFront    │        │      Amazon Route 53      │
     │   (CDN Distribution, Free Tier)   │        │     (DNS - Optional)      │
     │                        │        └───────────────────────────┘
     │  - Global edge caching │
     │  - HTTPS termination   │
     │  - DDoS protection     │
     │  - Zero cost (Free Tier) │
    └────────────┬───────────┘
                 │
                 │ Origin request
                 ▼
    ┌────────────────────────┐
    │    Amazon S3 Bucket    │
    │   (Frontend Assets)    │
    │                        │
    │  - React build files   │
    │  - Static assets       │
    │  - Versioning enabled  │
    └────────────────────────┘


                                     ┌─────────────────────────┐
                                     │  Amazon API Gateway     │
                                     │  (REST API)             │◄─── HTTP/HTTPS
                                     │                         │     from users
                                     │  - Request routing      │
                                     │  - Rate limiting        │
                                     │  - Auth integration     │
                                     └────────┬────────────────┘
                                              │
                                              │ Trigger
                                              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                          Amazon VPC (10.0.0.0/16)                         │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                   Private Subnets (2 AZs)                          │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │             AWS Lambda Functions                            │  │  │
│  │  │                                                             │  │  │
│  │  │   ┌───────────────────┐      ┌───────────────────┐         │  │  │
│  │  │   │  Backend Lambda   │      │  Worker Lambda    │         │  │  │
│  │  │   │                   │      │                   │         │  │  │
│  │  │   │  Auto-scaling:    │      │  Event-driven:    │         │  │  │
│  │  │   │  0 to thousands   │      │  Processes SQS    │         │  │  │
│  │  │   │  concurrent       │      │  messages         │         │  │  │
│  │  │   └───────────────────┘      └───────────────────┘         │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌──────────────────┐               ┌──────────────────┐          │  │
│  │  │ Private Subnet 1 │               │ Private Subnet 2 │          │  │
│  │  │ (10.0.11.0/24)   │               │ (10.0.12.0/24)   │          │  │
│  │  │                  │               │                  │          │  │
│  │  │ - Lambda ENIs    │               │ - Lambda ENIs    │          │  │
│  │  │ - RDS Primary    │               │ - RDS Standby    │          │  │
│  │  │ - Redis Node     │               │                  │          │  │
│  │  └──────────────────┘               └──────────────────┘          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

```

## Data Layer Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Data & Storage Layer                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Amazon RDS PostgreSQL                                      │    │
│  │  ┌──────────────────┐              ┌──────────────────┐     │    │
│  │  │  Primary (AZ-1)  │─────sync────►│ Standby (AZ-2)   │     │    │
│  │  │  db.t3.micro     │              │  db.t3.micro     │     │    │
│  │  │  - Auto backups  │              │  - Auto failover │     │    │
│  │  │  - 20GB storage  │              │                  │     │    │
│  │  └──────────────────┘              └──────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Amazon ElastiCache Redis                                   │    │
│  │  ┌──────────────────┐                                       │    │
│  │  │  Redis Node      │                                       │    │
│  │  │  cache.t3.micro  │                                       │    │
│  │  │  - 5-day backups │                                       │    │
│  │  │  - Dashboard cache│                                       │    │
│  │  └──────────────────┘                                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Amazon S3 Buckets                                          │    │
│  │                                                             │    │
│  │  ┌──────────────────┐         ┌──────────────────┐         │    │
│  │  │ Frontend Bucket  │         │ Uploads Bucket   │         │    │
│  │  │ (Public + OAI)   │         │ (Private)        │         │    │
│  │  │                  │         │                  │         │    │
│  │  │ - React SPA      │         │ - User files     │         │    │
│  │  │ - Versioned      │         │ - Encrypted      │         │    │
│  │  │ - CDN origin     │         │ - Lifecycle      │         │    │
│  │  └──────────────────┘         └──────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Amazon SQS                                                 │    │
│  │                                                             │    │
│  │  ┌──────────────────┐         ┌──────────────────┐         │    │
│  │  │ Processing Queue │────────►│  Dead Letter     │         │    │
│  │  │                  │  retry  │  Queue (DLQ)     │         │    │
│  │  │ - Max 3 retries  │         │ - Failed msgs    │         │    │
│  │  │ - 5min visibility│         │                  │         │    │
│  │  └──────────────────┘         └──────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Serverless & Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Serverless CI/CD Pipeline (Blue/Green, Free Tier) │
│                                                                      │
│  ┌─────────────┐                                                     │
│  │   GitHub    │                                                     │
│  │ Repository  │                                                     │
│  │             │                                                     │
│  │ - Backend   │                                                     │
│  │ - Worker    │                                                     │
│  │ - Frontend  │                                                     │
│  └──────┬──────┘                                                     │
│         │ Git push (main branch)                                     │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │          GitHub Actions Workflows                       │        │
│  │                                                         │        │
│  │  ┌──────────────┐                 ┌──────────────┐     │        │
│  │  │ Serverless   │                 │   Frontend   │     │        │
│  │  │ CI/CD        │                 │   CI/CD      │     │        │
│  │  │ (Blue/Green) │                 │ (Blue/Green) │     │        │
│  │  │ 1. Setup     │                 │ 1. Install   │     │        │
│  │  │ 2. Install   │                 │ 2. Build     │     │        │
│  │  │ 3. Run deploy│                 │ 3. S3 Sync   │     │        │
│  │  │              │                 │ 4. Invalidate│     │        │
│  │  └──────┬───────┘                 └──────┬───────┘     │        │
│  └─────────┼────────────────────────────────┼─────────────┘        │
│            │                                │                      │
│            ▼                                ▼                      │
│  ┌─────────────────┐               ┌─────────────────┐             │
│  │ Serverless      │               │  Amazon S3      │             │
│  │ Framework       │               │  (Frontend, Free Tier) │             │
│  │ (AWS Lambda,    │               │  + CloudFront   │             │
│  │ API Gateway, Free Tier) │               │    invalidate      │             │
│  │                 │               │                 │             │
│  └────────┬────────┘               └─────────────────┘             │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │          AWS Lambda (Backend & Worker, Free Tier)    │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Request Flow Diagrams

### User Authentication Flow
```
User Browser
     │
     │ 1. POST /auth/login
     ▼
CloudFront CDN ──────► React App
                          │
                          │ 2. POST /auth/login
                          ▼
                    API Gateway
                          │
                          │ 3. Forward to backend
                          ▼
                    Backend Lambda
                          │
                          │ 4. Verify credentials
                          ▼
                    RDS PostgreSQL
                          │
                          │ 5. User found
                          ▼
                    JWT Token Generated
                          │
                          │ 6. Return token + user data
                          ▼
                    React App (store in memory)
```

### File Upload Flow
```
User Browser
     │
     │ 1. Request upload URL
     ▼
API Gateway ──────► Backend Lambda
                │
                │ 2. Generate pre-signed S3 URL
                ▼
           S3 SDK (Create signed URL)
                │
                │ 3. Return URL to frontend
                ▼
           React App
                │
                │ 4. Upload file directly to S3
                ▼
           Amazon S3 (Uploads Bucket)
                │
                │ 5. Notify backend of completion
                ▼
           Backend Lambda
                │
                ├─► 6a. Update record in RDS
                │        (status: PENDING)
                │
                └─► 6b. Send message to SQS
                         │
                         │ 7. Trigger SQS event
                         ▼
                    Worker Lambda
                         │
                         │ 8. Process file
                         │    - Extract metadata
                         │    - Validate
                         ▼
                    Update RDS
                    (status: COMPLETED)
```

### Dashboard Load Flow (With Caching)
```
User Browser
     │
     │ 1. GET /dashboard/summary
     ▼
API Gateway ──────► Backend Lambda
                │
                │ 2. Check cache
                ▼
           Redis Cache
                │
                ├─► Cache HIT ──► Return cached data (fast!)
                │
                └─► Cache MISS
                         │
                         │ 3. Query database
                         ▼
                    RDS PostgreSQL
                         │
                         │ 4. Aggregate data
                         ▼
                    Backend Lambda
                         │
                         ├─► 5a. Store in cache (TTL: 60s)
                         │
                         └─► 5b. Return to frontend
```

## Security Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                      Security Architecture                       │
│                                                                  │
│  Layer 1: Network Security                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - VPC isolation                                        │     │
│  │ - Public/Private subnet separation                     │     │
│  │ - Security groups (least privilege)                    │     │
│  │ - NACLs (network ACLs)                                 │     │
│  │ - VPC Flow Logs enabled                                │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 2: Application Security                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - JWT authentication                                   │     │
│  │ - Request validation                                   │     │
│  │ - Input sanitization                                   │     │
│  │ - CORS configuration                                   │     │
│  │ - Rate limiting (optional)                             │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 3: Data Security                                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - RDS encryption at rest (AES-256)                     │     │
│  │ - S3 encryption at rest                                │     │
│  │ - Secrets Manager for credentials                      │     │
│  │ - TLS 1.2+ for data in transit                         │     │
│  │ - Database not publicly accessible                     │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 4: Access Control                                        │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - IAM roles (least privilege)                          │     │
│  │ - Lambda execution role                                │     │
│  │ - API Gateway Resource Policies                        │     │
│  │ - S3 bucket policies                                   │     │
│  │ - CloudFront OAI                                       │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 5: Monitoring & Detection                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - AWS GuardDuty (threat detection)                     │     │
│  │ - CloudWatch Logs & Metrics                            │     │
│  │ - CloudWatch Alarms                                    │     │
│  │ - Access logging (API Gateway, S3, CloudFront)         │     │
│  │ - AWS Config (compliance)                              │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability Stack

```
┌──────────────────────────────────────────────────────────────────┐
│                   CloudWatch Architecture                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                    Log Groups                          │     │
│  │                                                        │     │
│  │  /aws/lambda/fileflow*     ──► API logs               │     │
│  │  /aws/lambda/fileflow*     ──► Worker logs            │     │
│  │  /aws/vpc/fileflow         ──► VPC Flow Logs          │     │
│  │  /aws/apigateway/*         ──► Gateway logs            │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              CloudWatch Logs Insights                  │     │
│  │                                                        │     │
│  │  - Error analysis                                      │     │
│  │  - Performance metrics                                 │     │
│  │  - Custom queries                                      │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                Metric Filters                          │     │
│  │                                                        │     │
│  │  - 5XX errors → Alarm                                  │     │
│  │  - Response time > 1s → Metric                         │     │
│  │  - Failed logins → Security event                      │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │               CloudWatch Alarms                        │     │
│  │                                                        │     │
│  │  ⚠️  High CPU (>80%)                                   │     │
│  │  ⚠️  5XX errors (>10 in 5min)                          │     │
│  │  ⚠️  Unhealthy targets                                 │     │
│  │  ⚠️  Queue depth (>100 messages)                       │     │
│  │  ⚠️  DLQ messages (>1)                                 │     │
│  │  ⚠️  RDS storage (<2GB)                                │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              SNS Topic (Alerts)                        │     │
│  │                                                        │     │
│  │  → Email notifications                                 │     │
│  │  → SMS notifications (optional)                        │     │
│  │  → Slack webhook (optional)                            │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Cost Breakdown by Service (AWS Free Tier)

```
┌──────────────────────────────────────────────────────────────────┐
│              Monthly Cost Estimate ($0/month, Free Tier)         │
│                                                                  │
│  ┌─────────────────────┬────────────┬──────────────────────┐     │
│  │ Service             │ Monthly $  │ Configuration        │     │
│  ├─────────────────────┼────────────┼──────────────────────┤     │
│  │ AWS Lambda (API)    │   $0       │ Free Tier (<1M req)  │     │
│  │ AWS Lambda (Worker) │   $0       │ Free Tier (<1M req)  │     │
│  │ RDS PostgreSQL      │   $0       │ Free Tier db.t3.micro│     │
│  │ ElastiCache Redis   │   $0       │ Free Tier t4g.micro  │     │
│  │ API Gateway         │   $0       │ Free Tier (<1M req)  │     │
│  │ S3 Storage          │   $0       │ Free Tier (<5GB)     │     │
│  │ CloudFront          │   $0       │ Free Tier (<1TB)     │     │
│  │ CloudWatch          │   $0       │ Free Tier (<5GB logs)│     │
│  │ SQS                 │   $0       │ Free Tier (<1M req)  │     │
│  ├─────────────────────┼────────────┼──────────────────────┤     │
│  │ TOTAL               │   $0       │                      │     │
│  └─────────────────────┴────────────┴──────────────────────┘     │
│                                                                  │
│  💡 Cost Optimization Tips:                                      │
│  • Lambda scales natively to zero, $0 idle cost                  │
│  • Limit retention on CloudWatch logs to 1-3 days to save GBs    │
│  • All services are Free Tier eligible, so total AWS cost is $0  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

**Document Purpose:** Visual reference for FileFlow AWS architecture  
**For Detailed Instructions:** See `INFRASTRUCTURE-CICD-GUIDE.md`  
**For Commands:** See `QUICK-REFERENCE.md`
