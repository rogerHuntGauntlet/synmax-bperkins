# Ship Micro-Motion Analysis System
## Documentation Index

This directory contains comprehensive documentation for the Ship Micro-Motion Analysis System, a web application that processes Synthetic Aperture Radar (SAR) imagery to detect and analyze micro-motions of ships.

### Documentation Contents

1. [**Product Requirements Document (PRD)**](product-requirements.md)
   - Defines the purpose and features of the system
   - Outlines user needs and requirements
   - Sets success metrics and future enhancements

2. [**System Architecture Design**](system-architecture.md)
   - Describes the overall system architecture
   - Details the components and their interactions
   - Explains data flow and security considerations

3. [**Design System & UI Theme**](design-system.md)
   - Defines brand identity and color palette
   - Specifies UI components and typography
   - Provides responsive design guidelines and accessibility standards

4. [**Development Implementation Checklist**](dev-checklist.md)
   - Provides a step-by-step checklist for implementation
   - Covers frontend, backend, and integration tasks
   - Includes testing and deployment preparation steps

5. [**AWS Deployment Guide**](aws-deployment.md)
   - Details the AWS infrastructure setup
   - Provides instructions for Lambda deployment
   - Includes monitoring, testing, and troubleshooting guidance

### Deployment Architecture

This project uses a hybrid architecture:
- **Frontend**: Next.js web application hosted on Vercel
- **Backend Processing**: AWS Lambda for compute-intensive operations
- **Storage**: AWS S3 for raw uploads and processed results
- **Database**: DynamoDB for tracking processing jobs and user sessions

### Getting Started

To get started with the project:

1. Review the [Product Requirements Document](product-requirements.md) to understand the project goals
2. Familiarize yourself with the [System Architecture](system-architecture.md)
3. Follow the [Development Implementation Checklist](dev-checklist.md) for a structured approach
4. Use the [Design System](design-system.md) for consistent UI development
5. Deploy using the [AWS Deployment Guide](aws-deployment.md)

### Additional Resources

- Original Research Paper: "Micro-Motion Estimation of Maritime Targets Using Pixel Tracking in Cosmo-Skymed Synthetic Aperture Radar Data—An Operative Assessment"
- SAR Data Source: [Umbra Open Data Catalog](https://umbra.space/open-data/)
- Python Processing Algorithm: Located in the `/python` directory of this repository 