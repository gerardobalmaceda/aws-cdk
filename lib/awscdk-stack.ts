import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class IaasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 2 });

    const sg = new ec2.SecurityGroup(this, "MySecurityGroup", {
      vpc,
      description: "Permitir acceso SSH",
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), "Permitir SSH");

    const instance = new ec2.Instance(this, "MyInstance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
    });

    new cdk.CfnOutput(this, "InstancePublicIP", {
      value: instance.instancePublicIp,
      description: "IP pública de la instancia EC2",
    });
  }
}

const app = new cdk.App();
new IaasStack(app, "IaasDemoStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
