import serverlessExpress from '@codegenie/serverless-express';
import { app } from './app';

// AWS Lambda Handler configurado para API Gateway (REST ou HTTP API)
// Suportado nas regiões us-east-1 e us-west-2 do Hackathon COPPE
export const handler = serverlessExpress({ app });
