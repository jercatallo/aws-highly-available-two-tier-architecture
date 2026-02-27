import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface SecurityGroupsConstructProps {
  vpc: ec2.Vpc;
  allowHttpFrom: string;
  httpPort: number;
  httpsPort: number;
  dbPort: number;
  albAllowAllOutbound?: boolean;
  asgAllowAllOutbound?: boolean;
  dbAllowAllOutbound?: boolean;
  allowPackageDownloads?: boolean;
  albSecurityGroupName?: string;
  asgSecurityGroupName?: string;
  databaseSecurityGroupName?: string;
}

/**
 * Security Groups Construct with Least Privilege Access
 * 
 * Creates security groups for ALB, ASG, and database with proper isolation
 * 
 * Security Groups are stateful firewalls at the instance level.
 * Traffic flow: Internet -> ALB -> ASG (Web/App) -> Database
 * 
 * ALB Security Group: Allows HTTP from internet, outbound only to ASG
 * ASG Security Group: Allows HTTP from ALB only, outbound to DB and internet
 * Database Security Group: Allows MySQL from ASG only, no outbound
 */
export class SecurityGroupsConstruct extends Construct {
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly asgSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupsConstructProps) {
    super(scope, id);

    // ALB Security Group - Internet-facing
    this.albSecurityGroup = new ec2.SecurityGroup(this, props.albSecurityGroupName || 'AlbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: props.albAllowAllOutbound ?? false, // Restrict outbound - will add specific rules
    });

    this.albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.allowHttpFrom),
      ec2.Port.tcp(props.httpPort),
      'Allow HTTP traffic from internet'
    );

    // ASG Security Group - For web/app instances
    this.asgSecurityGroup = new ec2.SecurityGroup(this, props.asgSecurityGroupName || 'AsgSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Auto Scaling Group instances',
      allowAllOutbound: props.asgAllowAllOutbound ?? false, // Restrict outbound - will add specific rules
    });

    // SECURITY BEST PRACTICE: ASG only accepts traffic from ALB
    this.asgSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(props.httpPort),
      'Allow HTTP traffic from ALB only'
    );

    // ALB can send traffic to ASG
    this.albSecurityGroup.addEgressRule(
      this.asgSecurityGroup,
      ec2.Port.tcp(props.httpPort),
      'Allow outbound to ASG instances'
    );

    // Database Security Group
    this.dbSecurityGroup = new ec2.SecurityGroup(this, props.databaseSecurityGroupName || 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: props.dbAllowAllOutbound ?? false, // Database should not initiate outbound connections
    });

    // SECURITY BEST PRACTICE: Database only accepts traffic from ASG instances
    this.dbSecurityGroup.addIngressRule(
      this.asgSecurityGroup,
      ec2.Port.tcp(props.dbPort),
      'Allow MySQL/MariaDB traffic from ASG instances only'
    );

    // ASG can connect to database
    this.asgSecurityGroup.addEgressRule(
      this.dbSecurityGroup,
      ec2.Port.tcp(props.dbPort),
      'Allow outbound to database'
    );

    // ASG needs internet access for updates (via NAT Gateway)
    if (props.allowPackageDownloads ?? true) {
      this.asgSecurityGroup.addEgressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(props.httpPort),
        'Allow HTTP for package downloads'
      );

      this.asgSecurityGroup.addEgressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(props.httpsPort),
        'Allow HTTPS for package downloads'
      );
    }
  }
}
