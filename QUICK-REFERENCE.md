# Infrastructure & CI/CD Quick Reference Card

## 🚀 Essential Commands

### AWS CLI Setup
```bash
aws configure
aws sts get-caller-identity
```

### Load All Configurations
```bash
source ~/.aws-fileflow-env
source ~/fileflow-network-config.sh
source ~/fileflow-data-config.sh
source ~/fileflow-storage-config.sh
source ~/fileflow-ecr-config.sh
source ~/fileflow-alb-config.sh
source ~/fileflow-ecs-config.sh
source ~/fileflow-cloudfront-config.sh
```

## 📊 Monitoring

### View ECS Tasks
```bash
aws ecs list-tasks --cluster $CLUSTER_NAME --region $AWS_REGION
```

### Tail Logs
```bash
# Backend logs
aws logs tail $BACKEND_LOG_GROUP --follow --region $AWS_REGION

# Worker logs
aws logs tail $WORKER_LOG_GROUP --follow --region $AWS_REGION
```

### Check Health
```bash
# API health
curl http://$ALB_DNS/health

# Frontend
curl -I https://$CF_DOMAIN
```

### View Metrics
```bash
# CloudWatch dashboard
https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${PROJECT_NAME}-dashboard
```

## 🔄 Deployment

### Force New Deployment
```bash
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $BACKEND_SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION
```

### Check Deployment Status
```bash
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].deployments'
```

### Invalidate CloudFront
```bash
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"
```

## 🔙 Rollback

### Rollback ECS Service
```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix ${PROJECT_NAME}-backend \
  --sort DESC \
  --region $AWS_REGION

# Rollback to previous
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $BACKEND_SERVICE_NAME \
  --task-definition <previous-task-def-arn> \
  --force-new-deployment \
  --region $AWS_REGION
```

### Rollback Frontend
```bash
# List versions
aws s3api list-object-versions \
  --bucket $FRONTEND_BUCKET \
  --prefix index.html

# Restore version
aws s3api copy-object \
  --bucket $FRONTEND_BUCKET \
  --copy-source $FRONTEND_BUCKET/index.html?versionId=<version-id> \
  --key index.html
```

## 🐛 Troubleshooting

### Check ALB Target Health
```bash
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION
```

### View Task Stopped Reason
```bash
TASK_ID=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $BACKEND_SERVICE_NAME \
  --desired-status STOPPED \
  --max-items 1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ID \
  --query 'tasks[0].stoppedReason'
```

### Check Security Group Rules
```bash
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=$ECS_SG_ID" \
  --region $AWS_REGION
```

### ECS Exec (SSH into container)
```bash
aws ecs execute-command \
  --cluster $CLUSTER_NAME \
  --task <task-id> \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

## 💰 Cost Management

### View Current Costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Check Running Resources
```bash
# ECS tasks
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $BACKEND_SERVICE_NAME $WORKER_SERVICE_NAME \
  --query 'services[].[serviceName,runningCount,desiredCount]'

# RDS status
aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass]'

# NAT Gateway (expensive!)
aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=$VPC_ID" \
  --query 'NatGateways[].[NatGatewayId,State]'
```

## 🔐 Security

### View Secrets
```bash
aws secretsmanager list-secrets \
  --filters Key=name,Values=${PROJECT_NAME}/ \
  --region $AWS_REGION
```

### Check IAM Role Permissions
```bash
aws iam simulate-principal-policy \
  --policy-source-arn $TASK_ROLE_ARN \
  --action-names s3:GetObject sqs:SendMessage \
  --region $AWS_REGION
```

### View VPC Flow Logs
```bash
aws logs tail /aws/vpc/${PROJECT_NAME} \
  --follow \
  --region $AWS_REGION
```

## 📦 Build & Push

### Build and Push Backend
```bash
cd backend
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker build -t $BACKEND_REPO_URI:latest .
docker push $BACKEND_REPO_URI:latest
```

### Build and Deploy Frontend
```bash
cd frontend
yarn build

aws s3 sync ./dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "max-age=31536000,public,immutable" \
  --exclude "index.html"

aws s3 cp ./dist/index.html s3://$FRONTEND_BUCKET/index.html \
  --cache-control "no-cache,no-store,must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"
```

## 🔔 Alarms & Alerts

### List Active Alarms
```bash
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --region $AWS_REGION
```

### View SQS Queue Depth
```bash
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages \
  --region $AWS_REGION
```

## 📱 Useful Console Links

```bash
echo "ECS Cluster: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${CLUSTER_NAME}"
echo "ALB: https://console.aws.amazon.com/ec2/home?region=${AWS_REGION}#LoadBalancers:"
echo "RDS: https://console.aws.amazon.com/rds/home?region=${AWS_REGION}#database:id=${DB_INSTANCE_IDENTIFIER}"
echo "CloudFront: https://console.aws.amazon.com/cloudfront/home?#distribution-settings:${CF_DIST_ID}"
echo "CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups"
```

## 🆘 Emergency Procedures

### Scale Down Everything (Cost Saving)
```bash
# Stop backend service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $BACKEND_SERVICE_NAME \
  --desired-count 0 \
  --region $AWS_REGION

# Stop worker service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $WORKER_SERVICE_NAME \
  --desired-count 0 \
  --region $AWS_REGION

# Stop RDS (takes 5-10 min)
aws rds stop-db-instance \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION
```

### Scale Up Everything
```bash
# Start RDS
aws rds start-db-instance \
  --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
  --region $AWS_REGION

# Start backend service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $BACKEND_SERVICE_NAME \
  --desired-count 2 \
  --region $AWS_REGION

# Start worker service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $WORKER_SERVICE_NAME \
  --desired-count 1 \
  --region $AWS_REGION
```

---

**Tip:** Keep this file handy for daily operations!

**Full Guide:** See `INFRASTRUCTURE-CICD-GUIDE.md` for detailed explanations
