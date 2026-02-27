import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TypeScript interfaces for type-safe configuration
 */
export interface StackConfiguration {
  stackName: string;
  environment: {
    name: string;
    region: string;
  };
  tags: {
    [key: string]: string;
  };
  resourceNames: {
    vpc: string;
    albSecurityGroup: string;
    asgSecurityGroup: string;
    databaseSecurityGroup: string;
    publicNetworkAcl: string;
    privateNetworkAcl: string;
    applicationLoadBalancer: string;
    targetGroup: string;
    httpListener: string;
    autoScalingGroup: string;
    launchTemplate: string;
    cpuScalingPolicy: string;
    database: string;
    databaseSubnetGroup: string;
    databaseCredentials: string;
    vpcFlowLogsGroup: string;
    vpcFlowLog: string;
  };
  network: {
    vpc: {
      cidr: string;
      maxAzs: number;
      natGatewaysCount: number;
      subnetCidrMask: number;
      enableFlowLogs: boolean;
      flowLogsRetentionDays: number;
      subnets: {
        publicSubnetName: string;
        privateSubnetName: string;
      };
      flowLogs: {
        trafficType: string;
        logGroupRemovalPolicy: string;
      };
    };
    security: {
      allowHttpFrom: string;
      httpPort: number;
      httpsPort: number;
      dbPort: number;
      albAllowAllOutbound: boolean;
      asgAllowAllOutbound: boolean;
      dbAllowAllOutbound: boolean;
      allowPackageDownloads: boolean;
    };
    networkAcls: {
      enabled: boolean;
      rules: {
        httpInboundRuleNumber: number;
        enableHttpInbound: boolean;
        httpsInboundRuleNumber: number;
        enableHttpsInbound: boolean;
        ephemeralInboundRuleNumber: number;
        enableEphemeralInbound: boolean;
        allOutboundRuleNumber: number;
        enableAllOutbound: boolean;
        privateHttpRuleNumber: number;
        enablePrivateHttpInbound: boolean;
        privateDatabaseRuleNumber: number;
        enablePrivateDatabaseInbound: boolean;
        privateEphemeralRuleNumber: number;
        enablePrivateEphemeralInbound: boolean;
        enablePrivateAllOutbound: boolean;
      };
      ephemeralPorts: {
        start: number;
        end: number;
      };
    };
  };
  compute: {
    alb: {
      internetFacing: boolean;
      deletionProtection: boolean;
      idleTimeout: number;
      http2Enabled: boolean;
      deregistrationDelay: number;
      targetGroupPort: number;
      targetGroupProtocol: string;
      targetType: string;
      listenerPort: number;
      listenerProtocol: string;
      healthCheck: {
        enabled: boolean;
        path: string;
        protocol: string;
        interval: number;
        timeout: number;
        healthyThresholdCount: number;
        unhealthyThresholdCount: number;
        port: string;
      };
    };
    asg: {
      minCapacity: number;
      maxCapacity: number;
      desiredCapacity: number;
      instanceClass: string;
      instanceSize: string;
      machineImageType: string;
      healthCheckType: string;
      healthCheckGracePeriod: number;
      cooldown: number;
      targetCpuUtilization: number;
      requireImdsv2: boolean;
      subnetType: string;
      scaleInCooldown: number;
      scaleOutCooldown: number;
    };
    storage: {
      volumeSize: number;
      volumeType: string;
      iops: number;
      encrypted: boolean;
      deleteOnTermination: boolean;
      deviceName: string;
    };
  };
  monitoring: {
    enableDetailedMonitoring: boolean;
    metricCollectionGranularity: string;
    cloudWatchLogsRetention: number;
  };
  outputs: {
    exportPrefix: string;
    enabled: {
      vpcId: boolean;
      vpcCidr: boolean;
      loadBalancerDns: boolean;
      loadBalancerArn: boolean;
      applicationUrl: boolean;
      autoScalingGroupName: boolean;
      autoScalingGroupArn: boolean;
      databaseEndpoint: boolean;
      databasePort: boolean;
      databaseSecretArn: boolean;
    };
  };
  database: {
    engine: string;
    engineVersion: string;
    instanceClass: string;
    instanceSize: string;
    allocatedStorage: number;
    maxAllocatedStorage: number;
    multiAz: boolean;
    port: number;
    databaseName: string;
    backupRetention: number;
    preferredBackupWindow: string;
    preferredMaintenanceWindow: string;
    deletionProtection: boolean;
    removalPolicy: string;
    storageEncrypted: boolean;
    autoMinorVersionUpgrade: boolean;
    credentials: {
      username: string;
      passwordLength: number;
      excludePunctuation: boolean;
      includeSpace: boolean;
    };
    cloudWatchLogs: {
      exports: string[];
      retention: number;
    };
  };
}

