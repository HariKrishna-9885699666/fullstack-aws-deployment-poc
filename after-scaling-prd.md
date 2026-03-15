# PRD — Serverless AWS POC (React + NestJS)

**Working title:** FileFlow POC  
**Version:** 1.0  
**Type:** Proof of Concept / Interview showcase  
**Primary goal:** Demonstrate a small application whose main value is a fully serverless AWS architecture, CI/CD with blue/green deployment, zero-downtime releases, and scalable backend patterns—all within AWS Free Tier (no cost).

---

## 1. Document Status

This PRD defines a deliberately small product that is feature-light but infrastructure-rich.

**Guiding principle:** keep the codebase small, but include enough real product features to justify:
- S3 + CloudFront (Free Tier)
- AWS Lambda (serverless backend & worker)
- API Gateway (serverless routing)
- CodeDeploy blue/green (zero-downtime)
- Redis (ElastiCache, Free Tier)
- SQS (Free Tier)
- RDS PostgreSQL (Free Tier)
- CloudWatch (Free Tier)
- file uploads (S3)

---

## 2. Product Summary

## 2. Product Summary

The application will be a **small document/task portal** built with **React + NestJS**. It is intentionally limited in business complexity so development effort stays low, but it must still include enough real features to justify scalable infrastructure and deployment practices.

Users can sign in, create a small task or document record, upload a file, view a dashboard list, and trigger an asynchronous background job such as thumbnail generation, virus-scan simulation, metadata extraction, or notification processing. The app should look realistic enough to discuss in interviews, but remain simple enough to build in a short time.

The real showcase is not the product domain. The showcase is the **"before vs after" AWS architecture transformation**:
- static frontend moved to **S3 + CloudFront** (Free Tier)
- backend moved from single server to **AWS Lambda + API Gateway** (serverless, Free Tier)
- deployment improved with **CodeDeploy blue/green** (zero-downtime)
- repeated reads optimized with **Redis** (ElastiCache, Free Tier)
- background work decoupled via **SQS** (Free Tier)
- relational data stored in **RDS PostgreSQL** (Free Tier)
- observability added through **CloudWatch** (Free Tier)

---

## 3. Product Vision

Build a compact but realistic production-style application that demonstrates how AWS serverless architecture decisions improve:
- deployment speed
- rollback safety
- downtime reduction (blue/green)
- scalability under traffic spikes (Lambda auto-scaling)
- resilience of backend processing (SQS + Lambda)
- separation of synchronous and asynchronous workloads
- **Zero AWS cost**: All services run within Free Tier limits

This POC should be easy to explain in interviews in 5 to 10 minutes, highlighting serverless, blue/green deployment, and zero AWS cost.

---

## 4. POC Scope Strategy

The product must stay small. The infrastructure story must stay large.

### In Scope
- React frontend
- NestJS backend REST API
- login/auth for demo use
- task/document CRUD
- file upload to S3
- dashboard/list screen
- one background job flow using SQS
- one cached read-heavy endpoint using Redis
- Dockerized backend
- CI/CD pipeline
- blue/green deployment
- CloudWatch logging and alarms

### Out of Scope
- complex RBAC
- advanced search engine
- microservices split into many repos
- video processing
- websockets
- complex billing
- real-time collaboration
- multi-tenant architecture
- advanced analytics pipeline

---

## 5. Proposed Product Concept

### Product Name
**FileFlow POC**

### Simple business concept
A small internal document/task management app where a user can:
- create a task/document item
- upload an attachment
- view uploaded file metadata
- track processing status
- see a simple dashboard

### Why this concept works well
This concept justifies all target infrastructure pieces while keeping business logic small:
- **S3** is justified for uploads
- **SQS** is justified for post-upload async processing
- **Redis** is justified for dashboard caching
- **RDS** is justified for metadata and records
- **CloudFront** is justified for frontend distribution and optionally public file delivery
- **ECS/ALB/CodeDeploy** are justified for backend deployment and scaling

---

## 6. Primary Goals

### Business/portfolio goal
Create a project that is technically credible and resume-friendly.

### Technical goals
1. Demonstrate **low-downtime deployments**.
2. Demonstrate **faster, repeatable CI/CD**.
3. Demonstrate **horizontal scalability**.
4. Demonstrate **read caching**.
5. Demonstrate **async offloading**.
6. Demonstrate **file upload architecture**.
7. Demonstrate **observability and rollback readiness**.

