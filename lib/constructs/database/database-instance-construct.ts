import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface RdsConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  engine: string;
  engineVersion: string;
  instanceClass: ec2.InstanceClass;
  instanceSize: ec2.InstanceSize;
  allocatedStorage: number;
  maxAllocatedStorage: number;
  multiAz: boolean;
  databaseName: string;
  backupRetention: number;
  preferredBackupWindow: string;
  preferredMaintenanceWindow: string;
  deletionProtection: boolean;
  removalPolicy: RemovalPolicy;
  storageEncrypted?: boolean;
  autoMinorVersionUpgrade?: boolean;
  credentialsUsername?: string;
  credentialsPasswordLength?: number;
  credentialsExcludePunctuation?: boolean;
  credentialsIncludeSpace?: boolean;
  cloudWatchLogsExports?: string[];
  cloudWatchLogsRetention?: number;
  resourceName?: string;
  subnetGroupName?: string;
  credentialsSecretName?: string;
}

/**
 * RDS Database Construct with Multi-AZ Support
 * 
 * Creates a fully managed RDS database with:
 * - Multi-AZ deployment for high availability
 * - Automated backups and snapshots
 * - Automatic failover
 * - Encrypted storage and connections
 * - Secure credential management via Secrets Manager
 * 
 * This replaces the previous EC2-based database approach with a managed service
 * that provides better reliability, automatic patching, and operational excellence.
 */
export class RdsConstruct extends Construct {
  public readonly database: rds.DatabaseInstance;
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: RdsConstructProps) {
    super(scope, id);

    // Create database credentials in Secrets Manager
    this.secret = new secretsmanager.Secret(this, props.credentialsSecretName || 'DatabaseCredentials', {
      secretName: props.credentialsSecretName ? `${props.credentialsSecretName}-db-credentials` : `${id}-db-credentials`,
      description: 'RDS database master credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: props.credentialsUsername || 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: props.credentialsExcludePunctuation ?? true,
        includeSpace: props.credentialsIncludeSpace ?? false,
        passwordLength: props.credentialsPasswordLength || 32,
      },
    });

    // Create database subnet group in isolated subnets (no internet access needed)
    const subnetGroup = new rds.SubnetGroup(this, props.subnetGroupName || 'DatabaseSubnetGroup', {
      vpc: props.vpc,
      description: 'Subnet group for RDS database',
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Determine engine based on configuration with proper error handling
    let engine: rds.IInstanceEngine;
    const engineLower = props.engine.toLowerCase();
    
    switch (engineLower) {
      case 'mariadb':
        engine = rds.DatabaseInstanceEngine.mariaDb({
          version: rds.MariaDbEngineVersion.of(props.engineVersion, props.engineVersion),
        });
        break;
      case 'mysql':
        engine = rds.DatabaseInstanceEngine.mysql({
          version: rds.MysqlEngineVersion.of(props.engineVersion, props.engineVersion),
        });
        break;
      case 'postgres':
      case 'postgresql':
        engine = rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.of(props.engineVersion, props.engineVersion),
        });
        break;
      default:
        throw new Error(
          `Unsupported database engine: ${props.engine}. Supported engines: mariadb, mysql, postgres`
        );
    }

    // Determine appropriate removal policy based on environment
    // For dev/test: DESTROY (no snapshot, faster cleanup)
    // For prod: Use configured policy (typically SNAPSHOT for safety)
    const effectiveRemovalPolicy = !props.deletionProtection && props.removalPolicy === RemovalPolicy.SNAPSHOT
      ? RemovalPolicy.DESTROY  // Dev environment: quick cleanup without snapshot
      : props.removalPolicy;     // Production: keep configured policy

    // Map CloudWatch logs retention days to enum
    const retentionDays = this.getRetentionDays(props.cloudWatchLogsRetention || 7);

    // Create RDS instance in isolated subnets
    this.database = new rds.DatabaseInstance(this, props.resourceName || 'Database', {
      engine,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: ec2.InstanceType.of(props.instanceClass, props.instanceSize),
      securityGroups: [props.securityGroup],
      subnetGroup,
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: props.databaseName,
      allocatedStorage: props.allocatedStorage,
      maxAllocatedStorage: props.maxAllocatedStorage,
      storageEncrypted: props.storageEncrypted ?? true,
      multiAz: props.multiAz,
      autoMinorVersionUpgrade: props.autoMinorVersionUpgrade ?? true,
      backupRetention: Duration.days(props.backupRetention),
      preferredBackupWindow: props.preferredBackupWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      deletionProtection: props.deletionProtection,
      removalPolicy: effectiveRemovalPolicy,
      cloudwatchLogsExports: props.cloudWatchLogsExports || ['error', 'general', 'slowquery'],
      cloudwatchLogsRetention: retentionDays,
    });
  }

  /**
   * Convert number of days to CloudWatch RetentionDays enum
   */
  private getRetentionDays(days: number): logs.RetentionDays {
    const retentionMap: { [key: number]: logs.RetentionDays } = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      5: logs.RetentionDays.FIVE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      120: logs.RetentionDays.FOUR_MONTHS,
      150: logs.RetentionDays.FIVE_MONTHS,
      180: logs.RetentionDays.SIX_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
      400: logs.RetentionDays.THIRTEEN_MONTHS,
      545: logs.RetentionDays.EIGHTEEN_MONTHS,
      731: logs.RetentionDays.TWO_YEARS,
      1827: logs.RetentionDays.FIVE_YEARS,
      3653: logs.RetentionDays.TEN_YEARS,
    };

    // Return exact match or closest lower value
    if (retentionMap[days]) {
      return retentionMap[days];
    }

    // Find closest lower retention period
    const sortedDays = Object.keys(retentionMap).map(Number).sort((a, b) => a - b);
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (sortedDays[i] <= days) {
        return retentionMap[sortedDays[i]];
      }
    }

    // Default to ONE_WEEK if no match found
    return logs.RetentionDays.ONE_WEEK;
  }
}
