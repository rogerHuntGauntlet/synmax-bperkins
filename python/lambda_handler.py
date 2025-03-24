import json
import os
import boto3
import uuid
import logging
from datetime import datetime, timedelta
import traceback

# Import the SAR processing module
from micro_motion_estimator import MicroMotionEstimator

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(os.environ.get('JOBS_TABLE', 'ShipMMJobs'))

def handler(event, context):
    """
    Lambda handler for SAR processing
    
    Parameters:
        event (dict): Event data from AWS Lambda
        context (LambdaContext): Runtime information
        
    Returns:
        dict: Response with job ID and status
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Get bucket and key from event
        record = event.get('Records', [{}])[0]
        bucket_name = record.get('s3', {}).get('bucket', {}).get('name')
        object_key = record.get('s3', {}).get('object', {}).get('key')
        
        # If direct invocation (not S3 event)
        if not bucket_name or not object_key:
            bucket_name = event.get('bucket')
            object_key = event.get('key')
            job_id = event.get('jobId', job_id)
        
        if not bucket_name or not object_key:
            raise ValueError("Missing bucket name or object key")
        
        # Update job status to 'PROCESSING'
        update_job_status(job_id, 'PROCESSING')
        
        # Download the input file
        local_input_file = f"/tmp/{os.path.basename(object_key)}"
        s3_client.download_file(bucket_name, object_key, local_input_file)
        
        # Process the SAR data
        results_bucket = os.environ.get('RESULTS_BUCKET', 'ship-mm-results')
        output_key = f"results/{job_id}/results.json"
        local_output_file = f"/tmp/results_{job_id}.json"
        
        # Initialize and run the micro-motion estimator
        estimator = MicroMotionEstimator(local_input_file)
        results = estimator.process()
        
        # Save results to local file
        with open(local_output_file, 'w') as f:
            json.dump(results, f)
        
        # Upload results to S3
        s3_client.upload_file(local_output_file, results_bucket, output_key)
        
        # Generate visualization outputs
        visualization_keys = generate_visualizations(estimator, job_id, results_bucket)
        
        # Update job status to 'COMPLETED'
        update_job_status(job_id, 'COMPLETED', {
            'resultsKey': output_key,
            'visualizations': visualization_keys
        })
        
        # Clean up temporary files
        os.remove(local_input_file)
        os.remove(local_output_file)
        
        return {
            'statusCode': 200,
            'jobId': job_id,
            'status': 'COMPLETED',
            'resultsKey': output_key,
            'visualizations': visualization_keys
        }
        
    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        logger.error(f"Error processing SAR data: {error_message}\n{stack_trace}")
        
        # Update job status to 'FAILED'
        if job_id:
            update_job_status(job_id, 'FAILED', {
                'error': error_message
            })
        
        return {
            'statusCode': 500,
            'jobId': job_id if job_id else 'unknown',
            'status': 'FAILED',
            'error': error_message
        }

def update_job_status(job_id, status, metadata=None):
    """
    Update the job status in DynamoDB
    
    Parameters:
        job_id (str): Job ID
        status (str): Job status
        metadata (dict): Additional metadata
    """
    try:
        item = {
            'jobId': job_id,
            'status': status,
            'updatedAt': datetime.utcnow().isoformat(),
            'expiresAt': int((datetime.utcnow() + timedelta(days=7)).timestamp())
        }
        
        if metadata:
            item.update(metadata)
        
        jobs_table.put_item(Item=item)
        logger.info(f"Updated job status: {job_id} -> {status}")
    except Exception as e:
        logger.error(f"Failed to update job status: {str(e)}")

def generate_visualizations(estimator, job_id, results_bucket):
    """
    Generate visualization files and upload them to S3
    
    Parameters:
        estimator (MicroMotionEstimator): Instance of the estimator
        job_id (str): Job ID
        results_bucket (str): S3 bucket for results
        
    Returns:
        dict: Keys of visualization files
    """
    visualization_keys = {}
    
    try:
        # Generate displacement field plot
        displacement_file = f"/tmp/displacement_{job_id}.png"
        estimator.plot_displacement_field(displacement_file)
        displacement_key = f"results/{job_id}/displacement.png"
        s3_client.upload_file(displacement_file, results_bucket, displacement_key)
        visualization_keys['displacement'] = displacement_key
        os.remove(displacement_file)
        
        # Generate frequency mode visualization
        frequency_file = f"/tmp/frequency_{job_id}.png"
        estimator.plot_frequency_modes(frequency_file)
        frequency_key = f"results/{job_id}/frequency.png"
        s3_client.upload_file(frequency_file, results_bucket, frequency_key)
        visualization_keys['frequency'] = frequency_key
        os.remove(frequency_file)
        
    except Exception as e:
        logger.error(f"Error generating visualizations: {str(e)}")
    
    return visualization_keys 