### Resume goal
The final project should support bullets such as:
- redesigned deployment from single-instance hosting to scalable AWS architecture
- implemented blue/green deployment to reduce downtime
- added Redis caching and SQS-based async processing to improve performance and resilience
- separated frontend and backend delivery to improve deployment speed and release safety

---

## 7. Success Criteria

The POC is successful if it meets the following criteria:

### Product success
- user can log in
- user can create/update/delete a task or document record
- user can upload a file
- uploaded file is stored in S3
- async worker updates processing status later
- dashboard displays task/document data

### Platform success
- frontend is hosted on S3 + CloudFront
- backend runs on ECS Fargate behind ALB
- backend image stored in ECR
- blue/green deployment works through CodeDeploy
- one endpoint uses Redis cache
- one flow uses SQS + worker
- CloudWatch logs available for backend services

### Interview success
The system should support explanation of:
- what was wrong in the old architecture
- what changed in the new architecture
- why downtime reduced
- why deployment became faster and safer
- how scalability improved

---

## 8. Target Users

This is a POC, so user modeling is intentionally simple.

### Primary user
A logged-in internal user who uploads a document and tracks processing status.

### Secondary user
Interviewer/reviewer who wants to understand the architecture transformation.

---

## 9. User Stories

### Authentication
- As a user, I want to sign in so I can access my documents/tasks.

### Document/task creation
- As a user, I want to create a simple record with title, description, and status.

### File upload
- As a user, I want to upload a file so it is attached to my record.

### Processing visibility
- As a user, I want to see whether my uploaded file is pending, processing, completed, or failed.

### Dashboard
- As a user, I want to see a list of my recent records and counts by status.

### Reliability
- As an operator, I want the system to deploy with low downtime.

### Scalability
- As an operator, I want the API to scale horizontally during increased traffic.

---

## 10. Feature Set

## 10.1 Authentication

### POC requirement
Use a simple and fast authentication option.

### Recommended implementation
Choose one of these:
- **Option A:** very simple email/password auth stored in DB with JWT
- **Option B:** demo-only fixed user login
- **Option C:** Cognito if you want one more AWS service in the story

### Recommendation
Use **simple JWT auth in NestJS** to keep scope small.

### Why
Auth is not the main showcase. Infrastructure is.

---

## 10.2 Document/Task CRUD

A record contains:
- id
- title
- description
- status
- fileUrl
- fileKey
- processingStatus
- createdAt
- updatedAt
- ownerId

### CRUD operations
- create record
- get single record
- list records
- update record title/description/status
- delete record

### Reason for inclusion
This gives the backend enough realism for a typical API and database story.

---

## 10.3 File Upload

### Requirement
User can upload a file associated with a task/document.

### Recommended approach
Use **pre-signed S3 upload URLs**.

### Flow
1. frontend requests upload URL from NestJS
2. NestJS returns pre-signed URL + object key
3. frontend uploads file directly to S3
4. frontend confirms upload completion to backend
5. backend creates or updates DB record
6. backend pushes processing message to SQS

### Why this is the best POC approach
- keeps backend lighter
- avoids routing large files through NestJS container
- demonstrates scalable upload design
- gives a strong architecture explanation in interviews

### File constraints
- allowed types: pdf, png, jpg, txt
- max file size: 5 MB for POC

---

## 10.4 Async Background Processing

### Requirement
After upload, file processing should happen asynchronously.

### POC-friendly processing examples
Choose only one or two:
- extract metadata
- generate thumbnail for image
- simulate virus scan result
- send upload-complete notification
- parse basic text stats

### Recommended implementation
Use **SQS** with a small **worker process**.

### Flow
1. upload confirmed
2. backend writes DB record with `processingStatus = PENDING`
3. backend publishes SQS message
4. worker consumes message
5. worker performs mock processing
6. worker updates DB record to `COMPLETED` or `FAILED`

### Interview value
This clearly shows how long-running work was removed from the API request cycle.

---

## 10.5 Dashboard and List View

### Requirement
User can view:
- list of recent documents/tasks
- count by processing status
- latest upload states

