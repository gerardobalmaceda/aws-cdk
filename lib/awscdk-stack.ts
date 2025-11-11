import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class IaasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });
    const sg = new ec2.SecurityGroup(this, 'MySecurityGroup', {
      vpc,
      description: 'Permitir acceso SSH',
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Permitir SSH');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Permitir HTTP');
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      'echo "=== Inicio de UserData Script ==="',
      '',
      '# Actualizar sistema',
      'dnf update -y || echo "Update failed, continuing..."',
      '',
      '# Instalar Apache',
      'echo "Instalando Apache HTTP Server..."',
      'dnf install -y httpd',
      '',
      '# Habilitar e iniciar Apache',
      'echo "Iniciando Apache..."',
      'systemctl enable httpd',
      'systemctl start httpd',
      '',
      '# Verificar estado',
      'systemctl status httpd --no-pager',
      '',
      'echo "=== UserData Script Completado ==="'
    );

    const instance = new ec2.Instance(this, 'MyInstanceApache', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
      userData,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      associatePublicIpAddress: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
      description: 'IP pública de la instancia EC2',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `http://${instance.instancePublicIp}`,
      description: 'URL del servidor web Apache',
    });
  }
}

const app = new cdk.App();
new IaasStack(app, 'IaasStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
