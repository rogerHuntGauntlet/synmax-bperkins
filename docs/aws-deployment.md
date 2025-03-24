# Ship Micro-Motion Analysis System
## AWS Deployment Guide

This guide provides detailed instructions for deploying the backend processing components of the Ship Micro-Motion Analysis System to AWS.

### 1. Prerequisites

Before beginning the deployment, ensure you have:

- AWS Account with administrator access
- AWS CLI configured locally with appropriate credentials
- Node.js 18+ installed for the frontend development
- Python 3.9+ installed for the Lambda function development
- Git repository with application code
- Vercel account (for frontend deployment)

### 2. AWS Resources Setup

#### 2.1 Create S3 Buckets

We need two S3 buckets: one for storing uploaded SAR images and another for storing processing results.

```bash
# Create upload bucket
aws s3api create-bucket \
    --bucket ship-mm-uploads \
    --region us-east-1

# Create results bucket
aws s3api create-bucket \
    --bucket ship-mm-results \
    --region us-east-1

# Enable versioning on both buckets (optional, but recommended)
aws s3api put-bucket-versioning \
    --bucket ship-mm-uploads \
    --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
    --bucket ship-mm-results \
    --versioning-configuration Status=Enabled
```

#### 2.2 Set Up CORS for S3 Buckets

Create a file named `cors-config.json` with the following content:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

Apply the CORS configuration:

```bash
# Apply CORS to upload bucket
aws s3api put-bucket-cors \
    --bucket ship-mm-uploads \
    --cors-configuration file://cors-config.json

# Apply CORS to results bucket
aws s3api put-bucket-cors \
    --bucket ship-mm-results \
    --cors-configuration file://cors-config.json
```

#### 2.3 Create DynamoDB Table

Create a DynamoDB table to track processing jobs:

```bash
aws dynamodb create-table \
    --table-name ShipMMJobs \
    --attribute-definitions AttributeName=jobId,AttributeType=S \
    --key-schema AttributeName=jobId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

#### 2.4 Create IAM Role for Lambda

Create a file named `trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the IAM role:

```bash
# Create the role
aws iam create-role \
    --role-name ShipMMLambdaRole \
    --assume-role-policy-document file://trust-policy.json

# Attach necessary policies
aws iam attach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 3. Lambda Function Deployment

#### 3.1 Prepare Lambda Function Code

Set up the Python processing code and dependencies:

```bash
# Create a directory for the Lambda package
mkdir -p lambda-package

# Copy the Python code
cp python/micro_motion_estimator.py lambda-package/
cp python/lambda_function.py lambda-package/

# Install dependencies to the package
pip install -r python/requirements.txt -t lambda-package/
```

The `lambda_function.py` should contain the Lambda handler that processes the SAR image:

```python
import json
import boto3
import os
import traceback
from micro_motion_estimator import MicroMotionEstimator

# Initialize AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('JOBS_TABLE', 'ShipMMJobs'))

def lambda_handler(event, context):
    """
    Lambda function handler to process SAR images.
    
    Parameters:
    event (dict): The event triggered by S3 or API Gateway
    context (object): AWS Lambda context
    
    Returns:
    dict: Response containing processing status and results
    """
    try:
        # Extract information from the event
        if 'Records' in event:
            # Triggered by S3 event
            record = event['Records'][0]
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            job_id = key.split('-')[0]
        else:
            # Triggered by API
            bucket = event.get('bucket', os.environ.get('UPLOAD_BUCKET'))
            key = event.get('key')
            job_id = event.get('jobId')
        
        if not key:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No file key provided'})
            }
        
        # Update job status
        update_job_status(job_id, 'PROCESSING')
        
        # Download the file
        local_file = f"/tmp/{os.path.basename(key)}"
        s3.download_file(bucket, key, local_file)
        
        # Process the file
        estimator = MicroMotionEstimator()
        results = estimator.process_image(local_file)
        
        # Save results to S3
        result_key = f"results/{job_id}-result.json"
        s3.put_object(
            Bucket=os.environ.get('RESULT_BUCKET', 'ship-mm-results'),
            Key=result_key,
            Body=json.dumps(results),
            ContentType='application/json'
        )
        
        # Save visualization figures if generated
        figure_dir = f"{os.path.splitext(local_file)[0]}_figures"
        if os.path.exists(figure_dir):
            for figure_file in os.listdir(figure_dir):
                figure_path = os.path.join(figure_dir, figure_file)
                figure_key = f"results/{job_id}-figures/{figure_file}"
                s3.upload_file(
                    figure_path,
                    os.environ.get('RESULT_BUCKET', 'ship-mm-results'),
                    figure_key
                )
        
        # Update job status to complete
        update_job_status(job_id, 'COMPLETED', {
            'resultKey': result_key,
            'numShipsDetected': len(results.get('ships', []))
        })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'jobId': job_id,
                'resultKey': result_key,
                'numShipsDetected': len(results.get('ships', []))
            })
        }
    
    except Exception as e:
        traceback.print_exc()
        
        # Update job status to failed
        if job_id:
            update_job_status(job_id, 'FAILED', {
                'error': str(e)
            })
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }

def update_job_status(job_id, status, metadata=None):
    """Update job status in DynamoDB"""
    update_expression = "SET #status = :status, updatedAt = :updatedAt"
    expression_values = {
        ':status': status,
        ':updatedAt': int(time.time())
    }
    
    if metadata:
        for key, value in metadata.items():
            update_expression += f", #{key} = :{key}"
            expression_values[f":{key}"] = value
    
    try:
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames={
                '#status': 'status',
                **{f"#{k}": k for k in (metadata or {}).keys()}
            }
        )
    except Exception as e:
        print(f"Error updating job status: {e}")
```

#### 3.2 Create Lambda Package

```bash
# Navigate to the Lambda package directory
cd lambda-package

# Create a ZIP file
zip -r ../ship-mm-processor.zip .

# Navigate back to the project root
cd ..
```

#### 3.3 Deploy Lambda Function

```bash
# Get the IAM role ARN
ROLE_ARN=$(aws iam get-role --role-name ShipMMLambdaRole --query 'Role.Arn' --output text)

# Create the Lambda function
aws lambda create-function \
    --function-name ship-mm-processor \
    --runtime python3.9 \
    --handler lambda_function.lambda_handler \
    --memory-size 3008 \
    --timeout 900 \
    --role $ROLE_ARN \
    --zip-file fileb://ship-mm-processor.zip \
    --environment "Variables={UPLOAD_BUCKET=ship-mm-uploads,RESULT_BUCKET=ship-mm-results,JOBS_TABLE=ShipMMJobs}" \
    --region us-east-1
```

#### 3.4 Configure S3 Event Trigger (Optional)

If you want to trigger the Lambda function automatically when a file is uploaded:

```bash
# Get the Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function --function-name ship-mm-processor --query 'Configuration.FunctionArn' --output text)

# Add permission for S3 to invoke Lambda
aws lambda add-permission \
    --function-name ship-mm-processor \
    --statement-id s3-trigger \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn arn:aws:s3:::ship-mm-uploads \
    --source-account $(aws sts get-caller-identity --query 'Account' --output text)

# Create notification configuration JSON
cat > notification-config.json << EOL
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "$LAMBDA_ARN",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".tif"
            }
          ]
        }
      }
    },
    {
      "LambdaFunctionArn": "$LAMBDA_ARN",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".h5"
            }
          ]
        }
      }
    },
    {
      "LambdaFunctionArn": "$LAMBDA_ARN",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".cphd"
            }
          ]
        }
      }
    }
  ]
}
EOL

# Apply the notification configuration
aws s3api put-bucket-notification-configuration \
    --bucket ship-mm-uploads \
    --notification-configuration file://notification-config.json
```

### 4. API Gateway Setup (Optional)

If you prefer to call the Lambda function through an API instead of S3 events:

```bash
# Create API Gateway
aws apigateway create-rest-api \
    --name ShipMM-API \
    --region us-east-1

# Get the API ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='ShipMM-API'].id" --output text)

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path=='/'].id' --output text)

# Create a resource
aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part "process"

# Get the process resource ID
PROCESS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path=='/process'].id' --output text)

# Create POST method
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE

# Set up integration with Lambda
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations

# Deploy the API
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod
```

### 5. Environment Variables Setup

#### 5.1 Lambda Environment Variables

```bash
# Update Lambda environment variables
aws lambda update-function-configuration \
    --function-name ship-mm-processor \
    --environment "Variables={
        UPLOAD_BUCKET=ship-mm-uploads,
        RESULT_BUCKET=ship-mm-results,
        JOBS_TABLE=ShipMMJobs,
        DEBUG=false
    }"