### Recommended dashboard widgets
Keep it small:
- total records
- pending processing count
- completed count
- failed count
- recent 10 records table

### Caching requirement
The dashboard summary endpoint must use **Redis** caching.

### Cache behavior
- cache TTL: 30 to 60 seconds
- invalidate on create/update/delete/upload completion if needed
- acceptable for counts to be slightly stale in POC

### Interview value
Lets you explain how caching reduces repeated DB reads for read-heavy endpoints.

---

## 11. Non-Functional Requirements

## 11.1 Scalability
The application should support horizontal backend scaling without application redesign.

Requirements:
- backend must be stateless
- sessions should not depend on in-memory container state
- files must not be stored on container filesystem
- multiple backend tasks must run safely behind ALB

## 11.2 Availability
The application should support low-downtime deployments.

Requirements:
- ALB health checks
- blue/green deployment
- minimum healthy task handling during release
- rollback path through previous ECS task definition/image

## 11.3 Performance
- dashboard endpoint should be cached
- frontend assets should be CDN-delivered
- file upload should bypass backend via pre-signed URL
- DB queries should be indexed appropriately

## 11.4 Observability
- all API logs to CloudWatch
- worker logs to CloudWatch
- alarms for API 5xx rate, task failures, or queue depth if possible

## 11.5 Security
- private S3 bucket for uploads
- least-privilege IAM roles
- secure environment variable management
- signed URLs for file upload/download where required

---

## 12. Technical Architecture

## 12.1 Frontend
### Stack
- React
- Vite
- hosted on S3
- distributed via CloudFront

### Responsibilities
- auth UI
- dashboard UI
- create/edit record UI
- upload file UI
- polling status UI for processing updates

### Notes
Keep the UI clean but minimal. This is not a design-heavy project.

---

## 12.2 Backend API
### Stack
- NestJS
- REST API
- Dockerized
- deployed on ECS Fargate

### Responsibilities
- auth endpoints
- record CRUD
- pre-signed upload generation
- upload completion handling
- dashboard summary endpoint
- publish processing jobs to SQS
- read/write RDS
- read/write Redis cache

---

## 12.3 Worker
### Stack
- NestJS worker module or small Node worker
- Dockerized
- runs as separate ECS service or scheduled task depending on implementation choice

### Responsibilities
- consume SQS messages
- perform file post-processing
- update DB status
- log failures

### Recommendation
Use a **separate lightweight worker container** for clarity in architecture.

---

## 12.4 Database
### Stack
- RDS PostgreSQL

### Tables
#### users
- id
- email
- passwordHash
- createdAt

#### records
- id
- ownerId
- title
- description
- status
- fileKey
- fileUrl
- processingStatus
- createdAt
- updatedAt

#### processing_jobs (optional)
- id
- recordId
- state
- errorMessage
- createdAt
- updatedAt

### Minimal indexing
- records(ownerId, createdAt desc)
- records(processingStatus)
- records(status)

---

## 12.5 Cache
### Stack
- ElastiCache Redis

### Use cases
- dashboard summary cache
- recent records cache optionally
- JWT denylist or session helper only if required

### Recommendation
Use Redis only for **one or two obvious cases**. Keep codebase small.

---

## 12.6 Queue
### Stack
- Amazon SQS

### Queue purpose
Handle post-upload processing asynchronously.

### Message payload example
- recordId
- fileKey
- uploadedBy
- requestedAt
- processingType

### Failure handling
- retry policy
- dead-letter queue optional if time permits

### Recommendation
If time allows, add DLQ because it improves your interview story.

---

## 12.7 Storage
### Stack
- S3 bucket for uploads

### Bucket design
- private bucket
- object keys prefixed by userId/date or environment
- optional second bucket/prefix for thumbnails/processed assets

### Reason
Shows correct separation of file storage from compute containers.

---

## 13. API Requirements

## 13.1 Auth API
- `POST /auth/login`
- `POST /auth/register` (optional)
- `GET /auth/me`

## 13.2 Record API
- `POST /records`
- `GET /records`
- `GET /records/:id`
- `PATCH /records/:id`
- `DELETE /records/:id`

## 13.3 Upload API
- `POST /uploads/presign`
- `POST /uploads/complete`

## 13.4 Dashboard API
- `GET /dashboard/summary`

## 13.5 Health API
- `GET /health`
- `GET /ready`

