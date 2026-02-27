import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { RdsConstruct } from '../../lib/constructs/database/database-instance-construct';
import { RemovalPolicy } from 'aws-cdk-lib';

describe('RDS Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    // Create VPC with isolated subnets for RDS
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', { vpc });
  });

  test('creates RDS database instance', () => {
    const rdsConstruct = new RdsConstruct(stack, 'TestRds', {
      vpc,
      securityGroup,
      engine: 'mariadb',
      engineVersion: '10.11',
      instanceClass: ec2.InstanceClass.T3,
      instanceSize: ec2.InstanceSize.MICRO,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      multiAz: true,
      databaseName: 'testdb',
      backupRetention: 7,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
    expect(rdsConstruct.database).toBeDefined();
    expect(rdsConstruct.secret).toBeDefined();
  });

  test('creates multi-AZ database', () => {
    new RdsConstruct(stack, 'TestRds', {
      vpc,
      securityGroup,
      engine: 'mariadb',
      engineVersion: '10.11',
      instanceClass: ec2.InstanceClass.T3,
      instanceSize: ec2.InstanceSize.MICRO,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      multiAz: true,
      databaseName: 'testdb',
      backupRetention: 7,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: true,
      StorageEncrypted: true,
    });
  });

  test('creates database credentials secret', () => {
    new RdsConstruct(stack, 'TestRds', {
      vpc,
      securityGroup,
      engine: 'mariadb',
      engineVersion: '10.11',
      instanceClass: ec2.InstanceClass.T3,
      instanceSize: ec2.InstanceSize.MICRO,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      multiAz: true,
      databaseName: 'testdb',
      backupRetention: 7,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });
});