```

#### 5.2 Vercel Environment Variables

In the Vercel dashboard, go to your project settings and add the following environment variables:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: Your AWS region (e.g., `us-east-1`)
- `UPLOAD_BUCKET`: `ship-mm-uploads`
- `RESULT_BUCKET`: `ship-mm-results`
- `LAMBDA_FUNCTION_NAME`: `ship-mm-processor`
- `API_ENDPOINT`: Your API Gateway endpoint (if using API Gateway)

### 6. Testing the Deployment

#### 6.1 Test Lambda Function

Create a test event in JSON format:

```json
{
  "bucket": "ship-mm-uploads",
  "key": "test-image.tif",
  "jobId": "test-job-1"
}
```

Invoke the Lambda function with the test event:

```bash
aws lambda invoke \
    --function-name ship-mm-processor \
    --payload file://test-event.json \
    --cli-binary-format raw-in-base64-out \
    output.json

cat output.json
```

#### 6.2 Test S3 Trigger

Upload a test file to the S3 bucket:

```bash
aws s3 cp test-image.tif s3://ship-mm-uploads/test-job-2-test-image.tif
```

Check the DynamoDB table for job status:

```bash
aws dynamodb get-item \
    --table-name ShipMMJobs \
    --key '{"jobId": {"S": "test-job-2"}}' \
    --region us-east-1
```

### 7. Monitoring and Logging

#### 7.1 View Lambda Logs

```bash
# Get the most recent log stream
LOG_GROUP="/aws/lambda/ship-mm-processor"
LOG_STREAM=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)

# View logs
aws logs get-log-events \
    --log-group-name "$LOG_GROUP" \
    --log-stream-name "$LOG_STREAM"
```

#### 7.2 Set Up CloudWatch Dashboard

Create a CloudWatch dashboard to monitor the system's performance:

```bash
# Create dashboard JSON
cat > dashboard.json << EOL
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", "FunctionName", "ship-mm-processor", { "stat": "Sum" }],
          ["AWS/Lambda", "Errors", "FunctionName", "ship-mm-processor", { "stat": "Sum" }]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Lambda Invocations and Errors",
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "ship-mm-processor", { "stat": "Average" }],
          ["AWS/Lambda", "Duration", "FunctionName", "ship-mm-processor", { "stat": "Maximum" }]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Lambda Duration",
        "period": 300
      }
    }
  ]
}
EOL

# Create dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ShipMM-Dashboard \
    --dashboard-body file://dashboard.json
```

### 8. Cleanup

If you need to remove the resources:

```bash
# Delete Lambda function
aws lambda delete-function --function-name ship-mm-processor

# Delete IAM role
aws iam detach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam detach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam detach-role-policy \
    --role-name ShipMMLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role --role-name ShipMMLambdaRole

# Delete DynamoDB table
aws dynamodb delete-table --table-name ShipMMJobs

# Empty and delete S3 buckets
aws s3 rm s3://ship-mm-uploads --recursive
aws s3 rm s3://ship-mm-results --recursive
aws s3api delete-bucket --bucket ship-mm-uploads
aws s3api delete-bucket --bucket ship-mm-results

# Delete API Gateway (if created)
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete CloudWatch dashboard
aws cloudwatch delete-dashboards --dashboard-names ShipMM-Dashboard
```

### 9. Troubleshooting

#### Common Issues and Solutions

1. **Lambda function times out**
   - Increase the Lambda timeout (up to 15 minutes)
   - Optimize the Python code for better performance
   - Consider breaking processing into smaller chunks

2. **Lambda function runs out of memory**
   - Increase the Lambda memory allocation (up to 10GB)
   - Optimize memory usage in the Python code
   - Process large files in chunks

3. **S3 trigger not working**
   - Check Lambda permissions for S3 invocation
   - Verify notification configuration on the S3 bucket
   - Check Lambda function CloudWatch logs for errors

4. **API Gateway errors**
   - Verify Lambda execution role permissions
   - Check API Gateway configuration and integration
   - Test Lambda function directly to isolate issues

5. **File processing errors**
   - Check Python dependencies in Lambda package
   - Verify file format and compatibility
   - Enable DEBUG mode in Lambda environment variables 