/**
 * Processed configuration with CDK-specific types
 */
export interface ProcessedStackConfig extends Omit<StackConfiguration, 'compute' | 'database'> {
  environment: StackConfiguration['environment'] & {
    isProd: boolean;
    account: string | undefined;
  };
  compute: {
    alb: StackConfiguration['compute']['alb'];
    asg: Omit<StackConfiguration['compute']['asg'], 'instanceClass' | 'instanceSize' | 'machineImageType'> & {
      instanceClass: ec2.InstanceClass;
      instanceSize: ec2.InstanceSize;
      machineImage: ec2.IMachineImage;
    };
    storage: Omit<StackConfiguration['compute']['storage'], 'volumeType'> & {
      volumeType: ec2.EbsDeviceVolumeType;
    };
  };
  database: Omit<StackConfiguration['database'], 'instanceClass' | 'instanceSize' | 'removalPolicy'> & {
    instanceClass: ec2.InstanceClass;
    instanceSize: ec2.InstanceSize;
    removalPolicy: RemovalPolicy;
  };
}

/**
 * Load configuration from JSON file based on environment
 */
function loadConfiguration(): StackConfiguration {
  const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'dev';
  
  let configFileName: string;
  
  if (environment === 'production' || environment === 'prod') {
    configFileName = 'production.json';
  } else if (environment === 'staging' || environment === 'stag') {
    configFileName = 'staging.json';
  } else {
    configFileName = 'development.json';
  }
  
  const configPath = path.join(__dirname, configFileName);
  
  console.log(`Loading configuration from: ${configPath}`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}. Please ensure ${configFileName} exists in config/`);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: StackConfiguration = JSON.parse(configContent);
  
  return config;
}

/**
 * Convert JSON configuration strings to CDK types
 */
function processConfiguration(config: StackConfiguration): ProcessedStackConfig {
  const isProd = config.environment.name === 'production' || config.environment.name === 'prod' || config.environment.name === 'staging';
  
  return {
    ...config,
    environment: {
      ...config.environment,
      isProd,
      account: process.env.CDK_DEFAULT_ACCOUNT,
    },
    compute: {
      alb: config.compute.alb,
      asg: {
        ...config.compute.asg,
        instanceClass: ec2.InstanceClass[config.compute.asg.instanceClass as keyof typeof ec2.InstanceClass],
        instanceSize: ec2.InstanceSize[config.compute.asg.instanceSize as keyof typeof ec2.InstanceSize],
        machineImage: config.compute.asg.machineImageType === 'AMAZON_LINUX_2023'
          ? ec2.MachineImage.latestAmazonLinux2023()
          : ec2.MachineImage.latestAmazonLinux2(),
      },
      storage: {
        ...config.compute.storage,
        volumeType: ec2.EbsDeviceVolumeType[config.compute.storage.volumeType as keyof typeof ec2.EbsDeviceVolumeType],
      },
    },
    database: {
      ...config.database,
      instanceClass: ec2.InstanceClass[config.database.instanceClass as keyof typeof ec2.InstanceClass],
      instanceSize: ec2.InstanceSize[config.database.instanceSize as keyof typeof ec2.InstanceSize],
      removalPolicy: RemovalPolicy[config.database.removalPolicy as keyof typeof RemovalPolicy],
    },
  };
}

/**
 * Export the processed configuration
 * This loads the appropriate JSON file based on ENVIRONMENT variable
 * 
 * Centralized configuration for the entire stack
 * Highly Available 2-Tier Architecture Configuration
 * 
 * Configuration is loaded from JSON files:
 * - development.json for dev/development environments
 * - production.json for prod/production environments
 * 
 * Set the ENVIRONMENT variable to control which configuration is loaded:
 * export ENVIRONMENT=dev        # Loads development.json
 * export ENVIRONMENT=production # Loads production.json
 */
const rawConfig = loadConfiguration();
export const StackConfig = processConfiguration(rawConfig);


