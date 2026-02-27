#!/usr/bin/env node
import 'source-map-support/register';
import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { HighlyAvailableStack } from '../lib/stack';
import { StackConfig } from '../config/stack-config';

// Load environment variables from .env file
dotenv.config();

const app = new cdk.App();

// Get environment from context or environment variable
const environment = app.node.tryGetContext('environment') || StackConfig.environment.name;

console.log(`Deploying stack: ${StackConfig.stackName}`);
console.log(`Environment: ${environment}`);
console.log(`Region: ${StackConfig.environment.region}`);

// Create stack with configured stack name
new HighlyAvailableStack(app, StackConfig.stackName, {
  description: `Highly Available 2-Tier Architecture - ${environment} environment with Multi-AZ`,
  env: {
    account: StackConfig.environment.account,
    region: StackConfig.environment.region,
  },
  tags: {
    ...StackConfig.tags,
    Environment: environment,
  },
});
