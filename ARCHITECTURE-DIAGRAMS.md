# FileFlow POC - AWS Architecture Diagram

## High-Level Architecture

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
    │   (CDN Distribution)   │        │     (DNS - Optional)      │
    │                        │        └───────────────────────────┘
    │  - Global edge caching │
    │  - HTTPS termination   │
    │  - DDoS protection     │
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
                                     │  Application Load       │
                                     │  Balancer (ALB)         │◄─── HTTP/HTTPS
                                     │                         │     from users
                                     │  - Health checks        │
                                     │  - SSL termination      │
                                     │  - Path routing         │
                                     └────────┬────────────────┘
                                              │
                                              │ Port 3000
                                              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                          Amazon VPC (10.0.0.0/16)                         │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Public Subnets (2 AZs)                          │  │
│  │                                                                    │  │
│  │  ┌──────────────────┐               ┌──────────────────┐          │  │
│  │  │  Public Subnet 1 │               │  Public Subnet 2 │          │  │
│  │  │  (10.0.1.0/24)   │               │  (10.0.2.0/24)   │          │  │
│  │  │                  │               │                  │          │  │
│  │  │  - NAT Gateway   │               │  - ALB instances │          │  │
│  │  └──────────────────┘               └──────────────────┘          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                   Private Subnets (2 AZs)                          │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │           ECS Fargate Cluster                               │  │  │
│  │  │                                                             │  │  │
│  │  │   ┌───────────────────┐      ┌───────────────────┐         │  │  │
│  │  │   │  Backend Service  │      │  Worker Service   │         │  │  │
│  │  │   │                   │      │                   │         │  │  │
│  │  │   │  ┌─────┐ ┌─────┐ │      │  ┌─────┐          │         │  │  │
│  │  │   │  │Task1│ │Task2│ │      │  │Task1│          │         │  │  │
│  │  │   │  └─────┘ └─────┘ │      │  └─────┘          │         │  │  │
│  │  │   │                   │      │                   │         │  │  │
│  │  │   │  Auto-scaling:    │      │  Processes SQS    │         │  │  │
│  │  │   │  Min: 2, Max: 10  │      │  messages         │         │  │  │
│  │  │   └───────────────────┘      └───────────────────┘         │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌──────────────────┐               ┌──────────────────┐          │  │
│  │  │ Private Subnet 1 │               │ Private Subnet 2 │          │  │
│  │  │ (10.0.11.0/24)   │               │ (10.0.12.0/24)   │          │  │
│  │  │                  │               │                  │          │  │
│  │  │ - ECS Tasks      │               │ - ECS Tasks      │          │  │
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