### Note
`/health` and `/ready` are important for ALB/ECS deployment behavior and interview explanation.

---

## 14. Detailed Functional Flows

## 14.1 Login flow
1. user enters credentials
2. frontend calls auth API
3. backend returns JWT
4. frontend stores token in memory or secure storage approach
5. authenticated pages can call API

## 14.2 Create record flow
1. user opens create page
2. enters title/description
3. frontend calls `POST /records`
4. backend stores record in RDS
5. frontend shows created item

## 14.3 Upload flow
1. user clicks upload on a record
2. frontend requests pre-signed upload URL
3. backend creates S3 object key and signed URL
4. frontend uploads directly to S3
5. frontend calls upload complete API
6. backend updates record metadata in RDS
7. backend publishes SQS message
8. worker processes file asynchronously
9. frontend polls or refreshes to show updated processing status

## 14.4 Dashboard flow
1. user opens dashboard
2. frontend calls summary endpoint
3. backend checks Redis
4. if cache hit, return cached summary
5. if miss, query RDS and populate Redis
6. return summary

## 14.5 Deployment flow
1. developer pushes backend code
2. CI builds Docker image
3. image pushed to ECR
4. deployment initiated to ECS via CodeDeploy blue/green
5. new task set starts
6. ALB health checks pass
7. traffic shifts to new task set
8. previous version retained temporarily for rollback

This deployment flow should be explicitly documented in the repo.

---

## 15. AWS Infrastructure Requirements

## 15.1 Frontend Infrastructure
- S3 bucket for React static assets
- CloudFront distribution
- cache invalidation on deploy
- optional Route 53 DNS

## 15.2 Backend Infrastructure
- ECS cluster
- ECS Fargate service for API
- ALB
- target groups
- security groups
- task execution role
- task role
- autoscaling policy

## 15.3 Deployment Infrastructure
- ECR repository for API image
- CodeDeploy app + deployment group for ECS blue/green
- CI workflow using GitHub Actions or CodePipeline

## 15.4 Data Infrastructure
- RDS PostgreSQL
- ElastiCache Redis
- SQS queue
- optional DLQ
- S3 uploads bucket

## 15.5 Monitoring Infrastructure
- CloudWatch log groups
- CloudWatch alarms
- optional dashboard for request count, errors, CPU, memory, queue depth

---

## 16. CI/CD Requirements

### Frontend CI/CD
- on merge to main, build React app
- upload build output to S3
- invalidate CloudFront paths

### Backend CI/CD
- on merge to main, build Docker image
- tag image using commit SHA
- push image to ECR
- update ECS task definition
- trigger CodeDeploy blue/green deployment

### Why this matters
This is one of the main portfolio value points. The CI/CD pipeline is part of the product.

---

## 17. Deployment and Scaling Requirements

### Blue/Green deployment
Must support:
- new task set launch
- health verification
- controlled traffic switch
- rollback if health checks fail

### Autoscaling
For POC, configure a simple scaling policy:
- scale out when CPU > 60% for N minutes
- scale in when CPU < 30% for N minutes

### Initial capacity
- API service minimum 1 or 2 tasks depending on budget constraints
- desired count can remain low in POC, but architecture should support scaling

### Interview note
If free-tier or budget limits prevent large scale testing, explain that the architecture supports scale even if the POC runs at low actual capacity.

---

## 18. Security Requirements

- API behind HTTPS
- CloudFront via HTTPS
- private S3 uploads bucket
- least-privilege IAM for ECS tasks
- RDS not publicly exposed if possible
- secrets in environment/secret manager approach
- file type validation on backend
- file size validation on client and backend
- authentication on all protected APIs

---

## 19. Logging, Monitoring, and Alerting

### Logs
- API request logs
- error logs
- worker processing logs
- deployment logs

### Metrics to track
- API response time
- ALB 5xx
- ECS CPU/memory
- SQS queue depth
- worker failure count
- cache hit/miss count if possible

### Alarms
At least one or two alarms should be configured for demo credibility:
- high 5xx response alarm
- ECS task unhealthy alarm
- queue depth alarm or DLQ message alarm

---

## 20. Data Model Requirements

### Record statuses
Business status:
- NEW
- IN_PROGRESS
- DONE

