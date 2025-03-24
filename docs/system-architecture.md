# Ship Micro-Motion Analysis System
## System Architecture Design

### 1. Architecture Overview

![System Architecture Diagram](https://via.placeholder.com/800x400?text=System+Architecture+Diagram)

The system employs a hybrid architecture with:
- **Frontend**: Next.js web application hosted on Vercel
- **Backend Processing**: AWS Lambda for compute-intensive operations
- **Storage**: AWS S3 for raw uploads and processed results
- **Database**: DynamoDB for tracking processing jobs and user sessions

### 2. Component Breakdown

#### 2.1 Frontend (Vercel)
- **Next.js Web App**: User interface and client-side logic
- **API Routes**: Gateway to AWS services
- **Authentication**: Optional user authentication for saved analyses

#### 2.2 AWS Cloud Components
- **S3**: Object storage for uploads and results
- **Lambda**: Serverless compute for SAR processing
- **DynamoDB**: Metadata and job tracking
- **CloudFront**: CDN for fast image delivery
- **API Gateway**: RESTful API for processing jobs

#### 2.3 Processing Pipeline
1. User uploads file to presigned S3 URL
2. Frontend initiates processing job
3. Lambda function processes SAR data
4. Results saved to S3
5. Frontend fetches and displays results

### 3. Data Flow

#### 3.1 Upload Flow
```
User → Frontend → Presigned URL → S3 → Lambda Trigger
```

#### 3.2 Processing Flow
```
Lambda → Download from S3 → Process → Upload results to S3
```

#### 3.3 Results Flow
```
Frontend → Request results → API Gateway → S3 → Display to user
```

### 4. Security Considerations
- HTTPS for all communications
- Presigned URLs for secure file uploads
- IAM roles with principle of least privilege
- Client-side file validation
- Server-side validation of uploaded files
- Regular security audits and updates

### 5. Scalability Design
- Auto-scaling Lambda configurations
- Distributed processing for large files
- Caching strategies for frequently accessed results
- CDN for global delivery of results

### 6. AWS Services Configuration

#### 6.1 S3 Configuration
- Two buckets: `ship-mm-uploads` and `ship-mm-results`
- Lifecycle policies for automatic cleanup
- CORS configuration for frontend access
- Server-side encryption for data at rest

#### 6.2 Lambda Configuration
- Memory: 3008 MB (maximum for intensive processing)
- Timeout: 15 minutes
- Runtime: Python 3.9
- Layers: NumPy, SciPy, OpenCV packaged as Lambda layers
- Concurrency: 100 reserved instances

#### 6.3 DynamoDB Configuration
- Primary key: `jobId` (UUID)
- GSI: `userId` for user-based queries
- TTL: 30 days for job records
- Provisioned capacity: 5 RCU, 5 WCU (auto-scaling enabled)

### 7. Monitoring and Logging
- CloudWatch Logs for Lambda execution
- CloudWatch Metrics for performance monitoring
- CloudTrail for API activity tracking
- Custom dashboards for system health
- Alerts for processing failures and performance degradation

### 8. Disaster Recovery
- Regular backups of configuration and metadata
- Cross-region replication for critical data
- Automated recovery procedures
- Documented incident response plan 