## Container & Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Container & CI/CD Pipeline                        │
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
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │        │
│  │  │   Backend    │  │   Worker     │  │   Frontend   │  │        │
│  │  │   CI/CD      │  │   CI/CD      │  │   CI/CD      │  │        │
│  │  │              │  │              │  │              │  │        │
│  │  │ 1. Build     │  │ 1. Build     │  │ 1. Install   │  │        │
│  │  │ 2. Test      │  │ 2. Test      │  │ 2. Build     │  │        │
│  │  │ 3. Push ECR  │  │ 3. Push ECR  │  │ 3. S3 Sync   │  │        │
│  │  │ 4. Deploy    │  │ 4. Deploy    │  │ 4. Invalidate│  │        │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │        │
│  └─────────┼──────────────────┼──────────────────┼──────────┘        │
│            │                  │                  │                   │
│            ▼                  ▼                  ▼                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Amazon ECR     │  │  Amazon ECR     │  │  Amazon S3      │     │
│  │  (Backend Repo) │  │  (Worker Repo)  │  │  (Frontend)     │     │
│  │                 │  │                 │  │                 │     │
│  │  - Auto scan    │  │  - Auto scan    │  │  + CloudFront   │     │
│  │  - Lifecycle    │  │  - Lifecycle    │  │    invalidation │     │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘     │
│           │                    │                                    │
│           └──────────┬─────────┘                                    │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────────────────┐          │
│  │          AWS CodeDeploy (Blue/Green)                 │          │
│  │                                                      │          │
│  │  Phase 1: Deploy new task definition (Green)        │          │
│  │  Phase 2: Route test traffic                        │          │
│  │  Phase 3: Health check validation                   │          │
│  │  Phase 4: Shift 100% traffic to Green               │          │
│  │  Phase 5: Terminate Blue tasks                      │          │
│  │  Phase 6: Auto-rollback on failure                  │          │
│  └──────────────────────────────────────────────────────┘          │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         ECS Fargate Services (Updated)               │          │
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
                    Application Load Balancer
                          │
                          │ 3. Forward to backend
                          ▼
                    ECS Backend Task
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
ALB ──────► Backend API
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
           Backend API
                │
                ├─► 6a. Update record in RDS
                │        (status: PENDING)
                │
                └─► 6b. Send message to SQS
                         │
                         │ 7. Worker polls SQS
                         ▼
                    Worker ECS Task
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
ALB ──────► Backend API
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
                    Backend API
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
│  │ - Task execution role                                  │     │
│  │ - Task role (application permissions)                  │     │
│  │ - S3 bucket policies                                   │     │
│  │ - CloudFront OAI                                       │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 5: Monitoring & Detection                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ - AWS GuardDuty (threat detection)                     │     │
│  │ - CloudWatch Logs & Metrics                            │     │
│  │ - CloudWatch Alarms                                    │     │
│  │ - Access logging (ALB, S3, CloudFront)                 │     │
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
│  │  /ecs/fileflow-backend     ──► API logs               │     │
│  │  /ecs/fileflow-worker      ──► Worker logs            │     │
│  │  /aws/vpc/fileflow         ──► VPC Flow Logs          │     │
│  │  /aws/lambda/*             ──► Lambda logs (optional)  │     │
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

## Cost Breakdown by Service

```
┌──────────────────────────────────────────────────────────────────┐
│              Monthly Cost Estimate (~$124/month)                 │
│                                                                  │
│  ┌─────────────────────┬────────────┬──────────────────────┐     │
│  │ Service             │ Monthly $  │ Configuration        │     │
│  ├─────────────────────┼────────────┼──────────────────────┤     │
│  │ ECS Fargate (API)   │   ~$15     │ 2×0.25vCPU, 0.5GB   │     │
│  │ ECS Fargate (Worker)│   ~$7      │ 1×0.25vCPU, 0.5GB   │     │
│  │ RDS PostgreSQL      │   ~$15     │ db.t3.micro         │     │
│  │ ElastiCache Redis   │   ~$12     │ cache.t3.micro      │     │
│  │ ALB                 │   ~$20     │ 1 ALB               │     │
│  │ NAT Gateway         │   ~$35     │ 1 NAT + data        │     │
│  │ S3 Storage          │   ~$5      │ <100GB + requests   │     │
│  │ CloudFront          │   ~$10     │ <1TB transfer       │     │
│  │ CloudWatch          │   ~$5      │ Logs + metrics      │     │
│  │ SQS                 │   Free     │ <1M requests        │     │
│  │ ECR                 │   Free     │ <500MB storage      │     │
│  ├─────────────────────┼────────────┼──────────────────────┤     │
│  │ TOTAL               │   ~$124    │                      │     │
│  └─────────────────────┴────────────┴──────────────────────┘     │
│                                                                  │
│  💡 Cost Optimization Tips:                                      │
│  • Use Fargate Spot for worker (70% savings)                     │
│  • Remove NAT Gateway in dev (use VPC endpoints)                 │
│  • Enable S3 Intelligent Tiering                                 │
│  • Use CloudWatch log retention policies                         │
│  • Schedule scale-down during off-hours                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

**Document Purpose:** Visual reference for FileFlow AWS architecture  
**For Detailed Instructions:** See `INFRASTRUCTURE-CICD-GUIDE.md`  
**For Commands:** See `QUICK-REFERENCE.md`