Processing status:
- PENDING
- PROCESSING
- COMPLETED
- FAILED

### Why separate these
It helps explain that application state and technical processing state are different concerns.

---

## 21. POC Constraints

This project must be intentionally optimized for **low code volume**.

### Constraints
- avoid overengineering
- use monorepo only if it simplifies setup
- avoid multiple backend microservices
- keep entities minimal
- support only one main asynchronous workflow
- only one cache-heavy endpoint required
- no advanced domain logic

### Preferred codebase shape
- one React app
- one NestJS API app
- one worker folder/module
- one shared deployment folder for infra and CI

---

## 22. Recommended Repository Structure

```text
root/
  frontend/               # React app
  backend/                # NestJS API
  worker/                 # SQS worker (or backend worker module)
  infra/                  # IaC / deployment manifests / scripts
  .github/workflows/      # CI/CD pipelines
  docs/                   # architecture, deployment, before-vs-after notes
```

### Alternative
You may also keep backend and worker in one NestJS repo if that reduces code size.

---

## 23. Suggested Development Phases

## Phase 1 — Core Product
Build only:
- auth
- CRUD
- file upload to S3
- basic dashboard
- RDS persistence

## Phase 2 — Async Processing
Add:
- SQS queue
- worker
- processing status updates

## Phase 3 — Performance and Scale
Add:
- Redis cache for summary endpoint
- health/readiness endpoints
- stateless API cleanup

## Phase 4 — Containerization and Deployment
Add:
- Dockerfile
- ECR
- ECS Fargate
- ALB
- CloudWatch logs

## Phase 5 — Safe Releases
Add:
- CodeDeploy blue/green
- deployment automation
- rollback validation

## Phase 6 — Polish for Interview
Add:
- architecture diagram
- before vs after notes
- deployment screenshots
- metrics summary

---

## 24. Acceptance Criteria

The POC will be accepted when all of the following are true:

### Functional
- user can authenticate
- user can create a record
- user can upload a file
- uploaded file lands in S3
- processing status changes asynchronously after queue handling
- dashboard shows counts and recent items

### Infrastructure
- frontend served through CloudFront
- API reachable through ALB
- API runs on ECS Fargate
- deployment artifact stored in ECR
- blue/green deployment path exists and works
- Redis used by at least one endpoint
- SQS used by at least one async workflow
- CloudWatch logs available

### Storytelling
- repo contains before/after architecture explanation
- repo contains deployment flow explanation
- repo contains measurable benefits section even if numbers are estimated from POC testing

---

## 25. Risks and Mitigations

### Risk 1: Project becomes too big
**Mitigation:** keep domain minimal and infrastructure-focused.

### Risk 2: AWS setup takes more time than app development
**Mitigation:** finish app features early and keep UI basic.

### Risk 3: Too many services make debugging harder
**Mitigation:** introduce services in phases and document each layer.

### Risk 4: Cache invalidation complexity
**Mitigation:** cache only summary endpoints with short TTL.

### Risk 5: Queue worker complexity
**Mitigation:** use one queue, one worker, one simple job type.

---

## 26. Demo Scenario

A good end-to-end demo should look like this:

1. log in
2. create a document/task
3. upload a file using pre-signed S3 upload
4. observe record enters `PENDING` state
5. background worker processes queue message
6. refresh dashboard and see `COMPLETED`
7. explain dashboard endpoint is Redis-cached
8. explain frontend is on S3 + CloudFront
9. explain backend runs on ECS behind ALB
10. explain blue/green deployment reduces downtime

This is enough for a strong interview demonstration.

---

## 27. Metrics to Capture for Interview Discussion

Even for a POC, collect a few numbers:
- frontend deploy time before vs after
- backend deploy time before vs after
- whether deployment causes visible interruption before vs after
- dashboard response time without cache vs with cache
- API response time with sync processing vs async queue

Even directional improvement is useful.

---

## 28. Final Recommendation

This POC should not aim to impress through complex business logic. It should impress through **clean architecture decisions, scalable deployment patterns, and strong explanation quality**.

The ideal final output is a small app with:
- basic CRUD
- S3 file upload
- one queue-based async job
- one Redis-cached endpoint
- production-style AWS deployment
- blue/green release flow

That combination gives maximum resume and interview value for minimum product complexity.

